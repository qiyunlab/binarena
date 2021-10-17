"use strict";

/**!
 * @module operation
 * @file Operative functions.
 * They do NOT directly access the master object OR the "document" object.
 * They may the "data" object and DOMs that are explicitly passed to them.
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
    if (getFileFormat(text)) {
      return parseAssembly(text, data, 1000);
    }
    else {
      return parseTable(text, data);
    }
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
      df.push(arr);
    }
  }

  return formatData(data, df, cols);
}

/**
 * Parse data as assembly.
 * @function parseAssembly
 * @param {String} text - multi-line string in tsv format
 * @param {Object} data - data object
 * @param {Integer} minContigLength - minimum contig length of contig
 * @returns {Array.<Object, Object, Object>} - decimals, categories and features
 * @see cacheData
 * This function duplicates the function of cacheData due to consideration of
 * big data processing.
 */
function parseAssembly(text, data, minContigLength) {
  var lines = splitLines(text);
  if (lines.length === 1) throw 'Error: there is only one line.';

  var format = getFileFormat(text); // read file format of the inputted text
  var types = ['id'];
  var cols = ['id', 'length', 'gc', 'coverage']; // the information available in the contig titles
  var df = [];

  var id = 0;
  var length = 0;
  var gc = 0;
  var coverage = 0;
  var currentContigLength = 0;
  var gcCount = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.search(/^>{1}/gm) === 0) { // Checking if the current line is a contig title
        [id, length, coverage] = parseContigTitles(line, format);
        if (length <= minContigLength) 
          continue;

        // append dataframe with contig title information
        df.push([id, length, , coverage]) // gc not calculated yet
        gcCount = 0;
        currentContigLength = 0;
    }
    else {
      gcCount += calculateLineGC(line);
      currentContigLength += line.length; 
      if (df.length != 0 && currentContigLength === Number(length)) { // verifying if current line is last line in contig
        gc = (gcCount/currentContigLength).toString(); // identified last component of contig title
        df[df.length - 1][2] = gc; // update gc in dataframe
      }
    }
  }

  if (df.length === 0) throw 'Error: No contig is bigger than ' + minContigLength + ' base pairs.';

  return formatData(data, df, cols);
}

/**
 * Calculates GC count in one line in the contig.
 * @function calculateLineGC
 * @param {String} line - one line string in contig
 * @returns {Integer} - GC count of one contig line
 */
function calculateLineGC(line) {
  var count = 0;
  // iterating through the line to find IUPAC nucleotide codes that have a probability of including 'G' or 'C'
  for (var i = 0; i < line.length; i++) {
      switch (line.charAt(i).toUpperCase()) {
        case 'G':
        case 'C':
        case 'S':
          count ++;
          break;
        case 'R':
        case 'Y':
        case 'K':
        case 'M':
        case 'N':
          count += 0.5;
          break;
        case 'D':
        case 'H':
          count += 0.33;
          break;
        case 'B':
        case 'V':
          count += 0.67;
      }
  }
  return count;  
}

/**
 * Gets the file format of the input data
 * @function getFileFormat
 * @param {String} text - multi-line string in tsv format
 * @returns {String} - file type of input data
 */
function getFileFormat(text) {
  // searching for unique starting sequences of different file formats
  var spades_regex = /^>NODE_\d+\_length_\d+\_cov_\d*\.?\d*/g;
  var megahit_regex = /^>k\d+_\d+\sflag=\d+\smulti=\d*\.?\d*\slen=\d+/g;
  if (text.search(spades_regex) === 0) {
    return 'spades';
  }
  else if (text.search(megahit_regex) === 0) {
    return 'megahit';
  }
  return null;
}

/**
 * Parses and retrieves information in the contig titles of the input data
 * @function parseContigTitles
 * @param {String} line - one line string of the contig title
 * @param {String} format - file type of input data
 * @returns {Array.<String, String, String>} - id, length, coverage of contig
 */
function parseContigTitles(line, format) {
  var id = '';
  var length = 0;
  var coverage = 0;
  if (format === 'spades') {
    var regex = /(?<=_)(\+|-)?[0-9]*(\.[0-9]*)?$|\d+/g;
    [id, length, coverage] = line.match(regex);
    return [id, length, coverage];
  }
  else if (format === 'megahit') {
    var regex = /(?<==|_)[0-9]*(\.[0-9]*)?/g;
    [id, , coverage, length] = line.match(regex);
    return [id, length, coverage];
  }
  return null;
}

/**
 * Formats data into usable types
 * @function formatData
 * @param {Object} data - data object
 * @param {Matrix} dataframe - data points for available characteristices of contigs
 * @param {Object} columns - available characteristics of contigs
 * @returns {Array.<Object, Object, Object>} - id, length, coverage of contig
 */
function formatData(data, dataframe, columns) {
  var deci = {};
  var cats = {};
  var feats = {};

  // identify field types and re-format data
  var types = ['id'];
  for (var i = 1; i < columns.length; i++) {
    var arr = [];
    for (var j = 0; j < dataframe.length; j++) {
      arr.push(dataframe[dataframe.length - j - 1][i]);
    }
      var x = parseFieldType(columns[i], arr);
      var type = x[0];
      var col = x[1];
      types.push(type); // identified type
      columns[i] = col; // updated name
      for (var j = 0; j < dataframe.length; j++) {
        dataframe[j][i] = arr[j];
      }
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

  data.cols = columns;
  data.types = types;
  data.features = [];
  data.df = dataframe;
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
      str = val.toString();
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
          if (!isRef) res = arrSum(arr) / arr.length;
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
