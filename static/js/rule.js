"use strict";

/**!
 * @module rule
 * @file Rules - Smart predictors to determine which elements should be
 * displayed in what behavior.
 * @description Involved lots of human-designed rules. Can be customized to
 * address specific requirements.
 */


/**
 * Check if a string represents a missing value.
 * @function isMissing
 * @param {string} str - string to check
 * @returns {boolean} check result
 */
function isMissing(str) {
  var nulls = ['na', 'n/a', 'nan', 'null', ''];
  try {
    str = str.replace(/^[#-]+/, '');
  } catch (e) {
    throw e.message + ' ' + str;
  }
  return (nulls.indexOf(str.toLowerCase()) !== -1);
}


/**
 * Parse field types.
 * This function in overly long, because it attempts to guess the data type of each field.
 * Options are: number, category, feature, description.
 * @function parseFieldType
 * @param {string} name - field name of the column
 * @param {string[]} arr - cell values of the column
 * @throws {Error} if field name is invalid
 * @returns {[string, string]} field type, updated field name
 */
function parseFieldType(name, arr) {

  // look for pre-defined field type
  var code2type = {
    'n': 'number',
    'c': 'category',
    'f': 'feature',
    'd': 'description'
  };
  var type = '';
  var i = name.indexOf('|');
  if (i > -1) {
    if (i != name.length - 2) {
      throw 'Invalid field name: "' + name + '".'; 
    }
    var code = name.slice(-1);
    if (!(code in code2type)) {
      throw 'Invalid field type code: "' + code + '".';
    }
    type = code2type[code];
    name = name.slice(0, i);
  }

  // description
  if (type === 'description') {
    return ['description', name];
  }

  // check number
  var areNumbers = true;
  for (var i = 0; i < arr.length; i++) {
    if (!isMissing(arr[i]) && isNaN(arr[i])) { // not a number
      areNumbers = false;
      break
    }
  }

  if ((type === 'number') && !areNumbers) {
    throw 'Non-numeric value(s) found in number-type field "' + name + '".'
  }

  // check integer or float
  if (areNumbers && ((type === '') || (type === 'number'))) {
    var areIntegers = true;
    for (var i = 0; i < arr.length; i++) {
      if (!isMissing(arr[i]) && (arr[i].indexOf('.') !== -1)) { // has float point
        areIntegers = false;
        break
      }
    }

    // convert to integers
    if (areIntegers) {
      for (var i = 0; i < arr.length; i++) {
        arr[i] = isMissing(arr[i]) ? null : parseInt(arr[i]);
      }
    }

    // convert to floats
    else {
      for (var i = 0; i < arr.length; i++) {
        arr[i] = isMissing(arr[i]) ? null : parseFloat(arr[i]);
      }
    }
    return ['number', name];
  }

  // check category
  else {
    var areCategories = true;
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i].replace(/\s*,\s*/g, ','); // trim whitespaces
      if (!isMissing(arr[i]) && (arr[i].indexOf(',') !== -1)) { // has comma
        areCategories = false;
        break;
      }
    }

    // check weights
    var areWeightsIntegers = true;
    for (var i = 0; i < arr.length; i++) {
      if (!isMissing(arr[i])) {
        var items = arr[i].split(',');
        for (var j = 0; j < items.length; j++) {
          var a = items[j].split(':');
          if (a.length > 2) {
            throw 'Invalid expression: "' + items[j] + '": multiple colons.'
          } else if (a.length === 2) {
            var weight = a[1];
            if (isNaN(weight)) {
              throw 'Invalid expression: "' + items[j] + '": weight must be a number.';
            } else if (weight.indexOf('.') !== -1) {
              areWeightsIntegers = false;
              break;
            }
          }
        }
      }
    }

    // convert to categories
    if (areCategories || (type == 'category')) {
      for (var i = 0; i < arr.length; i++) {
        if (isMissing(arr[i])) {
          arr[i] = null;
        } else {
          var a = arr[i].split(':');
          if (a.length === 1) {
            arr[i] = [arr[i], null];
          } else {
            arr[i] = [a[0], (areWeightsIntegers ? parseInt(a[1]) : parseFloat(a[1]))];
          }
        }
      }
      return ['category', name];
    }

    // convert to features
    else {
      for (var i = 0; i < arr.length; i++) {
        if (isMissing(arr[i])) {
          arr[i] = {}; // empty object
        } else {
          var items = arr[i].split(',');
          arr[i] = {};
          for (var j = 0; j < items.length; j++) {
            var a = items[j].split(':');
            if (a.length === 1) {
              arr[i][items[j]] = null;
            } else {
              arr[i][a[0]] = (areWeightsIntegers ? parseInt(a[1]) : parseFloat(a[1]));
            }
          }
        }
      }
      return ['feature', name];
    }
  }
}

