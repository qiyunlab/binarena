"use strict";

/**!
 * @module input
 * @file Data input functions.
 * @description This module parse input files, extract data and construct data
 * tables that can be visualized and analyzed.
 */


/**
 * @constant FIELD_CODES
 */
 const FIELD_CODES = {
  'n': 'num', // numeric
  'c': 'cat', // categorical
  'f': 'fea', // feature set
  'd': 'des'  // descriptive
};

const FIELD_DESCS = {
  'num': 'numeric',
  'cat': 'categorical',
  'fea': 'feature set',
  'des': 'descriptive'
};


/**
 * Initialize data import controls.
 * @function initImportCtrl
 * @param {Object} mo - main object
 */
function initImportCtrl(mo) {

  // import table button
  byId('import-btn').addEventListener('click', function () {
    const impo = mo.impo;
    let names = impo.names,
        types = impo.types;

    // add contig Ids
    const idx = [0],
          namex = [names[0]],
          typex = [types[0]];

    // add individual fields
    let i;
    for (let row of byId('import-tbody').rows) {
      i = parseInt(row.getAttribute('data-index'));
      idx.push(i);
      namex.push(names[i]);
      typex.push(row.cells[2].firstElementChild.value.substring(0, 3));
    }

    if (idx.length === 1) {
      toastMsg('No data field is selected.', mo.stat);
      return;
    }

    impo.names = namex;
    impo.types = typex;
    impo.idx = idx;

    // strip head line
    const text = impo.text
    impo.text = text.substring(text.indexOf('\n') + 1);

    // parse table body
    let data;
    [data, names, types] = parseTableBody(impo);

    // load new dataset
    if (mo.data.length === 0) {
      mo.data.push(...data);
      mo.cols.names.push(...names);
      mo.cols.types.push(...types);
    }

    // clean up data
    impo.text = null;
    impo.names = [];
    impo.types = [];
    impo.guess = [];
    impo.idx = [];

    byId('import-modal').classList.add('hidden');
    updateViewByData(mo);
    toastMsg(`Read ${plural('contig', mo.data[0].length)}.`, mo.stat);
  });
}


/**
 * Populate data import table.
 * @function fillImportTable
 * @param {Object} mo - main object
 */
function fillImportTable(mo) {
  const impo = mo.impo;
  const names = impo.names,
        types = impo.types,
        guess = impo.guess;
  const n = names.length;

  // clear table
  const table = byId('import-tbody');
  table.innerHTML = '';

  // populate table
  let row, cell, input, btn, desc;
  for (let i = 0; i < n; i++) {
    if (types[i] === 'id') continue;
    if (types[i].endsWith('wt')) continue;
    row = table.insertRow(-1);
    row.setAttribute('data-index', i)

    // drop field
    btn = document.createElement('button');
    btn.innerHTML = '&#x2715;'; // cross mark
    btn.title = 'Discard field';
    btn.addEventListener('click', function () {
      const row = this.parentElement.parentElement;
      row.parentElement.parentElement.deleteRow(row.rowIndex);
    });
    cell = row.insertCell(-1);
    cell.appendChild(btn);

    // field name
    cell = row.insertCell(-1);
    cell.innerHTML = names[i];
    
    // let user select data type
    if (guess[i]) {
      input = document.createElement('select');
      for (let key of ['num', 'cat', 'fea', 'des']) {
        const opt = document.createElement('option');
        desc = FIELD_DESCS[key];
        opt.value = desc;
        opt.text = desc;
        input.appendChild(opt);
      }
    }

    // data type is pre-defined
    else {
      input = document.createElement('input');
      input.type = 'text';
      input.disabled = true;
    }
    input.value = FIELD_DESCS[types[i]];
    cell = row.insertCell(-1);
    cell.appendChild(input);
  }
  byId('import-table-wrap').classList.remove('hidden');
  byId('import-modal').classList.remove('hidden');
}


/**
 * Import data from a text file.
 * @function uploadFile
 * @param {File} file - user upload file
 * @param {Object} mo - main object
 */
