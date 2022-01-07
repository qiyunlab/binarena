"use strict";

/**!
 * @module util
 * @file Utilities - functions for general purposes.
 * @description They only operate on the parameters that are explicitly passed
 * to them. They do NOT directly access the main object OR the "document"
 * object. They are not related to any visual elements.
 */


/**
 * Split text into lines.
 * @function splitLines
 * @param {string} text - multi-line string
 * @returns {string[]} split text
 */
function splitLines(text) {
  return text.replace(/[\r\n]+$/, '').split(/[\r\n]+/);
}


/**
 * Capitalize a string.
 * @function capital
 * @param {string} text - multi-line string
 * @returns {string[]} split text
 */
function capital(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


/**
 * Format a number to given precision and strip trailing zeros.
 * @function formatNum
 * @param {number} num - number to format
 * @param {number} digits - number of digits to retain
 * @returns {string} formatted number
 */
function formatNum(num, digits) {
  return digits ? num.toPrecision(digits || 0).replace(/\.?0+$/, '') : num;
}


/**
 * Convert hex to RGB.
 * @function hexToRgb
 * @param {string} hex - hex code of color
 * @returns {string} r, g, b of color
 * @see {@link https://stackoverflow.com/questions/5623838/}
 */
function hexToRgb(hex) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255,
        g = (bigint >> 8) & 255,
        b = bigint & 255;
  return [r, g, b].join();
}


/**
 * Round a number to given precision.
 * @function roundNum
 * @param {number} num - number to format
 * @param {number} digits - number of digits after the decimal point
 * @returns {number} rounded number
 * @see {@link https://stackoverflow.com/questions/11832914/}
 */
function roundNum(num, digits) {
  return Number(Math.round(num + 'e' + digits) + 'e-' + digits);
}


/**
 * Scale a number by key.
 * @function scaleNum
 * @param {number} num - number to scale
 * @param {string|number} scale - scale name or power
 * @throws if scale is invalid
 * @returns {number} scaled number
 */
function scaleNum(num, scale) {
  if (scale == null) {
    return num;
  } else if (typeof(scale) === 'number') {
    return Math.pow(num, scale);
  } else if (typeof(scale) === 'string') {
    switch (scale) {
      case 'none':
        return num;
      case 'rank': // cannot rank a single number
        return NaN;
      case 'square':
        return num ** 2;
      case 'sqrt':
        return Math.sqrt(num);
      case 'cube':
        return num ** 3;
      case 'cbrt':
        return Math.cbrt(num);
      case '4pow':
        return num ** 4;
      case '4rt':
        return num ** 0.25;
      case 'log':
        return Math.log(num);
      case 'exp':
        return Math.exp(num);
      case 'logit':
        return Math.log(num / (1 - num));
      case 'expit':
        return 1 / (1 + Math.exp(-num));
      case 'asin':
        return Math.asin(Math.sqrt(num));
      case 'sin':
        return Math.sign(num) * Math.sin(num) ** 2;
      default:
        throw `Error: Invalid scale name "${scale}".`;
    }
  } else {
    throw 'Error: Invalid scale type.';
  }
}


/**
 * Scale an array by key.
 * @function scaleArr
 * @param {number[]} arr - array to scale
 * @param {string|number} scale - scale name or power
 * @returns {number[]} scaled array 
 * @throws if scale is invalid
 */
function scaleArr(arr, scale) {
  const n = arr.length;
  const res = Array(n).fill(NaN);
  if (scale == null) {
    return arr;
  } else if (typeof(scale) === 'number') {
    for (let i = 0; i < n; i++) res[i] = arr[i] ** scale;
  } else if (typeof(scale) === 'string') {
    let num;
    switch (scale) {
      case 'none':
        return arr;
      case 'rank':
        return rankdata(arr);
      case 'square':
        for (let i = 0; i < n; i++) res[i] = arr[i] ** 2;
        break;
      case 'sqrt':
        for (let i = 0; i < n; i++) res[i] = Math.sqrt(arr[i]);
        break;
      case 'cube':
        for (let i = 0; i < n; i++) res[i] = arr[i] ** 3;
        break;
      case 'cbrt':
        for (let i = 0; i < n; i++) res[i] = Math.cbrt(arr[i]);
        break;
      case '4pow':
        for (let i = 0; i < n; i++) res[i] = arr[i] ** 4;
        break;
      case '4rt':
        for (let i = 0; i < n; i++) res[i] = arr[i] ** 0.25;
        break;
      case 'log':
        for (let i = 0; i < n; i++) res[i] = Math.log(arr[i]);
        break;
      case 'exp':
        for (let i = 0; i < n; i++) res[i] = Math.exp(arr[i]);
        break;
      case 'logit':
        for (let i = 0; i < n; i++) {
          num = arr[i];
          res[i] = Math.log(num / (1 - num));
        }
        break;
      case 'expit':
        for (let i = 0; i < n; i++) res[i] = 1 / (1 + Math.exp(-arr[i]));
        break;
      case 'asin':
        for (let i = 0; i < n; i++) res[i] = Math.asin(Math.sqrt(arr[i]));
        break;
      case 'sin':
        for (let i = 0; i < n; i++) {
          num = arr[i];
          res[i] = Math.sign(num) * Math.sin(num) ** 2;
        }
        break;
      default:
        throw `Error: Invalid scale name "${scale}".`;
    }
  } else {
    throw 'Error: Invalid scale type.';
  }
  return res;
}