/**
 * Define display items based on data.
 * @function guessDisplayFields
 * @param {Object} data - data object
 * @param {Object} view - view object
 * @throws {Error} if x and y cannot be determined
 * @returns {[number, number, ?number, ?number, ?number]} field indices for
 * x, y, size, opacity, color
 * @todo Specifically, five display items are to be inferred:
 *    x, y, size, opacity : {idx, factor, scale, min, max}
 * factor is a number to be multiplied.
 * scale can be: null, square, sqrt, cube, cbrt, log, log10, exp, exp10
 * min and max are pre-calculated lower and upper bounds (after scaling).
 *    color : {idx, n, cutoff, palette}
 * n is the top n categories to be colored.
 * Options are: number, category, feature, description.
 */
function guessDisplayFields(data, view) {

  var res = {
    x: null,
    y: null,
    size: null,
    opacity: null,
    color: null
  }

  // first, locate x and y (mandatory)
  var xyCand = [null, null];
  for (var i = 1; i < data.cols.length; i++) {
    if (data.types[i] !== 'number') {
      continue;
    }
    var name = data.cols[i].toLowerCase();
    if (name === 'x') {
      xyCand[0] = i;
    } else if (name === 'y') {
      xyCand[1] = i;
    }
  }

  // be satisfied if both obtained
  if (xyCand[0] !== null && xyCand[1] !== null) {
    res.x = xyCand[0];
    res.y = xyCand[1];

    // add other items
    res.size = view.spcols.len || null;
    res.opacity = view.spcols.cov || null;
    res.color = guessRankColumn(data) || view.spcols.gc || null;
  }

  // otherwise, get gc -> coverage -> length
  else {
    var keys = ['gc', 'cov', 'len'];
    var avails = [];
    for (var i = 1; i < keys.length; i++) {
      var icol = view.spcols[keys[i]];
      if (icol !== null) avails.push(icol);
    }
    if (avails.length >= 2) {
      res.x = avails[0];
      res.y = avails[1];
    }
  }
  return res;
}


/**
 * Guess display scales based on field names.
 * @function guessDisplayScales
 * @param {string[]} items - field names
 * @returns {Object} field name to scale dict
 */
function guessDisplayScales(items) {
  var res = {};
  items.forEach(function(item) {
    switch(item) {
      case 'x':
      case 'y':
      case 'color':
        res[item] = 'none';
        break;
      case 'size':
        res[item] = 'cbrt';
        break;
      case 'opacity':
        res[item] = 'sqrt';
        break;
      default:
        throw 'Error: invalid display item.';
    }
  });
  return res;
}


/**
 * Guess which column represents the "length" property.
 * @function guessLenColumn
 * @param {Object} data - data object
 * @returns {number} - index of "length" column
 */
function guessLenColumn(data) {
  var keys = ['length', 'size', 'len', 'bp'];
  return findColumnByKeys(data, keys, ['number']);
}


/**
 * Guess which column represents the "coverage" property.
 * @function guessCovColumn
 * @param {Object} data - data object
 * @returns {number} - index of "coverage" column
 */
function guessCovColumn(data) {
  var keys = ['coverage', 'cov', 'depth'];
  return findColumnByKeys(data, keys, ['number']);
}


/**
 * Guess which column represents the "gc" property.
 * @function guessGCColumn
 * @param {Object} data - data object
 * @returns {number} - index of "gc" column
 */
