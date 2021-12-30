"use strict";

/**!
 * @module gmm
 * @file Gaussian mixture model (WIP).
 */


/**
 * Compute the determinant of a matrix.
 * @function det
 * @param {number[]} x - the input square matrix
 * @return {number} the determinant of the matrix
 * @see {@link https://en.wikipedia.org/wiki/Determinant}
 * @see numpy.linalg.det
 * @todo This function does not generate the same result on SciPy's example:
 * a = np.array([[1,2,3], [4,5,6], [7,8,9]])
 * linalg.det(a)
 * 0.0
 * Needs double-checking
 */
function det(x) {
  let r = x.length;
  let res = 1;
  let Aj, Ai, alpha, i;
  // let i,j,k,Aj,Ai,alpha,temp,k1,k2,k3;
  let m = [];
  for (i = 0; i < r; i++) {
    m[i] = x[i].slice();
  }
  for (i = 0; i < r - 1; i++) {
    let k = i;
    for (let j = i + 1; j < r; j++) {
      if (Math.abs(m[j][i]) > Math.abs(m[k][i])) {
        k = j;
      }
    }
    if (k != i) {
      let temp = m[k];
      m[k] = m[i];
      m[i] = temp;
      res *= -1;
    }
    Ai = m[i];
    for (let j = i + 1; j < r; j++) {
      Aj = m[j];
      let alpha = Aj[i] / Ai[i];
      for (let k = i + 1; k < r - 1; k += 2) {
        let k1 = k + 1;
        Aj[k] -=Ai[k] * alpha;
        Aj[k1] -= Ai[k1] * alpha;
      }
      if (k !== r) {
        Aj[k] -= Ai[k] * alpha;
      }
    }
    if (Ai[i] === 0) {
      return 0;
    }
    res *= Ai[i];
  }
  return res * m[i][i];
}

//console.log(det([[2,-3,1],[2,0,-1],[1,4,5]]));


/**
 * Instantiation of n-dimensional multivariate Gaussian distribution
 * @function gaussian
 * @param {number[]} mean - the mean of the distribution with length n
 * @param {number[]} variance - the covariance matrix of the distribution
 */
function gaussian(mean, variance) {
  this.mean = mean;
  this.variance = variance;
  this.n = mean.length;
}


/**
 * Compute the probability density function of gaussian distribution
 * @function pdf
 */
gaussian.prototype.pdf = function(x) {
  let mean = this.mean;
  if (typeof(x) === 'number') {
    return 1 / (this.variance * Math.sqrt(2 * Math.PI)) * Math.exp((
      x - mean) ** 2 / (-2 * this.variance ** 2));
  }
  let d = x.map(function(a, i) { // element-wise array substraction
    return a - mean[i];
  });
  let ex = 0; // exponent
  let invVar = invMat(this.variance);
  for (let i = 0; i < this.n; i++) {
    let sum = 0;
    for (let j = 0; j < this.n; j++) {
      sum += invVar[i][j] * d[j];
    }
    ex += d[i] * sum;
  }
  return 1 / (Math.pow(Math.sqrt(2 * Math.PI), this.n) * Math.sqrt(
    det(this.variance))) * Math.exp(ex / -2);
};


/*
 * Representation of a single Gaussian Mixture Model.
 * @class gmm
 */
function gmm(x, mean, variance, weight) {
  this.data = x;
  this.mean = mean;
  this.variance = variance;
  this.weight = weight;
  this.gaussian = new gaussian(mean, variance);
}


/**
 * Compute the proability of the mixture
 * @function probability
 * @param {number[]} x - the input array
 * @return the probability of the mixture model
 */
gmm.prototype.probability = function(x) {
  return this.weight * this.gaussian.pdf(x);
};



function estimate_params(x, k) {
  let n = x.length;
  let res = Array(n);
  let sum = n.sum(x);
  for (let i = 0; i < n; i++) {
    let nk = arrSum(x[i]);
    let weight = nk / sum;
    let mean = transpose(x) / nk;
    let dim = mean.length;
    for (let j = 0; j < dim; j++) {
      let meanSum = mean[j].map(a => a * nk); // can use reduce function
    }

    let cov = 0; // add function estimate covariane
    for (let j = 0; j < n; j++) {
      let sample = x[i];
      let diff = Array(dim);
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < dim; k++) {
          diff[k] = x[j][k] - means[k];
        }
        for (let n = 0; n < dim; n++) {
          for (let m = 0; m < dim; m++) {
            cov[n][m] += resp[j] * diff[n] * diff[m];
          }
        }
      }
      let coeff = x[i] / nk;
      let diffdiff = n.rep([dim, dim], 0);
      for (let j = 0; j < diff.length; j++) {
        for (let k = 0; k <= j; k++) {
          let tmp = coeff * diff[j] * diff[k];
          variance[a][b] += tmp;
          if (k !== j) {
            variance[k][j] += tmp;
          }
        }
      }
    }
    res[i] = new gmm(weight, mean, variance);
  }
  return res;
}


