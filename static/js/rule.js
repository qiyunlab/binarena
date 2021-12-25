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
 * @description This is only a subset of Pandas default missing values.
 * @see {@link https://pandas.pydata.org/docs/reference/api/
 * pandas.read_table.html}
 */
function isMissing(str) {
  const nulls = ['na', 'n/a', 'nan', 'null', ''];
  try {
    str = str.replace(/^[#-]+/, '');
  } catch (e) {
    throw e.message + ' ' + str;
  }
  return nulls.includes(str.toLowerCase());
}


/**
 * Define display items based on data.
 * @function guessDisplayFields
 * @param {Object} cols - cols object
 * @param {Object} cache - cache object
 * @throws if x and y cannot be determined
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
function guessDisplayFields(cols, cache) {
  const res = {
    x: null,
    y: null,
    size: null,
    opacity: null,
    color: null
  };  
  const names = cols.names,
        types = cols.types;

  // first, locate x and y (mandatory)
  const xyCand = [null, null];
  let name;
  for (let i = 1; i < names.length; i++) {
    if (types[i] !== 'num') continue;
    name = names[i].toLowerCase();
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
    res.size = cache.speci.len || null;
    res.opacity = cache.speci.cov || null;
    res.color = guessRankColumn(cols) || cache.speci.gc || null;
  }

  // otherwise, get gc -> coverage -> length
  else {
    const avails = [];
    let icol;
    for (let key of ['gc', 'cov', 'len']) {
      icol = cache.speci[key];
      if (icol) avails.push(icol);
    }
    if (avails.length >= 2) {
      res.x = avails[0];
      res.y = avails[1];
      if (avails.length === 3) {
        res.size = avails[2];
      }
    }
  }
  return res;
}


/**
 * Guess display scales of items.
 * @function guessDisplayScales
 * @param {string[]} items - display items
 * @returns {Object} display item to scale mapping
 */
function guessDisplayScales(items) {
  const res = {};
  for (let item of items) {
    switch (item) {
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
        throw `Error: Invalid display item: "${item}".`;
    }
  }
  return res;
}


/**
 * Guess which column represents the "length" property.
 * @function guessLenColumn
 * @param {Object} cols - data object
 * @returns {number} - index of "length" column
 */
function guessLenColumn(cols) {
  const keys = ['length', 'size', 'len', 'bp'];
  return findColumnByKeys(cols, keys, ['num']);
}


/**
 * Guess which column represents the "coverage" property.
 * @function guessCovColumn
 * @param {Object} cols - cols object
 * @returns {number} - index of "coverage" column
 */
function guessCovColumn(cols) {
  const keys = ['coverage', 'cov', 'depth'];
  return findColumnByKeys(cols, keys, ['num']);
}


/**
 * Guess which column represents the "gc" property.
 * @function guessGCColumn
 * @param {Object} cols - cols object
 * @returns {number} - index of "gc" column
 */
function guessGCColumn(cols) {
  const keys = ['gc', 'g+c', 'gc%', 'gc-content', 'gc-ratio'];
  return findColumnByKeys(cols, keys, ['num']);
}


/**
 * Guess which column represents the highest taxonomic rank.
 * @function guessRankColumn
 * @param {Object} cols - cols object
 * @returns {number} - index of high rank column
 */
function guessRankColumn(cols) {
  // ignore kingdom/domain and species
  const keys = ['phylum', 'class', 'order', 'family', 'genus'];
  return findColumnByKeys(cols, keys, ['cat']);
}


/**
 * Find column by keywords.
 * @function findColumnByKeys
 * @param {Object} cols - cols object
 * @param {string[]} keys - keywords
 * @param {string[]} [types=] - valid data types
 * @returns {number} - index of found column, or 0 if not found
 * @description It first attempts whole-word matching; if not found, it will
 * try prefix matching, using a fixed list of delimiters.
 */
function findColumnByKeys(cols, keys, types) {
  const delims = [' ', '/', '_', '.'];
  const n = cols.names.length;
  let type, whole = 0, prefix = 0;
  for (let i = 1; i < n; i ++) {
    type = cols.types[i];
    if (type.endsWith('wt')) continue;
    if (types && types.indexOf(type) === -1) continue;
    let str = cols.names[i].toLowerCase();
    if (keys.indexOf(str) !== -1) {
      whole = i;
      break;
    }
    if (prefix) continue;
    for (let d of delims) {
      if (keys.indexOf(str.substring(0, str.indexOf(d))) !== -1) {
        prefix = i;
        break;
      };
    }
  }
  return whole ? whole : prefix;
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
  let res = 'sum';
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
 * Format a cell as string.
 * @function value2Str
 * @param {*} val - cell value
 * @returns {string} formatted string
 */
function value2Str(val, type) {
  let str = '';
  switch (type) {
    case 'num':
      str = (!Number.isNaN(val)) ? formatNum(val, 5) : '';
      break;
    case 'cat':
      str = val;
      break;
    case 'fea':
      str = val.join(', ');
      break;
    default:
      str = String(val);
  }
  return str;
}


/**
 * Format length value.
 * @function FormatLength
 * @param {number} len - length (bp)
 * @returns {Array.<number, string>} number and unit
 */
function FormatLength(len) {
  const abslen = Math.abs(len);
  if (abslen < 999.5) {
    return [len, 'bp'];
  } else if (abslen < 999500) {
    return [len / 1000, 'kb'];
  } else {
    return [len / 1000000, 'Mb'];
  }
}


/**
 * Generate a new name that does not conflict with existing names.
 * Will read like "prefix_#", in which "#" is an incremental integer.
 * @function newName
 * @param {Object} exists - existing names
 * @param {string} prefix - name prefix
 * @returns {string} new name
 */
function newName(exists, prefix) {
  let name;
  let i = 1;
  while (true) {
    name = prefix + '_' + i;
    if (name in exists) i ++;
    else return name;
  }
}


/**
 * Dictionary of singular to plural transformations.
 */
const PLURAL_FORMS = {};


/**
 * Generate a new name that does not conflict with existing names.
 * Will read like "prefix_#", in which "#" is an incremental integer.
 * @function plural
 * @param {Object} exists - existing names
 * @param {string} prefix - name prefix
 * @returns {string} new name
 */
function plural(noun, n) {
  if (n <= 1) return n + ' ' + noun;
  else if (noun in PLURAL_FORMS) return n + ' ' + PLURAL_FORMS[noun];
  else return n + ' ' + noun + 's';
}
