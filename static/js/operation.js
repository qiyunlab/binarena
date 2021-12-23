"use strict";

/**!
 * @module operation
 * @file Operative functions.
 * They do NOT directly access the main object OR the "document" object.
 * They may access the "data" object and DOMs that are explicitly passed to
 * them.
 * 
 * @summary Table of content
 * - Data operations
 * - Binning operations
 * - Information operations
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
  let obj;

  // try to parse as JSON
  try {
    obj = JSON.parse(text);
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
  for (let key in data) {
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
  const lines = splitLines(text);
  const n = lines.length;
  if (n <= 1) throw 'Error: Table is empty.';

  // read column names and table body
  const df = [];
  let cols = [],
      ncol = 0;
  let row;
  for (let i = 0; i < n; i++) {
    row = lines[i].split('\t');

    // parse table header
    if (i == 0) {
      cols = row;
      ncol = cols.length;
    }

    // parse table body
    else {
      if (row.length !== ncol) {
        throw (`Error: Table has ${ncol} columns but row ${i} has 
          ${row.length} cells.`);
      }
      df.push(row);
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
  const lines = splitLines(text);
  const format = getAssemblyFormat(text); // infer assembly file format

  const minLen = filter.len,
        minCov = filter.cov;

  const df = [];
  let id = null,
      length = 0,
      gc = 0,
      coverage = 0;

  // append dataframe with current contig information
  function appendContig() {
    if (id !== null && length >= minLen && coverage >= minCov) {
      df.push([id, length, roundNum(100 * gc / length, 3), coverage]);
    }
  }

  const n = lines.length;
  let line;
  for (let i = 0; i < n; i++) {
    line = lines[i];
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
  const deci = { 'length': 0, 'gc': 3, 'coverage': 6 }
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
  let count = 0;
  // iterate through the line to find IUPAC nucleotide codes that have a
  // probability of including 'G' or 'C'
  let base;
  for (let i = 0; i < line.length; i++) {
    base = line.charAt(i);
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
 * @returns {String} - assembly file format (spades, megahit, or null)
 * @see parseContigTitle
 * This function searches for unique starting sequences of different assembly
 * formats. Currently, it supports SPAdes and MEGAHIT formats.
 */
