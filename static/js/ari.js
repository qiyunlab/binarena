//ARI  = (AI - expected_RI) / (max(RI) - expected_RI)




function unique(arr, returnInv=true) {
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
 * Return the frequency distribution of variables
 */
function contigencyMatrix(labelTrue, labelPred) {
	return 0;
}


function coordinateMatrix(row, col, data, shape) {
	let res = Array(shape[0]).fill().map(()=>Array(shape[1]).fill(0));
	for (let i = 0; i < row.length; i++) {
		res[row[i]][col[i]] += data[i];
	}
	return res;
}

/**
function adjustedRandScore(labelTrue, labelPred) {
	let nSamples = labelTrue.length;
	let nClasses = unique(labelTrue).length;
	let nClusters = unique(labelPred).length;

	if (nClasses == nClusters == 1 || nClasses == nClusters == 0 || nClasses == nClusters == nSamples) {
		return 1.0;
	}

	contigency = contigencyMatrix(labelTrue, labelPred);

}*/