/**
 * Revert a scale code.
 * @function unscale
 * @param {string|number} scale - scale name or power
 * @throws if scale is invalid
 * @returns {number} scaled number
 */
function unscale(scale) {
  const dict = {
    'none':   'none',
    'rank':   'none', // cannot unscale a rank
    'square': 'sqrt',
    'sqrt':   'square',
    'cube':   'cbrt',
    'cbrt':   'cube',
    '4pow':   '4rt',
    '4rt':    '4pow',
    'log':    'exp',
    'exp':    'log',
    'logit':  'expit',
    'expit':  'logit',
    'asin':   'sin',
    'sin':    'asin'
  };
  if (scale == null) {
    return null;
  } else if (typeof(scale) === 'number') {
    return 1 / scale;
  } else if (typeof(scale) === 'string') {
    if (scale in dict) return dict[scale];
  } else {
    throw 'Error: Invalid scale type.';
  }
}


/**
 * Check of all elements in an array are identical.
 * @function arrIdent
 * @param {Array} arr - input array
 * @returns {boolean} whether all identical
 */
function arrIdent(arr) {
  const x0 = arr[0];
  return arr.every(x => x === x0);
}


/**
 * Filter an array to unique elements while keeping order.
 * @function arrUniq
 * @param {Array} arr - input array
 * @returns {Object} output object
 * @see {@link https://stackoverflow.com/questions/9229645/}
 */
function arrUniq(arr) {
  const res = [];
  const used = {};
  const n = arr.length;
  let j = 0;
  let item;
  for (let i = 0; i < n; i++) {
    item = arr[i];
    if (used[item] !== 1) {
      used[item] = 1;
      res[j++] = item;
    }
  }
  return res;
}


/**
 * Group indices of an array by unique elements.
 * @function arrGroupBy
 * @param {Array} arr - input array
 * @returns {Object} output object
 */
function arrGroupBy(arr) {
  const res = {};
  const n = arr.length;
  let item;
  for (let i = 0; i < n; i++) {
    item = arr[i];
    if (item in res) res[item].push(i);
    else res[item] = [i];
  }
  return res;
}


/**
 * Group indices of an array by unique elements, while skipping false values
 * @function arrGroupByF
 * @param {Array} arr - input array
 * @returns {Object} output object
 */
 function arrGroupByF(arr) {
  const res = {};
  const n = arr.length;
  let item;
  for (let i = 0; i < n; i++) {
    item = arr[i];
    if (item) {
      if (item in res) res[item].push(i);
      else res[item] = [i];
    }
  }
  return res;
}


/**
 * Convert an array to an object of nulls.
 * @function arr2obj
 * @param {Array} arr - input array
 * @returns {Object} output object
 */
function arr2obj(arr) {
  const n = arr.length;
  const res = {};
  for (let i = 0; i < n; i++) {
    res[arr[i]] = null;
  }
  return res;
}


/**
 * List column names of a specific type.
 * @function listColsByType
 * @param {Object} cols - cols object
 * @param {string} type - column type
 * @returns {Array} column names
 */
function listColsByType(cols, type) {
  const names = cols.names,
        types = cols.types;
  const n = names.length;
  const res = [];
  for (let i = 0; i < n; i++) {
    if (types[i] === type) {
      res.push(names[i]);
    }
  }
  return res;
}


/**
 * List categories and their frequencies from a category-type column.
 * @function listCats
 * @param {Array} arr - categorical column
 * @returns {Object} category to frequency map
 */
function listCats(arr) {
  const res = {};
  const n = arr.length;
  let cat;
  for (let i = 0; i < n; i++) {
    cat = arr[i];
    if (cat) {
      res[cat] = (res[cat] || 0) + 1;
    }
  }
  return res;
}


