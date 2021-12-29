"use strict";

/**!
 * @module numeric
 * @file Numeric calculation functions, involving arrays, matrices,
 * combination, etc.
 * @description They only operate on the parameters that are explicitly passed
 * to them. They do NOT directly access the main object OR the "document"
 * object. They are not related to any visual elements.
 */


/**
 * Calculate both min and max of a numeric array.
 * Better performance comparing to Math.min + Math.max.
 * @function arrMinMax
 * @param {number[]} arr - input array
 * @returns {[number, number]} min and max
 */
function arrMinMax(arr) {
  let val = arr[0];
  let min = val,
      max = val;
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    val = arr[i];
    min = (val < min) ? val : min;
    max = (val > max) ? val : max;
  }
  return [min, max];
}


/**
 * Calculate min of a object with numeric values.
 * @function objMin
 * @param {Object.<string, number>} obj - input object
 * @returns {[string, number]} min key-value pair
 */
function objMin(obj) {
  const arr = Object.keys(obj);
  const n = arr.length;
  let key = arr[0];
  let val = obj[key];
  let min = [key, val];
  for (let i = 1; i < n; i++) {
    key = arr[i];
    val = obj[key];
    min = (val < min[1]) ? [key, val] : min;
  }
  return min;
}


/**
 * Calculate max of a object with numeric values.
 * @function objMax
 * @param {Object.<string, number>} obj - input object
 * @returns {[string, number]} max key-value pair
 */
function objMax(obj) {
  const arr = Object.keys(obj);
  const n = arr.length;
  let key = arr[0];
  let val = obj[key];
  let max = [key, val];
  for (let i = 1; i < n; i++) {
    key = arr[i];
    val = obj[key];
    max = (val > max[1]) ? [key, val] : max;
  }
  return max;
}


/**
 * Calculate both min and max of a object with numeric values.
 * @function objMinMax
 * @param {Object.<string, number>} obj - input object
 * @returns {[[string, number], [string, number]]} min and max key-value pairs
 */
function objMinMax(obj) {
  const arr = Object.keys(obj);
  let key = arr[0];
  let val = obj[key];
  let min = [key, val],
      max = [key, val];
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    key = arr[i];
    val = obj[key];
    min = (val < min[1]) ? [key, val] : min;
    max = (val > max[1]) ? [key, val] : max;
  }
  return [min, max];
}


/**
 * Calculate sum of elements in an array.
 * @function arrSum
 * @param {number[]} arr - input array
 * @returns {number} sum
 */
function arrSum(arr) {
  let sum = 0;
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    sum += arr[i];
  }
  return sum;
}


/**
 * Calculate the mean of all elements in an array.
 * @function arrMean
 * @param {number[]} arr - input array
 * returns {number} mean
 */
function arrMean(arr) {
  // to avoid floating point err in js
  return (arrSum(arr) * 10) / (arr.length * 10);
}


/**
 * Calculate sum of products of paired elements in two arrays.
 * @function arrProdSum
 * @param {number[]} arr1 - input array
 * @param {number[]} arr2 - input array
 * @returns {number} sum of products
 */
function arrProdSum(arr1, arr2) {
  let sum = 0;
  const n = arr1.length;
  for (let i = 0; i < n; i++) {
    sum += arr1[i] * arr2[i];
  }
  return sum;
}


/**
 * Calculate the mean of all elements in an array, while using paired elements
 * in another array as weights.
 * @function arrProdMean
 * @param {number[]} arr1 - input array
 * @param {number[]} arr2 - input array
 * @returns {number} weighted mean
 */
function arrProdMean(arr1, arr2) {
  let sum12 = 0, sum2 = 0;
  const n = arr1.length;
  let a2;
  for (let i = 0; i < n; i++) {
    a2 = arr2[i];
    sum12 += arr1[i] * a2;
    sum2 += a2;
  }
  return (sum12 * 10) / (sum2 * 10);
}


/**
 * Calculate sum of elements in an array, while skipping NaN.
 * @function arrSumN
 * @param {number[]} arr - input array
 * @returns {[number, number]} sum and count of non-NaN numbers
 */
