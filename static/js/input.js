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
    updateDataFromText(e.target.result, mo.data, mo.cols, mo.filter);
    updateViewByData(mo);
    toastMsg(`Read ${plural('contig', mo.data[0].length)}.`, mo.stat);
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
        updateDataFromText(this.responseText, mo.data, mo.cols, mo.filter);
        updateViewByData(mo);
        toastMsg(`Read ${plural('contig', mo.data[0].length)}.`, mo.stat);
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
 * @param {Array} data - dataset
 * @param {Object} cols - columns
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
function updateDataFromText(text, data, cols, filter) {
  let obj;

  // try to parse as JSON
  try {
    obj = JSON.parse(text);
    parseObj(obj, data, cols);
  }
  catch (err) {

    // parse as an assembly
    if (text.charAt() === '>') {
      parseAssembly(text, data, cols, filter);
    }

    // parse as a table
    else {
      parseTable(text, data, cols);
    }
  }
}


/**
 * Parse data as a JavaScript object.
 * @function parseObj
 * @param {Object} obj - input object
 * @param {Object} data - dataset
 * @param {Object} cols - columns
 * @todo xxxxx
 */
function parseObj(obj, data, cols) {
  // enumerate valid keys only
  // note: a direct `data = x` will break object reference
  for (let key in data) {
    if (key in obj) data[key] = obj[key];
  }
}


/**
 * Parse data as a table.
 * @function parseTable
 * @param {String} text - multi-line tab-delimited string
 * @param {Object} data - dataset
 * @param {Object} cols - columns
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 * @throws if table is empty
 * @throws if column number is inconsistent
 * @throws if duplicate contig Ids found
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
 */
function parseTable(text, data, cols) {
  const lines = splitLines(text);
  const n = lines.length;
  if (n <= 1) throw 'Error: Table is empty.';

  // read table header
  const names = lines[0].split('\t');
  const m = names.length;
  if (m < 2) throw 'Error: Table has no column.';
  if ((new Set(names)).size !== m) throw 'Error: Column names are not unique.';

  // read table body
  let arr2d = [];
  let row;
  for (let i = 1; i < n; i++) {
    row = lines[i].split('\t');
    if (row.length !== m) throw `Error: Table has ${m} columns but row ` +
      `${i + 1} has ${row.length} cells.`;
    arr2d.push(row);
  }

  // transpose table
  arr2d = transpose(arr2d);

  // initialize new dataset with Id
  if ((new Set(arr2d[0])).size !== n - 1) {
    throw 'Error: Contig identifiers are not unique.';
  }
  data.push(arr2d[0]);
  cols.names.push(names[0]);
  cols.types.push('id');

  // parse and append individual columns
  for (let i = 1; i < m; i++) {
    let [name, type, parsed, weight] = parseColumn(arr2d[i], names[i]);
    data.push(parsed);
    cols.names.push(name);
    cols.types.push(type);

    // if there is weight, append as a new column
    if (weight !== null) {
      data.push(weight);
      cols.names.push(name);
      cols.types.push(type === 'cat' ? 'cwt' : 'fwt');
    }
  }

}


/**
 * @constant FIELD_CODES
 */
const FIELD_CODES = {
  'n': 'num', // numeric
  'c': 'cat', // categorical
  'f': 'fea', // feature set
  'd': 'des'  // descriptive
};


/** Parse a column in the data table.
 * @function parseColumn
 * @param {Array} arr - column data
 * @param {string} name - column name
 * @returns {[string, string, Array, Array]} -
 * - processed column name
 * - column data type
 * - processed column data
 * - weights of categories or features (if applicable)
 * @throws if field name is invalid
 * @throws if field code is invalid
 * @todo drop all-equal columns
 */

