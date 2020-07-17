'use strict'

/**
 * Calculate euclidean distance between two points
 * @function euclidean_dist
 * @param {array} x - coordinate of point x
 * @param {array} y - coordinate of point y
 * @return {number} euclidean distance between x and y
 */
function euclidean_dist(x, y) {
	// check x, y
	let sum = 0;
	for (let i = 0; i < x.length; i++) {
		sum += (x[i] - y[i]) ** 2;
	}
	return Math.sqrt(sum);
}

/**
 * @function pairwise_dist
 * @param {Array} x - the input data array
 * @return {Array} distance matrix of the given data
 */
//TODO: add metrics='euclidean_dist'
function pairwise_dist(x) {
	let d = Array(x.length).fill().map(()=>Array(x.length).fill());
	for (let i = 0; i < x.length; i++) {
		for (let j = 0; j < x.length; j++) {
			if (j < i) {
				d[i][j] = d[j][i];
			} else {
				d[i][j] = euclidean_dist(x[i], x[j]);
			}
		}
	}
	return d;
}


/**
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
 * @function silhouette_score
 * @param {Array} x - the input data array
 * @param {Array} label - the label of input data
 * @return {Array} silhouette score of each data point
 */
function silhouette_score(x, label) {
	let count = bincount(label);
	let dist = pairwise_dist(x);
	let intra_dist = Array(x.length).fill(0); // for each point
	let inter_dist = Array(x.length).fill().map(()=>Array(count.length).fill(0));
	let res = Array(x.length).fill();
	for (let i = 0; i < x.length; i++) { // in each cluster
		/*
		if (count[i] == 0) {
			continue;
		}*/
		// for each cluster
		if (count[label[i]] == 1) {
			res[i] = 0;
		} else {
			for (let j = 0; j < x.length; j++) {
				if (label[i] == label[j]) {
					//console.log('label i: ' + label[i] + 'label j' + label[j])
					intra_dist[i] += dist[i][j];
					//console.log('i is:' + i + ', and intra dist is : ' + intra_dist[i])
				} else {
					inter_dist[i][label[j]] += dist[i][j];
				}	
			}
			for (let j = 0; j < count.length; j++) { // for each cluster
				inter_dist[i][j] /= count[j];
			}
			intra_dist[i] /= (count[label[i]] - 1);
			//console.log('count[i] is ' + count[label[i]])
			inter_dist[i] = Math.min.apply(Math, inter_dist[i].filter(Boolean));
			//console.log('inter_dist: ' + inter_dist[i])
			//console.log('intra_dist: ' + intra_dist[i])
			res[i] = (inter_dist[i] - intra_dist[i]) / Math.max(inter_dist[i], intra_dist[i]);
		}
	} // end for i
	return res;
}


