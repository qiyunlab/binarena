"use strict";

/**!
 * @module util
 * @file Utilities - functions for general purposes.
 * They only operate on the parameters that are explicitly passed to them.
 * They do NOT directly access the master object OR the "document" object.
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
 * Calculate both min and max of a numeric array.
 * Better performance comparing to Math.min + Math.max.
 * @function arrMinMax
 * @param {number[]} arr - input array
 * @returns {[number, number]} min and max
 */
function arrMinMax(arr) {
  var val = arr[0];
  var min = val;
  var max = val;
  for (var i = 1; i < arr.length; i++) {
    var val = arr[i];
    min = (val < min) ? val : min;
    max = (val > max) ? val : max;
  }
  return [min, max];
}


/**
 * Calculate both min and max of a object with numeric values.
 * @function objMinMax
 * @param {Object.<string, number>} obj - input object
 * @returns {[[string, number], [string, number]]} min and max key-value pairs
 */
function objMinMax(obj) {
  var arr = Object.keys(obj);
  var key = arr[0]
  var val = obj[key];
  var min = [key, val];
  var max = [key, val];
  for (var i = 1; i < arr.length; i++) {
    key = arr[i];
    val = obj[key];
    min = (val < min[1]) ? [key, val] : min;
    max = (val > max[1]) ? [key, val] : max;
  }
  return [min, max];
}


/**
 * Calculate sum of numbers in an array.
 * @function arrSum
 * @param {number[]} arr - input array
 * @returns {number} sum
 */
function arrSum(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}


/**
 * Calculate sum of products of paired numbers in two arrays.
 * @function arrProdSum
 * @param {number[]} arr1 - input array
 * @param {number[]} arr2 - input array
 * @returns {number} sum of products
 */
function arrProdSum(arr1, arr2) {
  var sum = 0;
  for (var i = 0; i < arr1.length; i++) {
    sum += arr1[i] * arr2[i];
  }
  return sum;
}


/**
 * Transpose a 2D array.
 * @function transpose
 * @param {Array.<Array>} df - input 2D array
 * @returns {Array.<Array>} transposed 2D array
 */
function transpose(df) {
  var res = [];
  var n = df[0].length;
  for (var i = 0; i < n; i++) {
    res.push([]);
  }
  for (var i = 0; i < df.length; i++) {
    for (var j = 0; j < n; j++) {
      res[j].push(df[i][j]);
    }
  }
  return res;
}


/**
 * Scale a number by key
 * @function scaleNum
 * @param {number} num - number to scale
 * @param {string|number} scale - scale name or power
 * @throws Error if scale is invalid
 * @returns {number} scaled number
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
 * Check if a point is within a polygon.
 * @function pnpoly
 * @param {number} x - x-coordinate of point
 * @param {number} y - y-coordinate of point
 * @param {{x: number, y: number}[]} polygon - x- and y-coordinates of vertices
 * of polygon
 * @returns {boolean} whether point is within polygon
 * @description Reimplemented following W Randolph Franklin:
 * PNPOLY - Point Inclusion in Polygon Test
 * @see {@link https://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/
 * pnpoly.html}
 */
function pnpoly(x, y, polygon) {
  var res = false;
  var n = polygon.length;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = polygon[i].x,
      yi = polygon[i].y;
    var xj = polygon[j].x,
      yj = polygon[j].y;
    if (((yi > y) != (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      res = !res;
    }
  }
  return res;
}