/**
 * Returns the covariance matrix.
 * @function cov
 * @param {number[]} x - input data array
 * @param {number[]} mean - mean array
 * @return {number[]} cov - covariance matrix
 */
function cov(x, mean) {
  let d = x.map(function(a, i){
    return a - mean[i];
  });
  let n = x.length;
  let cov = Array(n).fill().map(() => Array(n).fill());
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cov[i][j] = d[i] * d[j];
    }
  }
  return cov;
}


/**
 * Maximization step of EM algorithm.
 * @function mStep
 * @param {number[]} x - input data
 * @param {number[]} mean - means of gmm
 * @param {number[]} variance - covariance matrices of gmm
 * @param {number} k - number of clusters
 * @param {number[]} z -latent variable matrix
 * @param {number[]} weight - weight matrix of gmm
 */
function mStep(x, mean, variance, k, z, weight) {
  let m = x.length; // m samples
  let n = x[0].length; // n dimension
  for (let j = 0; j < k; j++) {
    // column sum of latent matrix
    let c = z.map((a, i) => { return a[j]; }).reduce((acc, cur) => acc + cur);
    weight[j] = 1 / m * c;
    let mu = Array(n).fill(0);
    let sigma = Array(n).fill().map(() => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      mu = mu.map(function(a, idx) {return a + x[i].map(
        a => a * z[i][j])[idx]; });
      // matrix element-wise operations need to fix
      sigma = sigma.map(function(a, idx){return a + cov(x[i], mean[j]).map(
        a => a * z[i][j])[idx]; });
    }
    mean[j] = mu.map(a => a / c);
    variance[j] = sigma.map(a => a / c);
  }
}


/**
 * Estimation step of EM algorithm.
 * @function eStep
 * @param {number[]} x - input array
 * @param {number[]} mean - the mean array of the gaussian mixture
 * @param {number[]} variance -  the array of covariance matrix
 * @param {number[]} z - the latent variance array
 * @param {number} k - the number of clusters
 * @param {number[]} weight - the array of weights of each clusters
 */
function eStep(x, mean, variance, z, k, weight) {
  let m = x.length; // m samples
  for (let i = 0; i < m; i++) {
    let sample = x[i];
    let c = 0;
    for (let j = 0; j < k; j++) {
      let cluster = new gaussian(mean[j], variance[j]);
      let p = weight[j] * cluster.pdf(x[i]);
      c += p;
      z[i][j] = p;
    }
    if (c > 0) {
      z[i] = z[i].map(a => a / c);
    } else {
      z[i].fill(1 / k);
    }
  }
}


/**
 * Compute the log-likehood.
 * @function loglikelihood
 * @param {number[]} x - array of input
 * @param {number[]} mean - mean vector
 * @param {number[]} variance - covariance matrix
 * @param {number[]} weight - weight matrix
 * @param {number} k - number of clusters
 */
function loglikelihood(x, mean, variance, weight, k) {
  let m = x.length;
  let res = 0;
  for (let i = 0; i < m; i++) {
    let tmp = 0;
    for (let j = 0; j < k; j++) {
      let g = new gaussian(mean, variance);
      tmp += g.pdf(x[i]) * weight[j];
    }
    res += Math.log(tmp);
  }
  return res;
}


/**
 * Fitting the Gaussian mixture model by em algorithm
 * @function fit
 * @param {number[]} x - the input array
 * @param {number} k - the number of clusters
 * @param {number} tol - the convergence tolerance
 */
function fit(x, k=2, tol=1e-5) {
  let m = x.length;
  let n = x[0].length;
  //initialization
  let avg = 0;
  let cur = 1;
  let prev = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      avg += x[i][j];
    }
  }
  let mean = Array(k).fill().map(() => Array(n).fill(avg));
  let variance = Array(k).fill().map(() => identity(n));
  let weight = Array(k).fill(1 / k);
  let z = Array(m).fill().map(() => Array(k).fill());

  while(cur > prev) {
    prev = loglikelihood(x, mean, variance, weight);
    eStep();
    mStep();
    cur = loglikelihood(x, mean, variance, weight);
  }
}
