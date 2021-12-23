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
        view = mo.view,
        bins = mo.bins;

  // validate binning plan
  const names = Object.keys(bins);
  const n = names.length;
  if (n === 0) {
    toastMsg('Must define at least one bin.', mo.stat);
    return;
  }

  // get bin labels
  const labels = Array(data.df.length).fill(0);
  names.forEach(function (name, i) {
    Object.keys(bins[name]).forEach(idx => {
      labels[idx] = i + 1;
    });
  });

  // get contig positions
  const xi = view.x.i,
        yi = view.y.i;
  const vals = data.df.map(datum => [datum[xi], datum[yi]]);

  // This is a heavy calculation so a progress bar is displayed prior to
  // starting the calculation. This can only be achieved through an async
  // operation. There is no good sync way to force the browser to "flush".
  // See: https://stackoverflow.com/questions/16876394/
  toastMsg('Calculating silhouette coefficients.', mo.stat, 0, true);
  setTimeout(function () {

    // calculate pairwise distance if not already
    if (mo.dist === null) mo.dist = pdist(vals);

    // calculate silhouette scores
    let scores = silhouetteSample(vals, labels, mo.dist);

    // remove unbinned contigs
    scores = scores.map((score, i) => labels[i] ? score : null);

    // add scores to data table
    let col = data.cols.indexOf('silhouette');

    // append new column and modify controls
    if (col === -1) {
      scores.forEach((score, i) => { data.df[i].push(score); });
      col = data.cols.length;
      data.cols.push('silhouette');
      data.types.push('number');
      updateControls(data, view);
      buildInfoTable(data, view.spcols.len, mo.pick);
    }

    // update existing column
    else {
      scores.forEach((score, i) => { data.df[i][col] = score; });
    }

    // color contigs by score
    mo.view['color'].zero = false; // silhouettes can be negative
    const sel = byId('color-field-sel');
    sel.value = col;
    sel.dispatchEvent(new Event('change'));

    // summarize scores
    scores = scores.filter(score => score !== null);
    toastMsg(`Mean silhouette score of contigs of ${n} bins: 
      ${arrMean(scores).toFixed(3)}.`, mo.stat, 0, false, true);

  }, 0);
}


/**
 * Calculate adjusted Rand index between current and reference binning plans.
 * @function calcAdjRand
 * @param {Object} mo - main object
 * @param {string} field - categorical field to serve as reference
 */
function calcAdjRand(mo, field) {
  const df = mo.data.df;
  const n = df.length;

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
  const idx = mo.data.cols.indexOf(field);
  let val;
  for (let i = 0; i < n; i++) {
    val = df[i][idx];
    if (val !== null) {
      ref[i] = val[0];
    }
  }

  // calculation
  const ari = adjustedRandScore(ref, cur);

  toastMsg(`Adjusted Rand index between current binning plan and "${field}": 
    ${ari.toFixed(3)}.`, mo.stat, 0, false, true);
}