function arrSumN(arr) {
  let sum = 0;
  const n = arr.length;
  let m = 0;
  let a;
  for (let i = 0; i < n; i++) {
    a = arr[i];
    if (a === a) {
      sum += a;
      m++;
    }
  }
  return [sum, m];
}


/**
 * Calculate the mean of all elements in an array, while skipping NaN.
 * @function arrMeanN
 * @param {number[]} arr - input array
 * @returns {[number, number]} mean and count of non-NaN numbers
 */
function arrMeanN(arr) {
  const [sum, n] = arrSumN(arr);
  return [(sum * 10) / (n * 10), n];
}


/**
 * Calculate sum of products of paired elements in two arrays, while skipping
 * NaN.
 * @function arrProdSumN
 * @param {number[]} arr1 - input array
 * @param {number[]} arr2 - input array
 * @returns {[number, number, number]} sum of products of both arrays, sum of
 * elements in the second array, and count of non-NaN number pairs
 */
function arrProdSumN(arr1, arr2) {
  let sum12 = 0, sum2 = 0, m = 0;
  const n = arr1.length;
  let a1, a2;
  for (let i = 0; i < n; i++) {
    a1 = arr1[i];
    if (a1 === a1) {
      a2 = arr2[i];
      if (a2 === a2) {
        sum12 += a1 * a2;
        sum2 += a2;
        m += 1
      }
    }
  }
  return [sum12, sum2, m];
}


/**
 * Calculate the mean of all elements in an array, while using paired elements
 * in another array as weights, while skipping NaN.
 * @function arrProdMeanN
 * @param {number[]} arr1 - input array
 * @param {number[]} arr2 - input array
 * @returns {[number, number]} weighted mean and count of non-NaN number pairs
 */
function arrProdMeanN(arr1, arr2) {
  const [sum12, sum2, n] = arrProdSumN(arr1, arr2);
  return [(sum12 * 10) / (sum2 * 10), sum2, n];
}


/**
 * Calculate the mean of all elements in an array, while skipping NaN.
 * @function arrMean
 * @param {number[]} arr - input array
 * returns {number} mean
 */
function arrEqualDeep(arr1, arr2) {
  if (arr1 instanceof Array && arr2 instanceof Array) {
    const n = arr1.length;
    if (n !== arr2.length) {
      return false;
    }
    for (let i = 0; i < n; i++) {
      if (!arrEqualDeep(arr1[i], arr2[i])) {
        return false;
      }
    }
    return true;
  } else {
    return arr1 == arr2;
  }
}


/**
 * Log-transform numbers in an array.
 * @function arrLog
 * @param {number[]} arr - input array
 * @param {boolean} clip - clip or mask non-positive values
 * @return {number[]} log-transformed array
 * @description The challenge is the non-positive values. If directly applying
 * Math.log, they become -Inf (for 0) or NaN (for negative numbers). One needs
 * to deal with them.
 * @see matplotlib.scale.LogScale
 */
function arrLog(arr, clip) {
  const n = arr.length;
  let x;

  // mask non-positive numbers (i.e., drop them from array)
  if (!clip) {
    const res = [];
    for (let i = 0; i < n; i++) {
      x = arr[i];
      if (x > 0) {
        res.push(Math.log(x));
      }
    }
    return res;
  }

  // clip non-positive numbers (i.e., return a very small number)
  // this number is -1000, to be consistent with matplotlib:
  // https://github.com/matplotlib/matplotlib/blob/v3.5.1/lib/matplotlib/
  // scale.py#L236
  else {
    const res = Array(n).fill();
    for (let i = 0; i < n; i++) {
      x = arr[i];
      res[i] = (x > 0) ? Math.log(x) : -1000;
    }
    return res;
  }
}


/**
 * Min-max scaling of an array in place.
 * @param {number[]} arr - input array
 */
function arrMinMaxScale(arr) {
  const [min, max] = arrMinMax(arr);
  const range = max - min;
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    arr[i] = (arr[i] - min) / range;
  }
}


/**
 * Transpose a 2D array.
 * @function transpose
 * @param {Array.<Array>} arr2d - input 2D array
 * @returns {Array.<Array>} transposed 2D array
 */
