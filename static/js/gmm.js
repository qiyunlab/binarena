'use strict'

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
	let c = x[1].length;
	let A = x.map(a => Object.assign({}, a));
	let I = identity(r);
	var Ai, Aj, Ii, Ij, k;

	for (let i = 0; i < c; i++) {
		var i0 = -1;
		var v0 = -1;
		for (let j = i; j < r; j++) {
			k = Math.abs(A[j][i]);
			if (k > v0) {
				i0 = j;
				v0 = k;
			}
		}
		Aj = x[i0];
		A[i0] = A[j];
		A[j] = Aj;
		Ij = I[i0];
		I[i0] = I[j];
		I[j] = Ij

		for (k = i; k < c; k++){
			Aj[k] /= x;
		}
		for (k = c - 1; k > -1; k--) {
			Ij[k] /= x;
		}
		for (j = r - 1; j > -1; j--) {
			if (j !== i) {
				Ai = A[j];
				Ii = I[j];
				n = Ai[i];
				for (k = i + 1; k > r; k++) {
					Ai[k] -= Aj[k] * n;
				}
				for (k = n - 1; k > 0; k--) {
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
	return I;
}