"use strict";

/**!
 * @module input
 * @file Data input functions.
 * @description This module parse input files, extract data and construct data
 * tables that can be visualized and analyzed.
 */


/**
 * Import data from a text file.
 * @function uploadFile
 * @param {File} file - user upload file
 * @param {Object} mo - main object
 * @description It uses the FileReader object, available since IE 10.
 */
function uploadFile(file, mo) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const cache = updateDataFromText(e.target.result, mo.data, mo.view.filter);
    updateViewByData(mo, cache);
    toastMsg(`Read ${plural('contig', mo.data.df.length)}.`, mo.stat);
  };
  reader.readAsText(file);
}

/**
 * Import data from a remote location
 * @function updateDataFromRemote
 * @param {string} path - remote path to data file
 * @param {Object} mo - main object
 * @description It uses XMLHttpRequest, which has to be run on a server.
 */
function updateDataFromRemote(path, mo) {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        const cache = updateDataFromText(this.responseText, mo.data,
          mo.view.filter);
        updateViewByData(mo, cache);
        toastMsg(`Read ${plural('contig', mo.data.df.length)}.`, mo.stat);
      }
    }
  };
  xhr.open('GET', path, true);
  xhr.send();
}


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
  data.types = ['id', 'number', 'number', 'number'];
  data.features = [];
  data.df = df;

  // return decimals (hard-coded)
  const deci = { 'length': 0, 'gc': 3, 'coverage': 6 };
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
 * Export data as a JSON file.
 * @function exportJSON
 * @param {Object} data - data object to export
 * @see {@link https://stackoverflow.com/questions/17527713/}
 * This way avoids saving the lengthy href.
 */
 function exportJSON(data) {
  const a = document.createElement('a');
  a.href = 'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(data, null, 2));
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