function transpose(arr2d) {
  const n = arr2d.length;
  const m = arr2d[0].length;
  const res = Array(m).fill().map(() => Array(n));
  let j;
  for (let i = 0; i < n; i++) {
    for (j = 0; j < m; j++) {
      res[j][i] = arr2d[i][j];
    }
  }
  return res;
}


/**
 * Calculate euclidean distance between two points.
 * @function euclidean
 * @param {number[]} x - coordinate of point x
 * @param {number[]} y - coordinate of point y
 * @return {number} euclidean distance between x and y
 */
function euclidean(x, y) {
  // check x, y
  if (arrEqualDeep(x, y)) {
    return 0;
  }
  let sum = 0;
  const n = x.length;
  for (let i = 0; i < n; i++) {
    sum += (x[i] - y[i]) ** 2;
  }
  return Math.sqrt(sum);
}


/**
 * Calculate pairwise distances of all data points
 * @function pdist
 * @param {number[][]} arr - input data
 * @return {number[]} condensed distance matrix
 * @see scipy.spatial.distance.pdist
 * @description This is a deep-optimized, less flexible implementation. It uses
 * a condensed distance matrix, inline Euclidean distance calculation, etc. to
 * accelerate computation. It is beneficial because this is one of the most
 * expensive computations in the analysis.
 */
function pdist(arr) {
  const n = arr.length;
  const m = arr[0].length;

  // initiate condensed distance matrix
  const res = Array(n * (n - 1) / 2).fill();

  // intermediates
  let ii,  // part of index
      xi,  // left data point
      xj,  // right data point
      sum; // sum of square distances
  let j, k;

  for (let i = 0; i < n; i++) {
    xi = arr[i];

    // convert square matrix index to condensed matrix index
    // no more expansion so to avoid half-number arithmetic errors
    ii = n * i - i * (i + 3) / 2 - 1;

    // only calculate upper triangle
    for (j = i + 1; j < n; j++) {
      xj = arr[j];

      // calculate Euclidean distance
      // written so to avoid expensive function calls, otherwise it can be:
      // res[ii + j] = euclidean(xi, xj);
      sum = 0;
      for (k = 0; k < m; k++) {
        sum += (xi[k] - xj[k]) ** 2;
      }
      res[ii + j] = Math.sqrt(sum);
    }
  }
  return res;
}


/**
 * Convert a categorical variable to incremental integers.
 * @param {string[]} arr - input array
 * @returns {number[], string[]} factorized variable and unique values
 * @description Categories are coded as 0, 1, 2, 3... based on the order of
 * occurrence. Missing values (empty strings) are coded as -1.
 * @see pandas.factorize
 */
function factorize(arr) {
  const n = arr.length;
  const codes = Array(n).fill(NaN);
  const uniques = new Map();
  let code = -1;
  let cat;
  for (let i = 0; i < n; i++) {
    cat = arr[i];
    if (cat) {
      if (!uniques.has(cat)) {
        uniques.set(cat, ++code);
        codes[i] = code;
      } else codes[i] = uniques.get(cat);
    } else codes[i] = -1;
  }
  return [codes, [...uniques.keys()]];
}


/**
 * Return the occurrence of each entry in the input data.
 * @function bincount
 * @param {number[]} arr - input array
 * @return {number[]} the occurrence of each entry in the input data
 * @description Input data must consist of incremental integers (0, 1, 2,...).
 * Output is an array with index as input data and value as frequency.
 * @see numpy.bincount
 */
function bincount(arr) {
  const res = Array(Math.max(...arr) + 1).fill(0);
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    res[arr[i]]++;
  }
  return res;
}


/**
 * Bin data points into even intervals, i.e., a histogram
 * @function histogram
 * @param {number[]} x - input data
 * @param {number[]} [n=10] - number of bins
 * @return {[number[], number[]]} bins and edges
 * @see numpy.histogram
 */
function histogram(x, n) {
  n = n || 10;
  const [min, max] = arrMinMax(x);
  const size = (max - min) / n;
  const hist = Array(n).fill(0);
  const l = x.length;
  for (let i = 0; i < l; i++) {
    hist[Math.min(((x[i] - min) / size) >> 0, n - 1)]++;
  }
  const edge = Array(n + 1).fill(0);
  for (let i = 0; i < n + 1; i++) {
    edge[i] = min + size * i;
  }
  return [hist, edge];
}


