"use strict";

/**!
 * @module operation
 * @file Operative functions.
 * They do NOT directly access the master object OR the "document" object, but
 * may access the "data" object and DOMs that are explicitly passed to them.
 */


/**
 * @summary Data operations
 */

/**
 * Update data from text file.
 * @function updateDataFromText
 * @param {String} text - imported text
 * @param {Object} data - data object
 * @returns {Array.<Object, Object, Object>} - decimals, categories and features
 *
 * The file may be JSON format, or TSV format.
 * In later case, it should follow these rules:
 * Columns:
 *   first column: ID
 *   remaining columns: metadata fields
 * Field types (and codes):
 *   id, number(n), category(c), feature(f), description(d)
 * A field name may be written as name|code, or just name.
 * Category vs. feature: a feacture cell can have multiple,
 * comma-separated features.
 *   e.g., "Firmicutes,Proteobacteria,Cyanobacteria"
 * Weight: categories / features may have a numeric suffix following a colon,
 * indicating metrics likes weight, quantity, proportion, confidence etc.
 *   e.g., "Firmicutes:80,Proteobacteria:15"
 * Integer vs. float: numbers are automatically parsed as integer or float.
 * Boolean: considered as category.
 * Null values: automatically identified and converted to JavaScript null.
 *   e.g., "", "-", "N/A", "na", "#NaN"
 */
function updateDataFromText(text, data) {

  // first, try to parse as JSON
  try {
    var x = JSON.parse(text);
    // enumerate valid keys only
    // note: a direct `data = x` will break object reference
    for (var key in data) {
      if (key in x) data[key] = x[key];
    }
    return cacheData(data);
  }

  // second, try to parse as table
  catch (err) {
    return parseTable(text, data);
  }

  // update view
  
}


/**
 * Parse data as table.
 * @function parseTable
 * @param {String} text - multi-line string in tsv format
 * @param {Object} data - data object
 * @returns {Array.<Object, Object, Object>} - decimals, categories and features
 * @see cacheData
 * This function duplicates the function of cacheData due to consideration of
 * big data processing.
 */
function parseTable(text, data) {
  var lines = splitLines(text);
  if (lines.length == 1) throw 'Error: there is only one line.';

  // read column names and table body
  var cols = [];
  var df = [];
  var ncol = 0;
  for (var i = 0; i < lines.length; i++) {
    var arr = lines[i].split('\t');
    // parse table header
    if (i == 0) {
      // cols = arr.slice(1);
      cols = arr;
      ncol = cols.length;
      // parse table body
    } else {
      if (arr.length !== ncol) {
        throw ('Error: table has ' + ncol + ' columns but row ' + i +
          ' has ' + arr.length + ' cells.');
      }
      df.push(arr)
    }
  }

  var deci = {};
  var cats = {};
  var feats = {};

  // identify field types and re-format data
  var types = ['id'];
  for (var i = 1; i < cols.length; i++) {
    var arr = [];
    for (var j = 0; j < df.length; j++) {
      arr.push(df[j][i]);
    }
    var x = parseFieldType(cols[i], arr);
    var type = x[0];
    var col = x[1];
    types.push(type); // identified type
    cols[i] = col; // updated name
    for (var j = 0; j < df.length; j++) {
      df[j][i] = arr[j];
    }

    // summarize categories or features
    switch (type) {
      case 'number':
        deci[col] = maxDecimals(arr);
        break;
      case 'category':
        cats[col] = listCats(arr);
        break;
      case 'feature':
        feats[col] = listFeats(arr);
        break;
    }
  }

  // update data object
  data.cols = cols;
  data.types = types;
  data.features = [];
  data.df = df;

  return [deci, cats, feats];
}


/**
 * Pre-cache summary of data.
 * @function cacheData
 * @param {String} text - multi-line string in tsv format
 * @param {Object} data - data object
 * @returns {Array.<Object, Object, Object>} - decimals, categories and features
 * @see parseTable
 */
function cacheData(data) {
  var deci = {};
  var cats = {};
  var feats = {};
  data.types.forEach(function (type, i) {
    if (['number', 'category', 'feature'].indexOf(type) !== -1) {
      var arr = [];
      for (var j = 0; j < data.df.length; j++) {
        arr.push(data.df[j][i]);
      }
      var col = data.cols[i];
      switch (type) {
        case 'number':
          deci[col] = maxDecimals(arr);
          break;
        case 'category':
          cats[col] = listCats(arr);
          break;
        case 'feature':
          feats[col] = listFeats(arr);
          break;
      }
    }
  });
  return [deci, cats, feats];
}


/**
 * @summary Binning operations
 */

/**
 * Rename a bin.
 * @function renameBin
 * @param {Object} bins - bins
 * @param {string} oldname - old bin name
 * @param {string} newname - new bin name
 * @returns {boolean} whether renaming is successful
 */
function renameBin(bins, oldname, newname) {
  if (newname in bins) return false;
  bins[newname] = {};
  Object.keys(bins[oldname]).forEach(function (idx) {
    bins[newname][idx] = null;
  });
  delete bins[oldname];
  return true;
}


/**
 * Create a new bin.
 * @function createBin
 * @param {Object} [bins] - current bins
 * @param {string} [name] - bin name
 * @throws Error if bin name exists
 * @returns {string} bin name
 */
function createBin(bins, name) {
  if (name === undefined) {
    name = newBinName(bins);
  } else if (name in bins) {
    throw 'Error: bin name "' + bin + '" exists.';
  }
  bins[name] = {};
  return name;
}