/**
 * List categories and frequencies from a categorical column as weighted by a
 * numeric column.
 * @function listCatsW
 * @param {Array} arr1 - categorical column
 * @param {Array} arr2 - numeric column
 * @returns {[Object, number]} category to weighted frequency map, sum of
 * weights
 * @description NaN weights are skipped.
 */
 function listCatsW(arr1, arr2) {
  const res = {};
  const n = arr1.length;
  let cat, wt;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    cat = arr1[i];
    wt = arr2[i];
    if (cat && wt === wt) {
      res[cat] = (res[cat] || 0) + wt;
    }
    sum += wt;
  }
  return [res, sum];
}


/**
 * List features and their frequencies from a feature-type column.
 * @function listFeas
 * @param {Array} arr - feature set column
 * @returns {Object} feature to frequency map
 */
function listFeas(arr) {
  const res = {};
  const n = arr.length;
  let fea;
  for (let i = 0; i < n; i++) {
    for (fea of arr[i]) {
      res[fea] = (res[fea] || 0) + 1;
    };
  }
  return res;
}


/**
 * Generate a string to summarize a feature frequency map.
 * @function summFeatures
 * @param {Array} arr - feature set column
 * @returns {string} features sorted by frequency in descending order, prefixed
 * by frequency in parentheses if frequency is not 1.
 * @example 'K00001(5), K00023(2), K01456, K00789'
 */
function summFeatures(arr) {
  return Object.entries(listFeas(arr))
    .sort(([, a],[, b]) => b - a)
    .map(x => x[1] === 1 ? x[0] : `${x[0]}(${x[1]})`)
    .join(', ');
}


/**
 * Get the maximum number of digits after the decimal point in a number-type
 * column.
 * @function maxDecimals
 * @param {Array} arr - number-type column
 * @returns {number} - number of digits
 */
function maxDecimals(arr) {
  let res = 0;
  arr.forEach(datum => {
    if (datum !== null && (datum % 1) != 0) {
      res = Math.max(res, datum.toString().split('.')[1].length);
    }
  });
  return res;
}


/**
 * Return class name if present
 * @function checkClassName
 * @param {Object} element - DOM to check
 * @param {Array.<string>} classes - candidate class names
 */
function checkClassName(element, classes) {
  for (let c of classes) {
    if (element.classList.contains(c)) return c;
  }
}


/**
 * Extend an 11-stop hex palette to 101 RGB values
 * @function palette11to101
 * @param {Object} palette - array of 11 hexes
 * @returns {string[]} - array of 101 "r,g,b"s
 */
function palette11to101(palette) {
  const rgbs = [[], [], []];
  let i, j, k, step, rgb;
  for (i = 0; i < 11; i++) {
    for (j = 0; j < 3; j++) {
      rgbs[j].push(parseInt(palette[i].substring(j * 2, j * 2 + 2), 16));
    }
  }
  const res = [];
  for (i = 0; i < 10; i++) {
    res.push([rgbs[0][i], rgbs[1][i], rgbs[2][i]].join());
    step = (rgbs[0][i + 1] - rgbs[0][i]) / 10;
    for (j = 0; j < 9; j++) {
      rgb = [];
      for (k = 0; k < 3; k++) {
        rgb.push(Math.round(rgbs[k][i] + step * j));
      }
      res.push(rgb.join());
    }
  }
  res.push([rgbs[0][10], rgbs[1][10], rgbs[2][10]].join());
  return res;
}


/**
 * Return the number of elements that compares true in an array.
 * @function countTrue
 * @param {Array} arr - input array
 * @returns {number} number of true elements
 * @description Useful to check how many contigs are set in `picked`, `masked`
 * and `binned` arrays. The same result can be achieved using arr.filter(
 * Boolean).length, but I guess that this function is faster.
 */
function countTrue(arr) {
  const n = arr.length;
  let res = 0;
  for (let i = 0; i < n; i++) {
    if (arr[i]) res++;
  }
  return res;
}


/**
 * Return the indices of elements that compares true in an array.
 * @function indexTrue
 * @param {Array} arr - input array
 * @returns {number} indices of true elements
 */
 function indexTrue(arr) {
  const n = arr.length;
  const res = [];
  for (let i = 0; i < n; i++) {
    if (arr[i]) res.push(i);
  }
  return res;
}


/**
 * Generate a string to describe a display item with scale.
 * @function dispNameScale
 * @param {Object} v - view object of the item
 * @param {string[]} names - column names
 * @returns {string} - result string
 */
function dispNameScale(v, names) {
  const idx = v.i;
  if (!idx) return '';
  const name = names[idx];
  const scale = v.scale;
  if (scale === 'none') return name;
  return `${name} (${scale})`;
}