function parseColumn(arr, name) {
  let type;

  // look for field type code
  // (e.g., "length|n", "species|c")
  let i = name.indexOf('|');
  if (i > 0) {
    if (i != name.length - 2) throw `Invalid field name: "${name}".`;
    const code = name.slice(-1);
    type = FIELD_CODES[code];
    if (type === undefined) throw `Invalid field type code: "${code}".`;
    name = name.slice(0, i);
  }

  // parse the column according to type, or guess its type
  let parsed, weight = null;
  switch (type) {
    case 'num':
      parsed = parseNumColumn(arr);
      break;
    case 'cat':
      [parsed, weight] = parseCatColumn(arr);
      break;
    case 'fea':
      [parsed, weight] = parseFeaColumn(arr);
      break;
    case 'des':
      parsed = arr;
      break;
    default:
      [type, parsed, weight] = guessColumnType(arr);
  }

  return [name, type, parsed, weight];
}


/**
 * Parse a numeric column.
 * @function parseNumColumn
 * @param {string[]} arr - input column
 * @returns {number[]} - output array
 */
function parseNumColumn(arr) {
  const n = arr.length;
  const res = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    res[i] = Number(arr[i]);
  }
  return res;
}


/**
 * Parse a categorical column.
 * @function parseCatColumn
 * @param {string[]} arr - input column
 * @returns {string[], number[]} - arrays of categories and weights
 */
function parseCatColumn(arr) {
  const n = arr.length;
  const parsed = Array(n).fill(''),
        weight = Array(n).fill(NaN);
  let weighted = false;
  let val, j, wt;
  for (let i = 0; i < n; i++) {
    val = arr[i].trim();
    j = val.lastIndexOf(':');
    if (j > 0) { // may have weight
      wt = val.substring(j + 1);
      if (!isNaN(wt)) { // weight is a number
        parsed[i] = val.substring(0, j);
        weight[i] = Number(wt);
        weighted = true;
      } else {
        parsed[i] = val;
      }
    } else {
      parsed[i] = val;
    }
  }
  return [parsed, weighted ? weight : null];
}


/**
 * Parse a feature set column.
 * @function parseFeaColumn
 * @param {string[]} arr - input column
 * @returns {string[][], number[][]} - arrays of feature lists and
 * corresponding weights in the same order
 * @see parseCatColumn
 */
function parseFeaColumn(arr) {
  const n = arr.length;
  const parsed = Array(n).fill().map(() => []),
        weight   = Array(n).fill().map(() => []);
  let weighted = false;
  let vals, val, j, wt;
  for (let i = 0; i < n; i++) {
    vals = arr[i].trim().replace(/\s*,\s*/g, ',').split(',');
    for (val of vals) {
      j = val.lastIndexOf(':');
      if (j > 0) {
        wt = val.substring(j + 1);
        if (!isNaN(wt)) {
          parsed[i].push(val.substring(0, j));
          weight[i].push(Number(wt));
          weighted = true;
        } else {
          parsed[i].push(val);
          weight[i].push(NaN);
        }
      } else if (val !== '') {
        parsed[i].push(val);
        weight[i].push(NaN);
      }
    }
  }
  return [parsed, weighted ? weight : null];
}


/**
 * Guess the data type of a column while parsing it.
 * @function guessColumnType
 * @param {string[]} arr - input column
 * @returns {string, Array, Array} - column type, data array, weight array (if
 * applicable)
 * @see parseNumColumn
 * @see parseCatColumn
 * @see parseFeaColumn
 * @description The decision process is as follows:
 * 
 * 1. If all values are numbers, parse as numbers.
 * 2. If all values do not contain comma (,), parse as categories.
 * 3. Otherwise, parse as features.
 * 
 * This function is similiar to a combination of three: `parseNumColumn`,
 * `parseCatColumn`, and `parseFeaColumn`, but it is less aggressive as it
 * attempts to guess the most plausible data type.
 * 
 * Note: This function uses `isNaN` to check whether a string is a number.
 * Not to be confused with `Number.isNaN`.
 * 
 * Note: This function uses the presence of comman (,) to determine whether
 * the input data are categories, as in contrast to `parseCatColumn`, which
 * does not do this check.
 * 
 * @todo Terminate the search for categories and features if the entropy of
 * processed ones exceed a threshold, and return "description".
 */
