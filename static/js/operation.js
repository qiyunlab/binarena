"use strict";

/**!
 * @module operation
 * @file Operative functions.
 * They do NOT directly access the master object OR the "document" object.
 * They may access the "data" object and DOMs that are explicitly passed to
 * them.
 */


/**
 * @summary Data operations
 */

/**
 * Update data from text file.
 * @function updateDataFromText
 * @param {String} text - imported text
 * @param {Object} data - data object
 * @param {Object} filter - data filter
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 * @todo let user specify minimum contig length threshold
 *
 * The file may contain:
 * 1. Metadata of contigs.
 * 1.1. JSON format.
 * 1.2. TSV format.
 * 2. Assembly file (i.e., contig sequences).
 */
function updateDataFromText(text, data, filter) {
  // try to parse as JSON
  try {
    var obj = JSON.parse(text);
    return parseObj(obj, data);
  }
  catch (err) {
    // parse as an assembly
    if (text.charAt() === '>') {
      return parseAssembly(text, data, filter);
    }
    // parse as a table
    else {
      return parseTable(text, data);
    }
  }
}


/**
 * Parse data as a JavaScript object.
 * @function parseObj
 * @param {Object} obj - input object
 * @param {Object} data - data object
 * @todo Let it add new columns to "data".
 */
function parseObj(obj, data) {
  // enumerate valid keys only
  // note: a direct `data = x` will break object reference
  for (var key in data) {
    if (key in obj) data[key] = obj[key];
  }
  return cacheData(data);
}


/**
 * Parse data as a table.
 * @function parseTable
 * @param {String} text - multi-line string in tsv format
 * @param {Object} data - data object
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 * @throws if table is empty
 * @throws if column number is inconsistent
 * @see cacheData
 * 
 * A table file stores properties (metadata) of contigs in an assembly. It will
 * be parsed following these rules.
 * 
 * Columns:
 *   first column: ID
 *   remaining columns: metadata fields
 * 
 * Field types (and codes):
 *   id, number(n), category(c), feature(f), description(d)
 * A field name may be written as "name|code", or just "name".
 * 
 * Feature type: a cell can have multiple comma-separated features.
 *   e.g., "Firmicutes,Proteobacteria,Cyanobacteria"
 * 
 * Weight: categories / features may have a numeric suffix following a colon,
 * indicating metrics likes weight, quantity, proportion, confidence etc.
 *   e.g., "Firmicutes:80,Proteobacteria:15"
 * 
 * Integer vs. float: numbers are automatically parsed as integer or float.
 * 
 * Boolean: considered as category.
 * 
 * Null values: automatically identified and converted to JavaScript null.
 *   e.g., "", "-", "N/A", "na", "#NaN"
 */
function parseTable(text, data) {
  var lines = splitLines(text);
  if (lines.length == 1) throw 'Error: Table is empty.';
  // read column names and table body
  var cols = [];
  var df = [];
  var ncol = 0;
  for (var i = 0; i < lines.length; i++) {
    var arr = lines[i].split('\t');
    // parse table header
    if (i == 0) {
      cols = arr;
      ncol = cols.length;
    // parse table body
    } else {
      if (arr.length !== ncol) {
        throw ('Error: Table has ' + ncol + ' columns but row ' + i +
          ' has ' + arr.length + ' cells.');
      }
      df.push(arr);
    }
  }
  return formatData(data, df, cols);
}


/**
 * Parse data as an assembly.
 * @function parseAssembly
 * @param {String} text - assembly file content (multi-line string)
 * @param {Object} data - data object
 * @param {Object} filter - data filter (minimum length and coverage)
 * @param {Integer} minCov - minimum contig coverage threshold
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 * @throws if no contig reaches length threshold
 * @see formatData
 * @todo think twice about the hard-coded decimal places
 */