/**
 * Find current bin.
 * @function currentBin
 * @param {Object} table - bin table
 * @throws {Error} if current bin is not defined
 * @returns {[number, string]} row index and name of current bin
 */
function currentBin(table) {
  var idx;
  for (var i = 0; i < table.rows.length; i++) {
    if (table.rows[i].classList.contains('current')) {
      idx = i;
      break;
    }
  }
  if (idx === undefined) throw 'Error: Current bin is not defined.';
  var name = table.rows[idx].cells[0].firstElementChild.innerHTML;
  return [idx, name];
}


/**
 * Add selected contigs to a bin.
 * @function addToBin
 * @param {number[]} indices - indices of selected contigs
 * @param {Object} bin - target bin
 * @returns {number[]} indices of added contigs
 */
function addToBin(indices, bin) {
  var res = [];
  indices.forEach(function (i) {
    if (!(i in bin)) {
      bin[i] = null;
      res.push(i);
    }
  });
  return res;
}


/**
 * Remove selected contigs from a bin.
 * @function removeFromBin
 * @param {number[]} indices - indices of selected contigs
 * @param {Object} bin - target bin
 * @returns {number[]} indices of removed contigs
 */
function removeFromBin(indices, bin) {
  var res = [];
  indices.forEach(function (i) {
    if (i in bin) {
      delete bin[i];
      res.push(i);
    }
  });
  return res;
}


/**
 * Delete selected bins.
 * @function deleteBins
 * @param {Object} table - bin table
 * @param {Object} bins - bins object
 * @throws Error if no bin is selected
 * @returns {[string[]], [number[]]} deleted bins and their contigs
 */
function deleteBins(table, bins) {
  var names = [];
  for (var i = table.rows.length - 1; i >= 0; i--) {
    var row = table.rows[i];
    if (row.classList.contains('selected')) {
      names.push(row.cells[0].firstElementChild.innerHTML);
      table.deleteRow(i);
    }
  }
  var ctgs = {};
  if (names.length === 0) throw 'Error: No bin is selected.';
  names.forEach(function (name) {
    Object.keys(bins[name]).forEach(function (idx) {
      ctgs[idx] = null;
    });
    delete bins[name];
  });
  return [names, Object.keys(ctgs).sort()];
}


/**
 * Programmatically select a bin in the bin table.
 * @function selectBin
 * @param {Object} table - bin table
 * @param {string} name - bin name
 */
function selectBin(table, name) {
  for (var i = 0; i < table.rows.length; i++) {
    if (table.rows[i].cells[0].firstElementChild.innerHTML === name) {
      table.rows[i].click();
      break;
    }
  }
}


/**
 * Load bins based on a categorical field.
 * @function loadBin
 * @param {Object} df - data frame
 * @param {number} idx - field index
 * @returns {Object} bins object
 */
function loadBins(df, idx) {
  var bins = {};
  for (var i = 0; i < df.length; i++) {
    var val = df[i][idx];
    if (val !== null) {
      var cat = val[0];
      if (!(cat in bins)) bins[cat] = {};
      bins[cat][i] = null;
    }
  }
  return bins;
}


/**
 * @summary Information operations
 */

/**
 * Format a category cell as string.
 * @function category2Str
 * @param {Array} val - cell value (array of [category, weight])
 * @returns {string} formatted string
 */
function category2Str(val) {
  return (val === null ? '' : val[0]);
}


/**
 * Format a feature cell as string.
 * @function feature2Str
 * @param {Object} val - cell value (object of feature: weight pairs)
 * @returns {string} formatted string
 */
function feature2Str(val) {
  return Object.keys(val).sort().join(', ');
}


/**
 * Format a cell as string.
 * @function value2Str
 * @param {*} val - cell value
 * @returns {string} formatted string
 */
function value2Str(val, type) {
  var str = '';
  switch (type) {
    case 'category':
      str = category2Str(val);
      break;
    case 'feature':
      str = feature2Str(val);
      break;
    default:
      str = (val === null) ? 'na' : val.toString();
  }
  return str
}


/**
 * Generate a metric to summarize a field of multiple contigs.
 * @function columnInfo
 * @param {Array} arr - data column to describe
 * @param {string} type - type of column
 * @param {string} [met] - metric (sum or mean)
 * @param {string} [deci] - digits after decimal point
 * @param {string} [refarr] - reference column for weighting
 */
function columnInfo(arr, type, met, deci, refarr) {
  var isRef = Array.isArray(refarr);
  met = met || 'none';
  deci = deci || 0;
  var res = 0;
  switch (type) {
    case 'number':
      switch (met) {
        case 'sum':
          if (!isRef) res = arrSum(arr);
          else res = arrProdSum(arr, refarr);
          break;
        case 'mean':
          if (!isRef) res = arrMean(arr);
          else res = arrProdSum(arr, refarr) / arrSum(refarr);
          break;
      }
      res = formatNum(res, deci);
      break;
    case 'category':
      var x = objMinMax(listCats(arr));
      var frac = x[1][1] / arr.length;
      res = (frac > 0.5) ? (x[1][0] + ' (' + (frac * 100).toFixed(2)
        .replace(/\.?0+$/, '') + '%)') : 'ambiguous';
      break;
    case 'feature':
      var x = listFeats(arr);
      var a = [];
      Object.keys(x).sort().forEach(function (k) {
        if (x[k] === 1) a.push(k);
        else a.push(k + '(' + x[k] + ')');
      });
      res = a.join(', ');
      break;
  }
  return res;
}
