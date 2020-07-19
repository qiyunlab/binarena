'use strict'

/**
 * Calculate euclidean distance between two points
 *
 * @function euclideanDist
 * @param {array} x - coordinate of point x
 * @param {array} y - coordinate of point y
 * @return {number} euclidean distance between x and y
 */
function euclideanDist(x, y) {
  // check x, y
  if (x == y) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - y[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * return the pairwise distance matrix of each point in the input data array
 *
 * @function pairwiseDist
 * @param {Array} x - the input data array
 * @return {Array} distance matrix of the given data
 */
//TODO: add metrics='euclideanDist'
function pairwiseDist(x) {
  let d = Array(x.length).fill().map(()=>Array(x.length).fill());
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < x.length; j++) {
      if (j === i) {
        d[i][j] = 0;
      } else if (j < i) {
        d[i][j] = d[j][i];
      } else {
        d[i][j] = euclideanDist(x[i], x[j]);
      }
    }
  }
  return d;
}


/**
 * return the occurrence of each entry in the input data
 *
 * @function bincount
 * @param {Array} x - the input data array
 * @return {Array} the occurrence of each entry in the input data
 */
function bincount(x) {
  let res = Array(Math.max.apply(Math, x) + 1).fill(0);
  for (let i = 0; i < x.length; i++) {
    res[x[i]]++;
  }
  return res;
}


/**
 * calculate the average of each element in the input data array
 *
 * @function mean
 * @param {Array} x - the input data array
 * @return {Number} the average value of each element of the array
 */
function mean(x) {
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += x[i];
  }
  return sum / x.length;
}


/**
 * compute the silhouette coefficient for each sample
 *
 * @function silhouette_score
 * @param {Array} x - the input data array
 * @param {Array} label - the label of input data
 * @return {Array} silhouette score of each data point
 */
function silhouetteSample(x, label) {
  let count = bincount(label);
  let dist = pairwiseDist(x);
  let intraDist = Array(x.length).fill(0);
  let interDist = Array(x.length).fill().map(()=>Array(count.length).fill(0));
  let res = Array(x.length).fill();
  for (let i = 0; i < x.length; i++) {
    /*
    if (count[i] == 0) {
      continue;
    }*/
    if (count[label[i]] === 1) {
      res[i] = 0;
    } else {
      for (let j = 0; j < x.length; j++) {
        if (label[i] == label[j]) {
          //console.log('label i: ' + label[i] + 'label j' + label[j])
          intraDist[i] += dist[i][j];
          //console.log('i is:' + i + ', and intra dist is : ' + intraDist[i])
        } else {
          interDist[i][label[j]] += dist[i][j];
        }  
      }
      for (let j = 0; j < count.length; j++) { // for each cluster
        interDist[i][j] /= count[j];
      }
      intraDist[i] /= (count[label[i]] - 1);
      //console.log('count[i] is ' + count[label[i]])
      interDist[i] = Math.min.apply(Math, interDist[i].filter(Boolean));
      //console.log('interDist: ' + interDist[i])
      //console.log('intraDist: ' + intraDist[i])
      res[i] = (interDist[i] - intraDist[i]) / Math.max(interDist[i], intraDist[i]);
    }
  } // end for i
  return res;
}

/**
 * compute the mean of silhouette coefficient over all samples
 *
 * @function silhouetteScore
 * @param {Array} x - the input data array
 * @param {Array} label - the label of input data
 * @return {Number} the silhouette score that evaluates the result of clutering
 */
function silhouetteScore(x, label) {
  return mean(silhouetteSample(x, label));  
}


/**
let a = [[5,0],[3,3],[7,9]];
let label = [0,0,1];
console.log(silhouetteScore(a,label))
*/
