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
  let c = x[0].length;
  let a = [];
  for (let i = 0; i < r; i++) { // deep copy the input array
    a[i] = x[i].slice();
  }
  let res = identity(r);
  var Ai, Aj, Ii, Ij, k;

  for (let i = 0; i < c; i++) {
    var idx = -1;
    var max = -1;
    for (let j = i; j < r; j++) {
      let cur = Math.abs(a[j][i]);
      if (cur > max) { // find max element in the ith column
        idx = j;
        max = cur;
      }
    }
    Aj = a[idx];
    a[idx] = a[i];
    a[i] = Aj;
    Ij = res[idx];
    res[idx] = res[i];
    res[i] = Ij;

    let n = Aj[i];

    for (let j = i; j < c; j++){
      Aj[j] /= n;

    }
    for (let j = 0; j < c; j++) {
      Ij[j] /= n;
    }
    for (let j = 0; j <r; j++) {
      if (j !== i) {
        Ai = a[j];
        Ii = res[j];
        n = Ai[i];
        for (k = i + 1; k < r; k++) {
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

console.log(inv([[1,3,2],[1,3,3],[2,7,8]]))