function uploadFile(file, mo) {
  const reader = new FileReader();
  reader.onload = function (e) {
    updateDataFromText(e.target.result, mo);
    // updateViewByData(mo);
    // toastMsg(`Read ${plural('contig', mo.data[0].length)}.`, mo.stat);
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
        updateDataFromText(this.responseText, mo);
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
 * @param {string} text - imported text
 * @param {Array} mo - main object
 * @returns {Array.<Object, Object, Object>} - decimals, categories, features
 * @todo let user specify minimum contig length threshold
 *
 * The file may contain:
 * 1. Metadata of contigs.
 * 1.1. JSON format.
 * 1.2. TSV format.
 * 2. Assembly file (i.e., contig sequences).
 */
function updateDataFromText(text, mo) {
  const impo = mo.impo;
  let obj;

  // try to parse as JSON
  try {
    obj = JSON.parse(text);
    parseObj(obj, mo.data, mo.cols);
  }
  catch (err) {

    // parse as an assembly
    if (text.charAt() === '>') {
      parseAssembly(text, mo.data, mo.cols, mo.filter);
    }

    // parse as a table
    else {
      try { [impo.names, impo.types, impo.guess] = parseTableHead(text); }
      catch (err) { toastMsg(err.message, mo.stat); }
      impo.text = text;
      fillImportTable(mo);
    }
  }
}


/**
 * Parse data as a JavaScript object.
 * @function parseObj
 * @param {Object} obj - input object
 * @param {Object} data - dataset
 * @param {Object} cols - columns
 * @description Obsolete.
 */
function parseObj(obj, data, cols) {
  // enumerate valid keys only
  // note: a direct `data = x` will break object reference
  for (let key in data) {
    if (key in obj) data[key] = obj[key];
  }
}


/**
 * Parse data table head.
 * @function parseTableHead
 * @param {string} text - multi-line tab-delimited string
 * @returns {[Array, Array, Array]} - names, types, guess
 */
function parseTableHead(text) {

  // get table table
  const head = text.split(/\r?\n/, 1)[0].split('\t');
  const m = head.length;
  if (m < 2) throw new Error('Table has no column.');

  const names = [head[0]],
        types = ['id'],
        guess = [false];
  let name, l, code, type;
  for (let i = 1; i < m; i++) {
    name = head[i];
    l = name.length;
    if (l === 0) throw new Error(`Column ${i} has no name.`);

    // look for field type code (e.g., "length|n")
    if (l > 2 & name.charAt(l - 2) == '|') {
      code = name.charAt(l - 1);
      type = FIELD_CODES[code];
      if (type === undefined) throw new Error(
        `Invalid field type code: "${code}".`);
      names.push(name.substring(0, l - 2));
      types.push(type);
      guess.push(false);
    } else {
      names.push(name);
      types.push(null);
      guess.push(true);
    }
  }

  // guess data type by first 1000 lines
  if (guess.some(Boolean)) {

    // get table body (excluding 1st line)
    const body = text.substring(text.indexOf('\n') + 1);
    if (body === '') throw new Error('Table is empty.');

    // get up to 1000 rows
    const lines = body.split(/\r?\n/, 1000);
    const last = lines.pop();
    if (last !== '') lines.push(last);
    const n = lines.length;

    // read rows
    let data = [];
    
    let row;
    for (let i = 0; i < n; i++) {
      row = lines[i].split('\t');
      if (row.length !== m) throw new Error(`Table has ${m} columns `
        `but row ${i} has ${row.length} cells.`);
      data.push(row);
    }

    // transpose data
    data = transpose(data);

    // guess data type per column
    for (let i = 1; i < m; i++) {
      if (guess[i]) types[i] = guessColumnType(data[i])[0];
    }
  }

  return [names, types, guess];
}


/**
 * Parse data table body.
 * @function parseTableBody
 * @param {Object} impo - import object
 * @returns {[Array, Array, Array]} - data, names, types
 */
function parseTableBody(impo) {
  const text = impo.text,
        names = impo.names,
        types = impo.types,
        idx = impo.idx;
  const m = names.length;

  const lines = text.split(/\r?\n/);
  const last = lines.pop();
  if (last !== '') lines.push(last);
  const n = lines.length;

  // if indices unspecified, use all columns
  if (idx.length === 0) idx = [...Array(m).keys()];

  // pre-allocate arrays
  const rawdat = Array(m).fill().map(() => Array(n).fill(''));

  // read data into columns
  let j, row;
  for (let i = 0; i < n; i++) {
    row = lines[i].split('\t');
    for (j = 0; j < m; j++) {
      rawdat[j][i] = row[idx[j]];
    }
  }

  // check if contig Ids are unique
  if ((new Set(rawdat[0])).size !== n) throw new Error(
    'Contig identifiers are not unique.');

  // add contig Ids
  const data = [rawdat[0]],
        namez = [names[0]],
        typez = [types[0]];

  // add individual columns
  let parsed, weight;
  for (let i = 1; i < m; i++) {
    switch (types[i]) {

      // numeric
      case 'num':
        parsed = parseNumColumn(rawdat[i]);
        data.push(parsed);
        namez.push(names[i]);
        typez.push(types[i]);
        break;

      // categorical
      case 'cat':
        [parsed, weight] = parseCatColumn(rawdat[i]);
        data.push(parsed);
        namez.push(names[i]);
        typez.push('cat');
        if (weight !== null) {
          data.push(weight);
          namez.push(names[i]);
          typez.push('cwt');
        }
        break;

      // feature set
      case 'fea':
        [parsed, weight] = parseFeaColumn(rawdat[i]);
        data.push(parsed);
        namez.push(names[i]);
        typez.push('fea');
        if (weight !== null) {
          data.push(weight);
          namez.push(names[i]);
          typez.push('fwt');
        }
        break;

      // descriptive
      case 'des':
        data.push(rawdat[i]);
        namez.push(names[i]);
        typez.push('des');
        break;
    }
  }
  return [data, namez, typez];
}


/**
 * Parse data as a table.
 * @function parseTable
 * @param {String} text - multi-line tab-delimited string
 * @returns {[Array, Array, Array]} - data, names, types
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
 *   id, (n)umeric, (c)ategorical, (f)eature set, (d)escriptive
 * A field name may be written as "name|code", or just "name".
 * 
 * Feature type: a cell can have multiple comma-separated features.
 *   e.g., "Firmicutes,Proteobacteria,Cyanobacteria"
 * 
 * Weight: categories / features may have a numeric suffix following a colon,
 * indicating metrics likes weight, quantity, proportion, confidence etc.
 *   e.g., "Firmicutes:80,Proteobacteria:15"
 */
function parseTable(text) {
  const lines = splitLines(text);
  const n = lines.length;
  if (n <= 1) throw new Error('Table is empty.');

  // read table header
  const heads = lines[0].split('\t');
  const m = heads.length;
  if (m < 2) throw new Error('Table has no column.');
  if ((new Set(heads)).size !== m) throw new Error(
    'Column names are not unique.');

  const data = [],
        names = [],
        types = [],
        guess = [];

  // read table body
  let arr2d = [];
  let row;
  for (let i = 1; i < n; i++) {
    row = lines[i].split('\t');
    if (row.length !== m) throw new Error(`Table has ${m} columns `
      `but row ${i + 1} has ${row.length} cells.`);
    arr2d.push(row);
  }

  // transpose table
  arr2d = transpose(arr2d);

  // initialize new dataset with Id
  if ((new Set(arr2d[0])).size !== n - 1) {
    throw new Error('Contig identifiers are not unique.');
  }
  data.push(arr2d[0]);
  names.push(heads[0]);
  types.push('id');
  guess.push(false);

  // parse and append individual columns
  for (let i = 1; i < m; i++) {
    let [name, type, parsed, ges, weight] = parseColumn(arr2d[i], heads[i]);
    data.push(parsed);
    names.push(name);
    types.push(type);
    guess.push(ges);

    // if there is weight, append as a new column
    if (weight !== null) {
      data.push(weight);
      names.push(name);
      types.push(type === 'cat' ? 'cwt' : 'fwt');
      guess.push(false);
    }
  }

  return [data, names, types, guess];
}


/** Parse a column in the data table.
 * @function parseColumn
 * @param {Array} arr - column data
 * @param {string} name - column name
 * @returns {[string, string, Array, boolean, Array]} -
 * - processed column name
 * - column data type
 * - processed column data
 * - whether data type is guessed
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
    if (i != name.length - 2) throw new Error(
      `Invalid field name: "${name}".`);
    const code = name.slice(-1);
    type = FIELD_CODES[code];
    if (type === undefined) throw new Error(
      `Invalid field type code: "${code}".`);
    name = name.slice(0, i);
  }

  // parse the column according to type, or guess its type
  let parsed, weight = null;
  let guess = false;
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
      guess = true;
  }

  return [name, type, parsed, guess, weight];
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
        weight = Array(n).fill().map(() => []);
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
 * @param {number} th - entropy threshold
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
 * processed ones exceed a threshold, and return "description".
 */
function guessColumnType(arr, th) {
  th = th || 4.75;
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
  // parsing as description based on entropy of array
  if (calcEntropy(arr) > th) return ['des', parsed, null];

  // now recognize and parse as categories
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
 * Calculates the entropy of an array
 * @function calcEntropy
 * @param {Array} arr - array of values
 * @returns {Number} entropy - entropy of array
 * @description Calculates the probability of occurence of unique values
 * in the array and then proceeds to employ the Shannon entropy formula
 * @see {@link https://en.wikipedia.org/wiki/Entropy_(information_theory)}
 */
function calcEntropy(arr) {
  const unique = {},
        len = arr.length;

  for (let i = 0; i < len; i++) {
    let val = arr[i];
    unique[val] = (unique[val] || 0) + 1;
  }

  let entropy = 0,
      current;
  const keys = Object.keys(unique),
        n = keys.length;

  for (let j = 0; j < n; j++) {
    current = unique[keys[j]] / len;
    entropy -= current * Math.log2(current);
  }

  return entropy;
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
    if (id && length >= minLen && (coverage === 0 || coverage >= minCov)) {
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

  if (df.length === 0) throw new Error(
    `No contig is ${minLen} bp or larger.`);

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
    const regex = /(\+|-)?[0-9]*(\.[0-9]*)?$|\d+/g;
    [id, length, coverage] = line.match(regex);
    return [id, coverage];
  }
  else if (format === 'megahit') {
    const regex = /(?=\d)[0-9]*(\.[0-9]*)?/g;
    [ , id, , coverage, length] = line.match(regex);
    return [id, coverage];
  }
  else if (format === null) {
    id = line.substring(1).split(' ')[0]
    return [id, coverage];
  }
  return null;
}
