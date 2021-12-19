"use strict";

/**!
 * @module algorithm
 * @file Advanced algorithms.
 */


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
 * Compute the silhouette coefficient for each contig.
 * @function silhouetteSample
 * @param {number[]} x - the input data array
 * @param {number[]} label - the label of input data (must be 0, 1, 2...)
 * @return {number[]} silhouette coefficient of each contig
 * @description The silhouette coefficient measures how similar a contig is to
 * other contigs in the same bin, as in contrast to contigs in other bins.
 * @see {@link https://en.wikipedia.org/wiki/Silhouette_(clustering)}
 * @description It requires calculation of a distance matrix of all contigs,
 * which is expensive. The distance matrix should be cached to avoid repeated
 * calculations
 */
function silhouetteSample(x, label) {
  var n = x.length;
  var count = bincount(label); // bin sizes
  var c = count.length;

  // var t0 = performance.now();
  var dist = pdist(x);  // pairwise distances of all contigs
  // var t1 = performance.now();
  // console.log(t1 - t0);

  // intermediates
  var distIn;  // intra-bin distance
  var distOut; // inter-bin distances
  var li;      // contig label
  var ii;      // index cache (to accelerate calculation)
  var idx;     // distance index

  // calculate silhouette for each contig
  var res = Array(n).fill();
  for (var i = 0; i < n; i++) {
    li = label[i];
    if (count[li] > 1) {
      distIn = 0;
      distOut = Array(c).fill(0);
      ii = n * i - i * (i + 3) / 2 - 1;
      for (var j = 0; j < n; j++) {

        // determine index in condensed distance matrix
        if (i < j) {
          idx = ii + j;
        } else if (i > j) {
          idx = n * j - j * (j + 3) / 2 + i - 1;
        } else {
          continue;
        }

        // determine intra- or inter-bin distance
        if (li == label[j]) {
          distIn += dist[idx];
        } else {
          distOut[label[j]] += dist[idx];
        }
      }

      // mean inter-bin distance for each other bin
      for (var k = 0; k < c; k++) {
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
 * Compute the silhouette score of a binning plan.
 * @function silhouetteScore
 * @param {number[]} x - the input data array
 * @param {number[]} label - the label of input data
 * @return {number} the silhouette score
 * @description The silhouette score, i.e., the mean silhouette coefficient of
 * all contigs, evaluates the quality of a binning plan.
 */
function silhouetteScore(x, label) {
  return arrMean(silhouetteSample(x, label));  
}


/**
 * @summary Adjusted Rand index (ARI)
 * @description The adjusted Rand index (ARI) measures the similarity between
 * binning plans (sets of bins).
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
  var res = Array(shape[0]).fill().map(() => Array(shape[1]).fill(0));
  var n = row.length;
  for (var i = 0; i < n; i++) {
    res[row[i]][col[i]] += data[i];
  }  
  if (!sparse) {
    return res;
  } else {
    var key = [];
    var value = [];
    for (var i = 0; i < res[0].length; i++) {
      for (var j = 0; j < res[1].length; j++) {
        if (res[i][j] !== 0) {
          key.push([i, j]);
          value.push(res[i][j]);
        }
      }
    }
    return [key, value]
  }
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
  let contingency = coordinateMatrix(classIdx, clusterIdx, Array(classIdx.length).fill(1), [nClasses, nClusters], true);
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

  if (nClasses == nClusters === 1 || nClasses == nClusters === 0 || nClasses === nClusters === nSamples) {
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
