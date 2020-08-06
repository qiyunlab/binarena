'use strict'

/**
 * Calculate euclidean distance between two points.
 * @function euclidean
 * @param {number[]} x - coordinate of point x
 * @param {number[]} y - coordinate of point y
 * @return {number} euclidean distance between x and y
 */
function euclidean(x, y) {
  // check x, y
  if (arrEqual(x, y)) {
    return 0;
  }
  let sum = 0;
  let l = x.length;
  for (let i = 0; i < l; i++) {
    sum += (x[i] - y[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Return the pairwise distance matrix of each point in the input data array.
 * @function pdist
 * @param {number[]} x - the input data array
 * @return {number[]} distance matrix of the given data
 */
//TODO: add metrics='euclidean'
function pdist(x) {
  let l = x.length;
  let d = Array(l).fill().map(()=>Array(x.l).fill());
  for (let i = 0; i < l; i++) {
    for (let j = 0; j < l; j++) {
      if (j === i) {
        d[i][j] = 0;
      } else if (j < i) {
        d[i][j] = d[j][i];
      } else {
        d[i][j] = euclidean(x[i], x[j]);
      }
    }
  }
  return d;
}


/**
 * Return the occurrence of each entry in the input data.
 * @function bincount
 * @param {number[]} x - the input data array
 * @return {number[]} the occurrence of each entry in the input data
 */
function bincount(x) {
  let res = Array(Math.max.apply(null, x) + 1).fill(0);
  let l = x.length;
  for (let i = 0; i < l; i++) {
    res[x[i]]++;
  }
  return res;
}


/**
 * Compute the silhouette coefficient for each sample.
 * @function silhouetteSample
 * @param {number[]} x - the input data array
 * @param {number[]} label - the label of input data
 * @return {number[]} silhouette score of each data point
 */
function silhouetteSample(x, label) {
  let l = x.length;
  let count = bincount(label);
  let c = count.length;
  let dist = pdist(x);
  let intraDist = Array(l).fill(0);
  let interDist = Array(l).fill().map(()=>Array(c).fill(0));
  let res = Array(l).fill();
  for (let i = 0; i < l; i++) {
    if (count[label[i]] === 1) {
      res[i] = 0;
    } else {
      for (let j = 0; j < l; j++) {
        if (label[i] == label[j]) {
          //console.log('label i: ' + label[i] + 'label j' + label[j])
          intraDist[i] += dist[i][j];
          //console.log('i is:' + i + ', and intra dist is : ' + intraDist[i])
        } else {
          interDist[i][label[j]] += dist[i][j];
        }  
      }
      for (let j = 0; j < c; j++) { // for each cluster
        interDist[i][j] /= count[j];
      }
      intraDist[i] /= (count[label[i]] - 1);
      //console.log('count[i] is ' + count[label[i]])
      interDist[i] = Math.min.apply(null, interDist[i].filter(Boolean));
      //console.log('interDist: ' + interDist[i])
      //console.log('intraDist: ' + intraDist[i])
      res[i] = (interDist[i] - intraDist[i]) / Math.max(interDist[i], intraDist[i]);
    }
  } // end for i
  return res;
}


/**
 * Compute the mean of silhouette coefficient over all samples.
 * @function silhouetteScore
 * @param {number[]} x - the input data array
 * @param {number[]} label - the label of input data
 * @return {number} the silhouette score that evaluates the result of clutering
 */
function silhouetteScore(x, label) {
  return arrMean(silhouetteSample(x, label));  
}