function getAssemblyFormat(text) {
  // SPAdes contig title
  // e.g. NODE_1_length_1000_cov_12.3
  const spades_regex = /^>NODE_\d+\_length_\d+\_cov_\d*\.?\d*/g;
  if (text.search(spades_regex) === 0) return 'spades';

  // MEGAHIT contig title
  // e.g. k141_1 flag=1 multi=5.0000 len=1000
  const megahit_regex = /^>k\d+_\d+\sflag=\d+\smulti=\d*\.?\d*\slen=\d+/g;
  if (text.search(megahit_regex) === 0) return 'megahit';

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
  let id = '',
      length = 0,
      coverage = 0;
  if (format === 'spades') {
    const regex = /(?<=_)(\+|-)?[0-9]*(\.[0-9]*)?$|\d+/g;
    [id, length, coverage] = line.match(regex);
    return [id, coverage];
  }
  if (format === 'megahit') {
    const regex = /(?<==|_)[0-9]*(\.[0-9]*)?/g;
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
 * @param {Object} cols - available characteristics of contigs
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 */
function formatData(data, df, cols) {
  const deci = {},
        cats = {},
        feats = {};

  // identify field types and re-format data
  const types = ['id'];
  const m = cols.length,
        n = df.length;
  let arr, x, type, col, j;
  for (let i = 1; i < m; i++) {
    arr = [];
    for (j = 0; j < n; j++) {
      arr.push(df[j][i]);
      // arr.push(df[n - j - 1][i]);
    }
    x = guessFieldType(cols[i], arr);
    type = x[0];
    col = x[1];
    types.push(type); // identified type
    cols[i] = col; // updated name
    for (j = 0; j < n; j++) {
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
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 * @see parseTable
 */
function cacheData(data) {
  const deci = {}, cats = {},  feats = {};
  data.types.forEach((type, i) => {
    if (['number', 'category', 'feature'].indexOf(type) === -1) return;
    const arr = [];
    const df = data.df;
    const n = df.length;
    for (let j = 0; j < n; j++) {
      arr.push(df[j][i]);
    }
    const col = data.cols[i];
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
  });
  return [deci, cats, feats];
}


/**
 * @summary Binning operations
 * - Create a new bin.
 * - Rename a bin.
 * - Find current bin.
 * - Add contigs to a bin.
 * - Remove contigs from a bin.
 * - Delete selected bins.
 * - Load bins from a categorical field.
 */


/**
 * Create a new bin.
 * @function createBin
 * @param {Object} bins - current bins
 * @param {string} [name] - bin name
 * @throws if bin name exists
 * @returns {string} bin name
 */
function createBin(bins, name) {
  if (name === undefined) {
    name = newName(bins, 'bin');
  } else if (name in bins) {
    throw `Error: bin name "${name}" already exists.`;
  }
  bins[name] = {};
  return name;
}


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
  for (let ctg in bins[oldname]) {
    bins[newname][ctg] = null;
  }
  delete bins[oldname];
  return true;
}


/**
 * Find current bin.
 * @function currentBin
 * @param {Object} table - bin table
 * @returns {[number, string]} row index and name of current bin, or both null
 * if no bin is current
 */
function currentBin(table) {
  let idx;
  const rows = table.rows;
  const n = rows.length;
  for (let i = 0; i < n; i++) {
    if (rows[i].classList.contains('current')) {
      idx = i;
      break;
    }
  }
  if (idx === undefined) return [null, null];
  const bin = rows[idx].cells[0].firstElementChild.innerHTML;
  return [idx, bin];
}


/**
 * Add contigs to a bin.
 * @function addToBin
 * @param {number[]} ctgs - contig indices
 * @param {Object} bin - target bin
 * @returns {number[]} indices of added contigs
 */
function addToBin(ctgs, bin) {
  const added = [];
  const n = ctgs.length;
  let ctg;
  for (let i = 0; i < n; i++) {
    ctg = ctgs[i];
    if (!(ctg in bin)) {
      bin[ctg] = null;
      added.push(ctg);
    }
  }
  return added;
}


/**
 * Remove contigs from a bin.
 * @function removeFromBin
 * @param {number[]} ctgs - contig indices
 * @param {Object} bin - target bin
 * @returns {number[]} indices of removed contigs
 */
function removeFromBin(ctgs, bin) {
  const removed = [];
  const n = ctgs.length;
  let ctg;
  for (let i = 0; i < n; i++) {
    ctg = ctgs[i];
    if (ctg in bin) {
      delete bin[ctg];
      removed.push(ctg);
    }
  }
  return removed;
}


/**
 * Delete selected bins.
 * @function deleteBins
 * @param {Object} table - bin table
 * @param {Object} bins - bins object
 * @throws error if no bin is selected
 * @returns {[string[]], [number[]]} deleted bins and their contigs
 */
function deleteBins(table, bins) {

  // identify bins to delete (from bottom to top of the table)
  const todel = [];
  const rows = table.rows;
  let row;
  for (let i = rows.length - 1; i >= 0; i--) {
    row = rows[i];
    if (row.classList.contains('selected')) {
      todel.push(row.cells[0].firstElementChild.innerHTML);
      table.deleteRow(i);
    }
  }
  if (todel.length === 0) throw 'Error: No bin is selected.';

  // delete bins while listing affected bins and contigs
  const ctgs = {};
  const n = todel.length;
  let bin, ctg;
  for (let i = 0; i < n; i++) {
    bin = todel[i];
    for (ctg in bins[bin]) ctgs[ctg] = null;
    delete bins[bin];
  }
  return [todel, Object.keys(ctgs).sort()];
}


/**
 * Programmatically select a bin in the bin table.
 * @function selectBin
 * @param {Object} table - bin table
 * @param {string} bin - bin name
 */
function selectBin(table, bin) {
  for (let row of table.rows) {
    if (row.cells[0].firstElementChild.innerHTML === bin) {
      row.click();
      break;
    }
  }
}


/**
 * Load bins from a categorical field.
 * @function loadBin
 * @param {Object} df - data frame
 * @param {number} idx - field index
 * @returns {Object} bins object
 */
function loadBins(df, idx) {
  let val, cat;
  const bins = {};
  const n = df.length;
  for (let i = 0; i < n; i++) {
    val = df[i][idx];
    if (val !== null) {
      cat = val[0];
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
 * Generate a metric to summarize a field of multiple contigs.
 * @function columnInfo
 * @param {Array} arr - data column to describe
 * @param {string} type - type of column
 * @param {string} [met='none'] - metric (sum or mean)
 * @param {string} [deci=5] - digits after decimal point
 * @param {string} [refarr] - reference column for weighting
 */
function columnInfo(arr, type, met, deci, refarr) {
  const isRef = Array.isArray(refarr);
  met = met || 'none';
  deci = deci || 5;
  let res = 0;
  let x;
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
      x = objMinMax(listCats(arr));
      const frac = x[1][1] / arr.length;
      res = (frac > 0.5) ? (x[1][0] + ' (' + (frac * 100).toFixed(2)
        .replace(/\.?0+$/, '') + '%)') : 'ambiguous';
      break;

    case 'feature':
      x = listFeats(arr);
      const a = [];
      Object.keys(x).sort().forEach(k => {
        if (x[k] === 1) a.push(k);
        else a.push(k + '(' + x[k] + ')');
      });
      res = a.join(', ');
      break;
  }
  return res; 
}
