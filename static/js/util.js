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
 * Format number.
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
 * Calculate the average of all elements in the input array.
 * @function arrMean
 * @param {number[]} arr - input array
 * returns {number} mean
 */
function arrMean(arr) {
  // to avoid floating point err in js
  return (arrSum(arr) * 10) / (arr.length * 10);
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
 * Recursively check whether two arrays are equal.
 * @function arrEqual
 * @param {number[]} arr1 - input array
 * @param {number[]} arr2 - input array
 * @return {boolean} true if input arrays are equal, false otherwise 
 */
function arrEqual(arr1, arr2) {
  if (arr1 instanceof Array && arr2 instanceof Array) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    for (let i = 0; i < arr1.length; i++) {
      if (!arrEqual(arr1[i], arr2[i])) {
        return false;
      }
    }
    return true;
  } else {
    return arr1 == arr2;
  }
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
 * Check if a circle and a rectangle collide
 * @function rectCircleColliding
 * @param {Object.<x: number, y: number, r: number>} circle - circle
 * @param {Object.<x: number, y: number, w: number, h: number>} rect - rectangle
 * @description adopted from markE's answer at:
 * @see {@link: https://stackoverflow.com/questions/21089959/}
 */
function rectCircleColliding(circle, rect){
  var distX = Math.abs(circle.x - rect.x - rect.w / 2);
  var distY = Math.abs(circle.y - rect.y - rect.h / 2);

  if (distX > (rect.w / 2 + circle.r)) return false;
  if (distY > (rect.h / 2 + circle.r)) return false;

  if (distX <= (rect.w / 2)) return true;
  if (distY <= (rect.h / 2)) return true;

  var dx = distX-rect.w / 2;
  var dy = distY-rect.h / 2;
  return (dx * dx + dy * dy <= (circle.r * circle.r));
}


/**
 * Check if a point is within a polygon.
 * @function pnpoly
 * @param {number} x - x-coordinate of point
 * @param {number} y - y-coordinate of point
 * @param {{x: number, y: number}[]} polygon - x- and y-coordinates of vertices
 * of polygon
 * @returns {boolean} whether point is within polygon
 * @description Reimplemented following:
 * PNPOLY - Point Inclusion in Polygon Test
 * @author W Randolph Franklin:
 * {@link https://wrf.ecse.rpi.edu//Research/Short_Notes/pnpoly.html}
 * @license MIT license
 * @see licenses/pnpoly.txt
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
  for (var i = 0; i < 11; i++) {
    for (var j = 0; j < 3; j++) {
      rgbs[j].push(parseInt(palette[i].substr(j * 2, 2), 16))
    }
  }
  var res = [];
  for (var i = 0; i < 10; i++) {
    res.push([rgbs[0][i], rgbs[1][i], rgbs[2][i]].join());
    var step = (rgbs[0][i + 1] - rgbs[0][i]) / 10;
    for (var j = 0; j < 9; j++) {
      var rgb = [];
      for (var k = 0; k < 3; k++) {
        rgb.push(Math.round(rgbs[k][i] + step * j))
      }
      res.push(rgb.join());
    }
  }
  res.push([rgbs[0][10], rgbs[1][10], rgbs[2][10]].join());
  return res;
}
