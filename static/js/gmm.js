'use strict'

// for test use
function arrSum(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}


// for test use
function arrMean(arr) {
  // to avoid floating point err in js
  return (arrSum(arr) * 10) / (arr.length * 10);
}


// for test use
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
 * Return a 2D matirx with 1 on the diagonal and 0 elsewhere.
 * @function identity
 * @param {number} n - the number of rows
 * @return {number[]} the identity matrix
 */
function identity(n) {
	let res = Array(n).fill().map(() => Array(n).fill(0));
	for (let i = 0; i < n; i++) {
		res[i][i] = 1;
	}
	return res;
}

/**
 * Return inverse of given matrix.
 * @function inv
 * @param {number[]} x - the input matrix
 * @return {number[]} inverse of the input matrix
 */
function inv(x) {
	if (typeof(x) === 'number') {
		return 1 / x;
	}
	let r = x.length;
	let c = x[0].length;
	let a = [];
	for (let i = 0; i < r; i++) { // deep copy the input array
		a[i] = x[i].slice();
	}
	let res = identity(r);
	let k, Ii, Ij, temp;

	// row reduction
	for (let i = 0; i < c; i++) {
		var idx = i;
		var max = a[i][i];
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

//console.log(inv([[1,3,2],[1,3,3],[2,7,8]]))

/**
 * Compute the determinant of matrix.
 * @function det
 * @param {number[]} x - the input square matrix
 * @return {number} the determinant of the matrix
 */
function det(x) {
	let r = x.length;
	let res = 1;
	var Aj, Ai, alpha, i;
	//var i,j,k,Aj,Ai,alpha,temp,k1,k2,k3;
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
	let delta = x.map(function(n, i) { // element-wise array substraction
		return n - mean[i];
	});
	let ex = 0; // exponent
	let invVar = inv(this.variance);
	for (let i = 0; i < this.n; i++) {
		let sum = 0;
		for (let j = 0; j < this.n; j++) {
			sum += invVar[i][j] * delta[j];
		}
		ex += delta[i] * sum;
	}
	return 1 / (Math.pow(Math.sqrt(2 * Math.PI), this.n) * Math.sqrt(det(this.variance))) * Math.exp(ex / -2);
};


var g = new gaussian([1,2], [[1,0],[0,1]]);
console.log(g.pdf([0,1]));
console.log(inv(0.5))


// class of mixture model
function gmm(mean, variance) {
	this.weight = weight;
	this.mean = mean;
	this.variance = variance;
	this.gaussian = new gaussian(this);
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



function estimate_params(x) {
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


function mStep(x) {
	let n = x.length; // n samples
	let dim = x[0].length;
	let res = Array(n);
	let sum = 0;
	for (let i = 0; i < n; i++) {
		sum += arrSum(x[i]);
	}

	for (let i = 0; i < n; i++) {
		let nk = 0;
		for (let j = 0; j < dim; j++) { // use arrsum
			nk += x[i][j];
		}

		//update weight
		weights[i] = nk / sum;

		//update means
		let mean = means[i].fill(0);
		for (let j = 0; j < dim; j++) {
			for (let k = 0; k < mean.length; k++) {
				means[k] += resp[j] * x[j][k];
			}
		}
		for (let j = 0; j < mean.length; j++) {
			mean[j] /= nk;
		}

		//update covariances
		for (let j = 0; j < dim; j++) {
			let sample = x[j];
			let diff = sample - mean[j];
			let coeff = x[j] / nk;
		}

	}
}




/**
 * @param {number[]} x - clustered input array
 * @param {number} k - the number of clusters
 */
function eStep(x, k) {
	let n = x.length;
	let res = Array(n);
	for (let i = 0; i < n; i++) {
		let sample = x[i];
		let l = Array(k)
		let sum = 0;
		for (let j = 0; j < k; j++) {
			let cluster = x[j];
			let p = cluster.probability(x);
			l[j] = p;
			sum += p;
		}
		if (sum > 0) {
			for (let j = 0; j < k; j++) {
				l[j] /= sum;
			}
		} else {
			for (let j = 0; j < k; j++) {
				l[j] = 1 / k;
			}
		}
		res[i] = l;
	}
	return transpose(res);
}
