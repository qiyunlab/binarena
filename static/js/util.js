"use strict";

/**!
 * @module util
 * @file Utilities - functions for general purposes.
 * They only operate on the parameters that are explicitly passed to them.
 * They do NOT directly access the main object OR the "document" object.
 * They are not related to any visual elements.
 */


/**
 * @summary String operations
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
 * Format a number.
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
  var bigint = parseInt(hex, 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;
  return [r, g, b].join();
}


/**
 * @summary Arithmetics
 */


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
 * @todo
 */
function scaleNum(num, scale) {
  if (scale == null) {
    return num;
  } else if (typeof(scale) === 'number') {
    return Math.pow(num, scale);
  } else if (typeof(scale) === 'string') {
    switch(scale) {
      case 'none':
        return num;
      case 'square':
        return Math.pow(num, 2);
      case 'sqrt':
        return Math.sqrt(num);
      case 'cube':
        return Math.pow(num, 3);
      case 'cbrt':
        return Math.pow(num, (1 / 3));
      case 'log':
        return Math.log(num);
      case 'log2':
        return Math.log(num) / Math.LN2;
      case 'log10':
        return Math.log(num) / Math.LN10;
      case 'exp':
        return Math.exp(num);
      case 'exp2':
        return Math.pow(2, num);
      case 'exp10':
        return Math.pow(10, num);
      default:
        throw 'Error: invalid scale name "' + scale + '".';
    }
  } else {
    throw 'Error: invalid scale type';
  }
}


/**
 * Revert a scale code.
 * @function unscale
 * @param {string|number} scale - scale name or power
 * @throws if scale is invalid
 * @returns {number} scaled number
 * @todo
 */
function unscale(scale) {
  var dict = {
    'none': 'none',
    'square': 'sqrt',
    'sqrt': 'square',
    'cube': 'cbrt',
    'cbrt': 'cube',
    'log': 'exp',
    'exp': 'log',
    'log2': 'exp2',
    'exp2': 'log2',
    'log10': 'exp10',
    'exp10': 'log10'
  };
  if (scale == null) {
    return null;
  } else if (typeof(scale) === 'number') {
    return 1 / scale;
  } else if (typeof(scale) === 'string') {
    if (scale in dict) return dict[scale];
  } else {
    throw 'Error: invalid scale type';
  }
}


/**
 * Filter an array to unique elements while keeping order.
 * @function arr2obj
 * @param {Array} arr - input array
 * @returns {Object} - output object
 * @see {@link https://stackoverflow.com/questions/9229645/}
 */
function arrUniq(arr) {
  var res = [];
  var used = {};
  var n = arr.length;
  var j = 0;
  var item;
  for (var i = 0; i < n; i++) {
    item = arr[i];
    if (used[item] !== 1) {
      used[item] = 1;
      res[j++] = item;
    }
  }
  return res;
}


/**
 * Convert an array to an object of nulls.
 * @function arr2obj
 * @param {Array} arr - input array
 * @returns {Object} - output object
 */
function arr2obj(arr) {
  var n = arr.length;
  var res = {}
  for (var i = 0; i < n; i++) {
    res[arr[i]] = null;
  }
  return res;
}


/**
 * List categories and their frequencies from a category-type column.
 * @function listCats
 * @param {Array} arr - category-type column
 * @returns {Object} - category to frequency map
 */
function listCats(arr) {
  var res = {};
  arr.forEach(function (datum) {
    if (datum !== null) {
      if (datum[0] in res) res[datum[0]] ++;
      else res[datum[0]] = 1;
    }
  });
  return res;
}


/**
 * List features and their frequencies from a feature-type column.
 * @function listFeats
 * @param {Array} arr - feature-type column
 * @returns {Object} - feature to frequency map
 */
function listFeats(arr) {
  var res = {};
  arr.forEach(function (datum) {
    if (datum !== null) {
      Object.keys(datum).forEach(function (key) {
        if (key in res) res[key] ++;
        else res[key] = 1;
      });
    }
  });
  return res;
}


/**
 * Get the maximum number of digits after the decimal point in a number-type
 * column.
 * @function maxDecimals
 * @param {Array} arr - number-type column
 * @returns {number} - number of digits
 */
function maxDecimals(arr) {
  var res = 0;
  arr.forEach(function (datum) {
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
  for (var i = 0; i < classes.length; i++) {
    if (element.classList.contains(classes[i])) return classes[i];
  }
}


/**
 * Extend an 11-stop hex palette to 101 RGB values
 * @function palette11to101
 * @param {Object} palette - array of 11 hexes
 * @returns {string[]} - array of 101 "r,g,b"s
 */
function palette11to101(palette) {
  var rgbs = [[], [], []];
  var i, j, k, step, rgb;
  for (i = 0; i < 11; i++) {
    for (j = 0; j < 3; j++) {
      rgbs[j].push(parseInt(palette[i].substring(j * 2, j * 2 + 2), 16))
    }
  }
  var res = [];
  for (i = 0; i < 10; i++) {
    res.push([rgbs[0][i], rgbs[1][i], rgbs[2][i]].join());
    step = (rgbs[0][i + 1] - rgbs[0][i]) / 10;
    for (j = 0; j < 9; j++) {
      rgb = [];
      for (k = 0; k < 3; k++) {
        rgb.push(Math.round(rgbs[k][i] + step * j))
      }
      res.push(rgb.join());
    }
  }
  res.push([rgbs[0][10], rgbs[1][10], rgbs[2][10]].join());
  return res;
}
