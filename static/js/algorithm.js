"use strict";

/**!
 * @module algorithm
 * @file Advanced algorithms.
 * @description These are algorithms designed to achieve specific goals, as in
 * contrast to the general functions in "numeric.js". They only operate on the
 * parameters that are explicitly passed to them. They do NOT access the main
 * object or the "document" object. They are not related to the interface.
 */


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
  let res = false;
  const n = polygon.length;
  let xi, yi, xj, yj;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    xi = polygon[i].x;
    yi = polygon[i].y;
    xj = polygon[j].x;
    yj = polygon[j].y;
    if (((yi > y) != (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      res = !res;
    }
  }
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
  const distX = Math.abs(circle.x - rect.x - rect.w / 2),
        distY = Math.abs(circle.y - rect.y - rect.h / 2);

  if (distX > (rect.w / 2 + circle.r)) return false;
  if (distY > (rect.h / 2 + circle.r)) return false;

  if (distX <= (rect.w / 2)) return true;
  if (distY <= (rect.h / 2)) return true;

  const dx = distX - rect.w / 2,
        dy = distY - rect.h / 2;
  return (dx ** 2 + dy ** 2 <= (circle.r ** 2));
}


/**
 * Compute the silhouette coefficient for each contig.
 * @function silhouetteSample
 * @param {number[]} x - input data
 * @param {number[]} label - labels of input data
 * @param {number[]} dist - pairwise distances among input data
 * @return {number[]} silhouette coefficient of each contig
 * @description The silhouette coefficient measures how similar a contig is to
 * other contigs in the same bin, as in contrast to contigs in other bins.
 * @see {@link https://en.wikipedia.org/wiki/Silhouette_(clustering)}
 * @description It requires calculation of a distance matrix of all contigs,
 * which is expensive. Therefore it is pre-calculated, stored, and fed to the
 * current function.
 */
function silhouetteSample(x, label, dist) {
  const n = x.length;
  const count = bincount(label); // bin sizes
  const c = count.length;

  // intermediates
  let distIn;  // intra-bin distance
  let distOut; // inter-bin distances
  let li;      // contig label
  let ii;      // index cache (to accelerate calculation)
  let idx;     // distance index
  let j, k;    // counters

  // calculate silhouette for each contig
  const res = Array(n).fill();
  for (let i = 0; i < n; i++) {
    li = label[i];
    if (count[li] > 1) {
      distIn = 0;
      distOut = Array(c).fill(0);
      ii = n * i - i * (i + 3) / 2 - 1;
      for (j = 0; j < n; j++) {

        // determine index in condensed distance matrix
        if (i < j) {
          idx = ii + j;
        } else if (i > j) {
          idx = n * j - j * (j + 3) / 2 + i - 1;
        } else {
          continue;
        }

        // determine intra- or inter-bin distance
        if (li === label[j]) {
          distIn += dist[idx];
        } else {
          distOut[label[j]] += dist[idx];
        }
      }

      // mean inter-bin distance for each other bin
      for (k = 0; k < c; k++) {
        distOut[k] /= count[k];
      }

      // minimum inter-bin distance
      distOut = Math.min.apply(null, distOut.filter(Boolean));

      // mean intra-bin distance
      distIn /= (count[li] - 1);

      // silhouette coefficient
      res[i] = (distOut - distIn) / Math.max(distOut, distIn);

    } else { // only one contig
      res[i] = 0;
    }
  } // end for i
  return res;
}


/**
 * Compute the silhouette coefficient for each contig.
 * @function silhouetteSample2D
 * @param {number[]} x - input data
 * @param {number[]} label - labels of input data
 * @param {number[]} dist - pairwise distances among input data
 * @return {number[]} silhouette coefficient of each contig
 * @description This is the 2D version of the function. It takes a 2D square
 * distance matrix instead of a 1D condensed distance matrix. It is slower
 * but it can handle larger datasets.
 */
 function silhouetteSample2D(x, label, dist) {
  const n = x.length;
  const count = bincount(label);
  const c = count.length;
  let distIn, distOut, li, j;
  const res = Array(n).fill();
  for (let i = 0; i < n; i++) {
    li = label[i];
    if (count[li] > 1) {
      distIn = 0;
      distOut = Array(c).fill(0);
      for (j = 0; j < n; j++) {
        if (li === label[j]) distIn += dist[i][j];
        else distOut[label[j]] += dist[i][j];
      }
      for (j = 0; j < c; j++) distOut[j] /= count[j];
      distOut = Math.min.apply(null, distOut.filter(Boolean));
      distIn /= (count[li] - 1);
      res[i] = (distOut - distIn) / Math.max(distOut, distIn);
    } else res[i] = 0;
  }
  return res;
}


