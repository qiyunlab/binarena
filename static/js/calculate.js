"use strict";

/**!
 * @module calculate
 * @file Advanced calculations.
 * @description This module calls algorithms implemented in `algorithm` while
 * interacting with the program interface to gather data, perform calculations
 * and display results.
 */


/**
 * Calculate silhouette scores based on current binning plan.
 * @function calcSilhouette
 * @param {Object} mo - main object
 */
function calcSilhouette(mo) {
  const data = mo.data,
        cols = mo.cols,
        view = mo.view,
        bins = mo.bins,
        cache = mo.cache;

  // validate binning plan
  const names = Object.keys(bins);
  const n = names.length;
  if (n === 0) {
    toastMsg('Must define at least one bin.', mo.stat);
    return;
  }

  // get bin labels
  const labels = Array(data[0].length).fill(0);
  names.forEach(function (name, i) {
    Object.keys(bins[name]).forEach(idx => {
      labels[idx] = i + 1;
    });
  });

  // get contig positions
  const xi = view.x.i,
        yi = view.y.i;
  const X = data[xi],
        Y = data[yi];
  const vals = transpose([X, Y]);

  // This is a heavy calculation so a progress bar is displayed prior to
  // starting the calculation. This can only be achieved through an async
  // operation. There is no good sync way to force the browser to "flush".
  // See: https://stackoverflow.com/questions/16876394/
  toastMsg('Calculating silhouette coefficients.', mo.stat, 0, true);
  setTimeout(function () {

    // calculate pairwise distance if not already
    if (cache.pdist.length === 0) cache.pdist = pdist(vals);

    // calculate silhouette scores
    let scores = silhouetteSample(vals, labels, cache.pdist);

    // remove unbinned contigs
    scores = scores.map((score, i) => labels[i] ? score : null);

    // add scores to data table
    let col = cols.names.indexOf('silhouette');

    // append new column and modify controls
    if (col === -1) {
      col = data.length;
      let arr = Array(data[0].length).fill(NaN);
      for (let i = 0; i < scores.length; i++) {
        arr[i] = scores[i];
      }
      data.push(arr);
      cols.names.push('silhouette');
      cols.types.push('num');
      updateControls(cols, view);
      buildInfoTable(mo);
    }

    // update existing column
    else {
      if (cols.types[i] !== 'num') {
        throw 'Error: Field "silhouette" already exists, but it is not ' +
          'a numeric field.';
      }
      let arr = data[col];
      for (let i = 0; i < scores.length; i++) {
        arr[i] = scores[i];
      }
    }

    // color contigs by score
    mo.view.color.zero = false; // silhouettes can be negative
    const sel = byId('color-field-sel');
    sel.value = col;
    sel.dispatchEvent(new Event('change'));

    // summarize scores
    scores = scores.filter(score => score !== null);
    toastMsg(`Mean silhouette score of contigs of ${n} bins: ` +
      `${arrMean(scores).toFixed(3)}.`, mo.stat, 0, false, true);

  }, 0);
}


/**
 * Calculate adjusted Rand index between current and reference binning plans.
 * @function calcAdjRand
 * @param {Object} mo - main object
 * @param {string} field - categorical field to serve as reference
 */
function calcAdjRand(mo, field) {
  const data = mo.data;
  const n = data[0].length;

  // current labels
  const cur = Array(n).fill(0);
  const bins = mo.bins;
  let ctg;
  for (let bin in bins) {
    for (ctg in bins[bin]) {
      cur[ctg] = bin;
    }
  }

  // reference labels
  const ref = Array(n).fill(0);
  const idx = mo.cols.names.indexOf(field);
  const datum = data[idx];
  let val;
  for (let i = 0; i < n; i++) {
    val = datum[i];
    if (val !== null) {
      ref[i] = val;
    }
  }

  // calculation
  const ari = adjustedRandScore(ref, cur);

  toastMsg(`Adjusted Rand index between current binning plan and ` +
    `"${field}": ${ari.toFixed(3)}.`, mo.stat, 0, false, true);
}
