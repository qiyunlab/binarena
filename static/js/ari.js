'use strict'
//ARI  = (RI - expected_RI) / (max(RI) - expected_RI)

/**
 * import from util.js for test use.
 */
function arrSum(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}


/**
 * Calculate the factorial divided by another factorial iteratively.
 * @function factorial
 * @param {number} n - the input integer
 * @param (number) m - the input integer, default to 1
 * @return {number} the factorial quotient of 2 integers
 */
function factorial(n, m=1) {
  if (!Number.isInteger(n) || (m != undefined && !Number.isInteger(m))) {
    return 0;
  }
  let res = m;
  let i = m;
  while (i < n) {
    res *= i + 1;
    i++;
  }
  return res;
}


/**
 * Calculate the combination of choosing m iterms from n iterms.
 * @function comb
 * @param {number} n - the input integer
 * @param {number} m - the input integer of elements taken
 * @return {number} the combination of n choose m
 */
function comb(n, m) {
  if (!Number.isInteger(n) || (m != undefined && !Number.isInteger(m))) {
    return 0;
  }
  return factorial(n, n - m + 1) / factorial(m);
}


/**
 * Return array of unique elements from the input array.
 * @function unique
 * @param {number[]} arr - the input array
 * @param {boolean} returnInv - if true, return the indices of of the unique array, default to false
 * @return {number[]} the unique array and optional indices of unique array
 */
function unique(arr, returnInv=false) {
  let res = Array.from(new Set(arr));
  if (!returnInv) {
    return res;
  } else {
    let inv = Array(arr.length).fill();
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < res.length; j++) {
        if (arr[i] === res[j]) {
          inv[i] = j;
        }
      }
    }
    return [res, inv];
  }
}


/**
 * Return the coordinate matrix.
 * @functino coordinateMatrix
 * @param {number[]} row - the array of row indices
 * @param {number[]} col - the array of column indices
 * @param {number[]} data - the entries of the matrix
 * @param {number[]} shape - the shape of coordinate matrix
 * @param {boolean} sparse - true to return a sparse matrix, default to false
 * @return {number[]} the coordinate matrix 
 */
function coordinateMatrix(row, col, data, shape, sparse=false) {
  let res = Array(shape[0]).fill().map(()=>Array(shape[1]).fill(0));
  for (let i = 0; i < row.length; i++) {
    res[row[i]][col[i]] += data[i];
  }  
  if (!sparse) {
    return res;
  } else {
    let key = [], value = [];
    for (let i = 0; i < res[0].length; i++) {
      for (let j = 0; j < res[1].length;      j ++) {
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
 * Compute the adjusted rand index given true labels and predicted labels.
 * @function adjustedRandScore
 * @param {number[]} labelTrue - the array of true labels
 * @param {number[]} labelPred - the array of predicted labels
 * @return {number} adjusted rand score
 */ 
function adjustedRandScore(labelTrue, labelPred) {
  let nSamples = labelTrue.length;
  let nClasses = unique(labelTrue).length;
  let nClusters = unique(labelPred).length;
  console.log('n_sample: ' + nSamples + '\n n_classes: ' + nClasses + '\n n_clusters: ' + nClusters);

  if (nClasses == nClusters === 1 || nClasses == nClusters === 0 || nClasses === nClusters === nSamples) {
    console.log('true')
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

/*
let true_label = [0,0,1,0,2];
let pred_label = [0,1,1,0,2];
console.log(adjustedRandScore(true_label, pred_label))
*/