function guessGCColumn(data) {
  var keys = ['gc', 'g+c', 'gc%', 'gc-content', 'gc-ratio'];
  return findColumnByKeys(data, keys, ['number']);
}


/**
 * Guess which column represents the highest taxonomic rank.
 * @function guessRankColumn
 * @param {Object} data - data object
 * @returns {number} - index of high rank column
 */
function guessRankColumn(data) {
  // ignore kingdom/domain and species
  var keys = ['phylum', 'class', 'order', 'family', 'genus'];
  return findColumnByKeys(data, keys, ['category']);
}


/**
 * Find column name by keywords
 * @function findColName
 * @param {Object} data - data object
 * @param {string[]} keys - keywords
 * @param {string[]} [types=] - data types
 * @returns {number} - index of result column
 */
function findColumnByKeys(data, keys, types) {

  // get column names
  var cols = getColNames(data, types);

  // find a column name that is identical to one of the "length" strings
  var col = matchWhole(keys, cols);
  if (col) return data.cols.indexOf(col);

  // if fail, find a column name that starts with one of the "length" strings
  col = matchPrefix(keys, cols);
  if (col) return data.cols.indexOf(col);
  else return null;
}


/**
 * Get column names by type.
 * @function getColNames
 * @param {Object} data - data object
 * @param {string[]} [types=] - data types
 */
function getColNames(data, types) {
  var notype = (typeof masking === 'undefined');
  var res = [];
  for (var i = 1; i < data.cols.length; i++) {
    if (notype || types.indexOf(data.types[i]) !== -1) res.push(data.cols[i]);
  }
  return res;
}


/**
 * Match two arrays by whole
 * @function matchWhole
 * @param {string[]} keys - keywords
 * @param {string[]} cols - column names
 */
function matchWhole(keys, cols) {
  for (var i = 1; i < cols.length; i++) {
    if (keys.indexOf(cols[i].toLowerCase()) !== -1) return cols[i];
  }
  return null;
}


/**
 * Match two arrays by prefix
 * @function matchWhole
 * @param {string[]} keys - keywords
 * @param {string[]} cols - column names
 */
function matchPrefix(keys, cols) {
  var delims = [' ', '/', '_', '.'];
  for (var i = 1; i < delims.length; i++) {
    for (var j = 1; j < cols.length; j++) {
      var prefix = cols[j].toLowerCase().split(delims[i], 1)[0];
      if (keys.indexOf(prefix) !== -1) {
        return cols[i];
      }
    }
  }
  return null;
}


/**
 * Guess a proper metric based on column name.
 * @function guessColMetric
 * @param {string[]} col - column name
 * @returns {string} metric
 * @description Options are: none, sum, mean, sumby meanby.
 * e.g., "length" and "genes" => sum
 * e.g., "gc" and "coverage" => meanby (length)
 */
function guessColMetric(col) {
  var res = 'sum';
  switch(col.toLowerCase()) {
    case 'x':
    case 'y':
      break;
    case 'gc':
    case 'coverage':
      res = 'meanby';
      break;
    case 'silhouette':
      res = 'mean';
      break;
  }
  return res;
}

/**
 * Format length value.
 * @function FormatLength
 * @param {number} len - length (bp)
 * @returns {Array.<number, string>} number and unit
 */
function FormatLength(len) {
  var abslen = Math.abs(len);
  if (abslen < 999.5) {
    return [len, 'bp'];
  } else if (abslen < 999500) {
    return [len / 1000, 'kb'];
  } else {
    return [len / 1000000, 'Mb'];
  }
}


/**
 * Generate a new bin name based on existing bin names.
 * Will read like "bin_#", in which "#" is an incremental integer.
 * @function newBinName
 * @param {Object} bins - existing bin names
 * @returns {string} new bin name
 */
function newBinName(bins) {
  var i = Object.keys(bins).length + 1;
  var name;
  while (true) {
    name = 'bin_' + i;
    if (name in bins) i ++;
    else return name;
  }
}