function parseAssembly(text, data, filter) {
  var lines = splitLines(text);
  var format = getAssemblyFormat(text); // infer assembly file format

  var minLen = filter.len;
  var minCov = filter.cov;

  var df = [];
  var id = null;
  var length = 0;
  var gc = 0;
  var coverage = 0;

  // append dataframe with current contig information
  function appendContig() {
    if (id !== null && length >= minLen && coverage >= minCov) {
      df.push([id, length, roundNum(100 * gc / length, 3), coverage]);
    }
  }

  var n = lines.length;
  for (var i = 0; i < n; i++) {
    var line = lines[i];
    if (line.charAt() === '>') { // check if the current line is a contig title
      appendContig(); // append previous contig
      [id, coverage] = parseContigTitle(line, format);
      gc = 0;
      length = 0;
    }
    else {
      // add length and gc count of each line to the total counters
      gc += countGC(line);
      length += line.length;
    }
  }
  appendContig(); // append last contig

  if (df.length === 0) throw (
    'Error: No contig is ' + minLen + ' bp or larger.');

  // update data object
  data.cols = ['id', 'length', 'gc', 'coverage'];
  data.types = ['id', 'number', 'number', 'number']
  data.features = [];
  data.df = df;

  // return decimals (hard-coded)
  var deci = {
    'length': 0,
    'gc': 3,
    'coverage': 6
  }
  return [deci, {}, {}];
}


/**
 * Calculate GC count in one line of a nucleotide sequence.
 * @function countGC
 * @param {String} line - one line of the sequence
 * @returns {Integer} - GC count of one sequence line
 * @see IUPAC nucleotide codes:
 * {@link https://www.bioinformatics.org/sms/iupac.html}
*/
function countGC(line) {
  var count = 0;
  // iterate through the line to find IUPAC nucleotide codes that have a
  // probability of including 'G' or 'C'
  for (var i = 0; i < line.length; i++) {
    var base = line.charAt(i);
    // gc count is multiplied by 6 such that it is an integer
    switch (base.toUpperCase()) {
      case 'G':
      case 'C':
      case 'S':
        count += 6;
        break;
      case 'R':
      case 'Y':
      case 'K':
      case 'M':
      case 'N':
        count += 3;
        break;
      case 'D':
      case 'H':
        count += 2;
        break;
      case 'B':
      case 'V':
        count += 4;
    }
  }
  // divide gc count by 6 (now it may be a decimal)
  return count / 6;
}


/**
 * Infer the format of an assembly file.
 * @function getAssemblyFormat
 * @param {String} text - file content (multi-line)
 * @returns {String} - assembly file format
 * @see parseContigTitle
 * This function searches for unique starting sequences of different assembly
 * formats. Currently, it supports SPAdes and MEGAHIT formats.
 */
function getAssemblyFormat(text) {
  // SPAdes contig title
  // e.g. NODE_1_length_1000_cov_12.3
  var spades_regex = /^>NODE_\d+\_length_\d+\_cov_\d*\.?\d*/g;
  if (text.search(spades_regex) === 0) {
    return 'spades';
  }
  // MEGAHIT contig title
  // e.g. k141_1 flag=1 multi=5.0000 len=1000
  var megahit_regex = /^>k\d+_\d+\sflag=\d+\smulti=\d*\.?\d*\slen=\d+/g;
  if (text.search(megahit_regex) === 0) {
    return 'megahit';
  }
  // neither
  return null;
}


/**
 * Parses and retrieves information in a contig title.
 * @function parseContigTitle
 * @param {String} line - one line string of the contig title
 * @param {String} format - assembly file format
 * @returns {Array.<String, String>} - id and coverage of contig
 * @see getAssemblyFormat
 */
function parseContigTitle(line, format) {
  var id = '';
  var length = 0;
  var coverage = 0;
  if (format === 'spades') {
    var regex = /(?<=_)(\+|-)?[0-9]*(\.[0-9]*)?$|\d+/g;
    [id, length, coverage] = line.match(regex);
    return [id, coverage];
  }
  if (format === 'megahit') {
    var regex = /(?<==|_)[0-9]*(\.[0-9]*)?/g;
    [id, , coverage, length] = line.match(regex);
    return [id, coverage];
  }
  return null;
}


/**
 * Formats data into usable types.
 * @function formatData
 * @param {Object} data - data object
 * @param {Matrix} df - data points for available characteristices of contigs
 * @param {Object} columns - available characteristics of contigs
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 */
function formatData(data, df, columns) {
  var deci = {};
  var cats = {};
  var feats = {};

  // identify field types and re-format data
  var types = ['id'];
  for (var i = 1; i < columns.length; i++) {
    var arr = [];
    for (var j = 0; j < df.length; j++) {
      arr.push(df[df.length - j - 1][i]);
    }
    var x = parseFieldType(columns[i], arr);
    var type = x[0];
    var col = x[1];
    types.push(type); // identified type
    columns[i] = col; // updated name
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

  data.cols = columns;
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
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
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
 * @throws if bin name exists
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
 * @throws if current bin is not defined
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