function guessColumnType(arr) {
  const n = arr.length;

  // try to parse as numbers
  let areNums = true;
  let parsed = Array(n).fill(NaN);
  let val;
  for (let i = 0; i < n; i++) {
    if (areNums) {
      val = arr[i];
      if (!isNaN(val)) {
        parsed[i] = Number(val);
      } else {
        areNums = false;
        break;
      }
    }
  }
  if (areNums) return ['num', parsed, null];

  // try to parse as numbers
  let areCats = true;
  let weighted = false;
  parsed = Array(n).fill('');
  let weight = Array(n).fill(NaN);
  let j, wt;
  for (let i = 0; i < n; i++) {
    if (areCats) {
      val = arr[i].trim();
      if (val.indexOf(',') === -1) {
        j = val.lastIndexOf(':');
        if (j > 0) {
          wt = val.substring(j + 1);
          if (!isNaN(wt)) {
            parsed[i] = val.substring(0, j);
            weight[i] = Number(wt);
            weighted = true;
          } else {
            parsed[i] = val;
          }
        } else {
          parsed[i] = val;
        }
      } else {
        areCats = false;
        break;
      }
    }
  }
  if (areCats) return ['cat', parsed, weighted ? weight : null];

  // parse as features
  parsed = Array(n).fill().map(() => []);
  weight = Array(n).fill().map(() => []);
  weighted = false;
  let vals;
  for (let i = 0; i < n; i++) {
    vals = arr[i].trim().replace(/\s*,\s*/g, ',').split(',');
    for (val of vals) {
      j = val.lastIndexOf(':');
      if (j > 0) {
        wt = val.substring(j + 1);
        if (!isNaN(wt)) {
          parsed[i].push(val.substring(0, j));
          weight[i].push(Number(wt));
          weighted = true;
        } else {
          parsed[i].push(val);
          weight[i].push(NaN);
        }
      } else if (val !== '') {
        parsed[i].push(val);
        weight[i].push(NaN);
      }
    }
  }
  return ['fea', parsed, weighted ? weight : null];

}


/**
 * Parse data as an assembly.
 * @function parseAssembly
 * @param {String} text - assembly file content (multi-line string)
 * @param {Object} data - data object
 * @param {Object} cols - cols object
 * @param {Object} filter - data filter (minimum length and coverage)
 * @throws if no contig reaches length threshold
 * @description It attempts to extract four pieces of information from a
 * multi-FASTA file: ID, length, GC content, and coverage.
 */
function parseAssembly(text, data, cols, filter) {
  const lines = splitLines(text);
  const format = getAssemblyFormat(text); // infer assembly file format

  const minLen = filter.len,
        minCov = filter.cov;

  const df = [];
  let id = '',
      length = 0,
      gc = 0,
      coverage = 0;

  // append dataframe with current contig information
  function appendContig() {
    if (id && length >= minLen && coverage >= minCov) {
      df.push([id, length, roundNum(100 * gc / length, 3), Number(coverage)]);
    }
  }

  const n = lines.length;
  let line;
  for (let i = 0; i < n; i++) {
    line = lines[i];
    // check if the current line is a contig title
    if (line.charAt() === '>') {
      appendContig(); // append previous contig
      [id, coverage] = parseContigTitle(line, format);
      gc = 0;
      length = 0;
    }
    // add length and gc count of each line to the total counters
    else {
      gc += countGC(line);
      length += line.length;
    }
  }
  appendContig(); // append last contig

  if (df.length === 0) throw `Error: No contig is ${minLen} bp or larger.`;

  // update data and cols objects
  for (let arr of transpose(df)) data.push(arr);
  cols.names = ['id', 'length', 'gc', 'coverage'];
  cols.types = ['id', 'num', 'num', 'num'];
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
 * @param {string} line - one line string of the contig title
 * @param {string} format - assembly file format
 * @returns {Array.<string, string>} - id and coverage of contig
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
