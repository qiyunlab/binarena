'use strict'

// for test use
function arrSum(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

function arrMean(arr) {
  // to avoid floating point err in js
  return (arrSum(arr) * 10) / (arr.length * 10);
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

		let n = Aj[i];
		for (let j = i; j < c; j++){
			Aj[j] /= n;
		}
		for (let j = 0; j < c; j++) {
			Ij[j] /= n;
		}
		for (let j = 0; j <r; j++) {
			if (j !== i) {
				let Ai = a[j];
				Ii = res[j];
				n = Ai[i];
				for (k = i + 1; k < c; k++) {
					Ai[k] -= Aj[k] * n;
				}
				for (k = c - 1; k > 0; k--) {
					Ii[k] -= Ij[k] * n;
					k--;
					Ii[k] -= Ij[k] * n;
				}
				if (k===0) {
					Ii[0] -= Ij[0] * n;
				}
			}
		}
	}
	return res;
}

//console.log(inv([[1,3,2],[1,3,3],[2,7,8]]))

/**
 * Compute the determinant of matrix
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

console.log(det([[2,-3,1],[2,0,-1],[1,4,5]]));


function gaussian(params) {
	this.variance = params.variance;
	this.mean = params.mean;
	this.dim = this.mean.length;

	//var det = det(this.variance);
	this.invMean = inv(this.mean);
	this.coefficient = 1 / (Math.pow(Math.sqrt(Math.PI * 2), this.dim) * Math.sqrt(det));
}


gaussian.prototype.density = function(x) {
	let delta = x.map(a => a - this.mean);
	let prob = 0;
	for (let i = 0; i < this.dim; i++) {
		let invMean = this.invMean[i];
		let sum = 0;
		for (let j = 0; j < this.dim; j++) {
			sum += invMean[j] * delta[j];
		}
		prob += delta[i] * sum;
	}
	return this.coefficient * Math.exp(prob / -2);
};


function gmm(weight, mean, variance) {
	this.weight = weight;
	this.variance = variance;
	this.mean = mean;
	this.gaussian = new gaussian(this);
}

gmm.prototype.density = function(x) {
	return this.weight * this.gaussian.density(point);
};


function estimate_covariance(){
	return 0;
}


function mStep(x) {
	let n = x.length; // n: n component
	let res = Array(n);
	let sum = arrSum(n);

	for (let i = 0; i < n; i++) {
		let resp = resps[i];
		let nk = 0;
		for (let j = 0; j < dim; j++) { // use arraysum
			nk += resp[j];
		}

		//update weight
		weights[i] = nk / x.length;

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
		let cov = estimate_covariance(x, resp, nk, means);

	}
}


function estimate_params(x) {
	let len = x.length;
	let res = Array(len);
	let sum = n.sum(x);
	for (let i = 0; i < len; i++) {
		let nk = arrSum(x[i]);
		let weight = nk / sum;
		let mean = transpose(x) / nk; // TODO: array division
		let dim = mean.length;
		for (let j = 0; j < dim; j++) {
			let meanSum = mean[j].map(a => a * nk); // can use reduce function
		}

		let cov = n.diag(n.rep([dim], n.epsilon)); // add function estimate covariane
		for (let j = 0; j < x.length; j++) {
			let point = x[i];
			let diff = Array(dim);
			for (let j = 0; j < x.length; j++) {
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
					sigma[a][b] += tmp;
					if (k !== j) {
						sigma[k][j] += tmp;
					}
				}
			}
		}
		res[i] = new gmm(weight, mean, variance);
	}
	return res;
}