/**
 * @summary Adjusted Rand index (ARI)
 * @description The adjusted Rand index (ARI) measures the similarity between
 * two binning plans (sets of bins).
 * @see {@link https://en.wikipedia.org/wiki/Rand_index}
 */


/**
 * Return the coordinate matrix.
 * @function coordinateMatrix
 * @param {number[]} row - the array of row indices
 * @param {number[]} col - the array of column indices
 * @param {number[]} data - the entries of the matrix
 * @param {number[]} shape - the shape of coordinate matrix
 * @param {boolean} sparse - true to return a sparse matrix, default to false
 * @return {number[]} the coordinate matrix
 */
function coordinateMatrix(row, col, data, shape, sparse=false) {
  const n0 = shape[0],
        n1 = shape[1];
  const res = Array(n0).fill().map(() => Array(n1).fill(0));
  const n = row.length;
  let i, j;
  for (i = 0; i < n; i++) {
    res[row[i]][col[i]] += data[i];
  }
  if (!sparse) return res;
  const key = [],
        value = [];
  for (i = 0; i < n0; i++) {
    for (j = 0; j < n1; j++) {
      if (res[i][j] !== 0) {
        key.push([i, j]);
        value.push(res[i][j]);
      }
    }
  }
  return [key, value];
}


/**
 * Return the frequency distribution of variables.
 * @function contingencyMatrix
 * @param {number[]} labelTrue - the array of true labels
 * @param {number[]} labelPred - the array of predicetd labels
 * @return {number[]} the contingency matrix
 */
function contingencyMatrix(labelTrue, labelPred) {
  let [classes, classIdx] = unique(labelTrue, true);
  let [clusters, clusterIdx] = unique(labelPred, true);
  let nClasses = classes.length;
  let nClusters = clusters.length;
  let contingency = coordinateMatrix(classIdx, clusterIdx, Array(
    classIdx.length).fill(1), [nClasses, nClusters], true);
  return contingency;
}


/**
 * Compute the adjusted Rand index given true labels and predicted labels.
 * @function adjustedRandScore
 * @param {number[]} labelTrue - the array of true labels
 * @param {number[]} labelPred - the array of predicted labels
 * @return {number} adjusted Rand index
 */
function adjustedRandScore(labelTrue, labelPred) {
  let nSamples = labelTrue.length;
  let nClasses = unique(labelTrue).length;
  let nClusters = unique(labelPred).length;

  if (nClasses == nClusters === 1 || nClasses == nClusters === 0 ||
    nClasses === nClusters === nSamples) {
    return 1.0;
  }

  let contingency = contingencyMatrix(labelTrue, labelPred);
  let classSum = Array(nClasses).fill(0);
  let clusterSum = Array(nClusters).fill(0);
  for (let i = 0; i < contingency[0].length; i++) {
    classSum[contingency[0][i][0]] += contingency[1][i];
    clusterSum[contingency[0][i][1]] += contingency[1][i];
  }

  let combK = classSum.map(x => comb(x, 2));
  let combC = clusterSum.map(x => comb(x, 2));
  let combIJ = contingency[1].map(x => comb(x, 2));

  let sumCombK = arrSum(combK);
  let sumCombC = arrSum(combC);
  let sumComb = arrSum(combIJ);
  let prodComb = sumCombK * sumCombC / comb(nSamples, 2);
  let meanComb = (sumCombK + sumCombC) / 2;

  return (sumComb - prodComb) / (meanComb - prodComb);
}


/**
 * @constant TICK_LOCS
 * @description "Nice" numbers for placing ticks in a graph. Consistent with
 * Matplotlib's default.
 * {@link https://matplotlib.org/stable/api/ticker_api.html}
 */
const TICK_LOCS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];


/**
 * Determine best tick locations for a range of data.
 * @function getTicks
 * @param {number} min - minimum value
 * @param {number} max - maximum value
 * @param {number} [n=10] - number of bins
 * @description Implemented with reference to Matplotlib's AutoLocator. This
 * function however is much simpler than AutoLocator, and the outcomes are not
 * the same.
 * {@link https://matplotlib.org/stable/api/ticker_api.html#matplotlib.ticker.
 * AutoLocator}
 * @license Matplotlib license
 * @see licenses/matplotlib.txt
 */
function getTicks(min, max, n) {
  n = n || 10;
  const rawstep = (max - min) / n;
  const scale = 10 ** (Math.floor(Math.log10(rawstep)));
  const m = TICK_LOCS.length;
  let step, loc;
  for (let i = 0; i < m; i++) {
    step = scale * TICK_LOCS[i];
    if (step < rawstep) continue;
    loc = Math.floor(min / step) * step;
    if (loc + step * n >= max) break;
  }
  const ticks = [];
  while (true) {
    ticks.push(loc);
    if (loc >= max) break;
    loc += step;
  }
  return ticks;
}