/**
 * Return array of unique elements from the input array.
 * @function unique
 * @param {number[]} arr - the input array
 * @param {boolean} returnInv - if true, return the indices of of the unique
 * array, default to false
 * @return {number[]} the unique array and optional indices of unique array
 * @see numpy.unique
 */
function unique(arr, returnInv=false) {
  const n = arr.length;
  const res = Array.from(new Set(arr));
  if (!returnInv) return res;
  const m = res.length;
  let inv = Array(n).fill();
  let j;
  for (let i = 0; i < n; i++) {
    for (j = 0; j < m; j++) {
      if (arr[i] === res[j]) {
        inv[i] = j;
      }
    }
  }
  return [res, inv];
}


/**
 * Calculate the factorial divided by another factorial iteratively.
 * @function factorial
 * @param {number} n - the input integer
 * @param {number} m - the input integer, default to 1
 * @return {number} the factorial quotient of 2 integers
 */
function factorial(n, m=1) {
  if (!Number.isInteger(n) || (m != undefined && !Number.isInteger(m))) {
    return 0;
  }
  let res = m;
  for (let i = m + 1; i <= n; i++) {
    res *= i;
  }
  return res;
}


/**
 * Calculate the combination of choosing m iterms from n iterms.
 * @function comb
 * @param {number} n - the input integer
 * @param {number} m - the input integer of elements taken
 * @return {number} the combination of n choose m
 * @see scipy.special.comb
 */
function comb(n, m) {
  if (!Number.isInteger(n) || (m != undefined && !Number.isInteger(m))) {
    return 0;
  }
  return factorial(n, n - m + 1) / factorial(m);
}


/**
 * Generate an identity matrix.
 * @function idMat
 * @param {number} n - size of the matrix
 * @return {number[]} the identity matrix
 * @description An identity matrix is a square matrix with 1 on the diagonal
 * and 0 elsewhere.
 * @see {@link https://en.wikipedia.org/wiki/Identity_matrix}
 * @see numpy.identity
 */
function idMat(n) {
  const res = Array(n).fill().map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    res[i][i] = 1;
  }
  return res;
}


/**
 * Compute the inverse of a matrix.
 * @function matInv
 * @param {number[]} x - the input matrix
 * @return {number[]} inverse of the input matrix
 * @see {@link https://en.wikipedia.org/wiki/Invertible_matrix}
 * @see numpy.linalg.inv
 */
function matInv(x) {
  if (typeof(x) === 'number') {
    return 1 / x;
  }
  let r = x.length;
  let c = x[0].length;
  let a = [];
  for (let i = 0; i < r; i++) { // deep copy the input array
    a[i] = x[i].slice();
  }
  let res = idMat(r);
  let k, Ii, Ij, temp;

  // row reduction
  for (let i = 0; i < c; i++) {
    let idx = i;
    let max = a[i][i];
    for (let j = i; j < r; j++) {
      let cur = Math.abs(a[j][i]);
      if (cur > max) { // find max element and its index in the ith column
        idx = j;
        max = cur;
      }
    }

    // row exchange
    if (idx !== i) {
      temp = a[idx];
      a[idx] = a[i];
      a[i] = temp;
      temp = res[idx];
      res[idx] = res[i];
      res[i] = temp;
    }
    let Aj = a[i];
    let Ij = res[i];

    let f = Aj[i];
    for (let j = i; j < c; j++) {
      Aj[j] /= f;
    }
    for (let j = 0; j < c; j++) {
      Ij[j] /= f;
    }

    // eleminate non-zero values on other rows at column c
    for (let j = 0; j < r; j++) {
      if (j !== i) {
        let Ai = a[j];
        Ii = res[j];
        f = Ai[i];
        for (k = i + 1; k < c; k++) {
          Ai[k] -= Aj[k] * f;
        }
        for (k = c - 1; k > 0; k--) {
          Ii[k] -= Ij[k] * f;
          k--;
          Ii[k] -= Ij[k] * f;
        }
        if (k===0) {
          Ii[0] -= Ij[0] * f;
        }
      }
    }
  }
  return res;
}
