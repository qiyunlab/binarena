"use strict";

/**!
 * @module calculate
 * @file Advanced calculations.
 * @description This module calls algorithms implemented in `algorithm` while
 * interacting with the program interface to gather data, perform calculations
 * and display results.
 */


/**
 * Initialize calculation controls.
 * @function initCalcBoxCtrl
 * @param {Object} mo - main object
 */
function initCalcBoxCtrl(mo) {

  byId('silh-calc-btn').addEventListener('click', function () {
    calcSilhouette(mo);
  });

  for (let item of ['x', 'y', 'size', 'opacity', 'color']) {
    byId(`${item}-calc-chk`).addEventListener('change', function () {
      updateCalcBoxCtrl(mo);
    });
  }

  byId('silh-stop-btn').addEventListener('click', function () {
    mo.stat.stopping = true;
  });

  byId('silh-done-btn').addEventListener('click', function () {
    byId('silh-modal').classList.add('hidden');
    if (byId('silh-save-chk').checked) saveSilhToCol(
      mo, byId('silh-col-text').value);
    if (byId('silh-export-chk').checked) exportSilh(mo);
  });

  byId('silh-help-btn').addEventListener('click', function () {
    window.open('https://github.com/qiyunlab/binarena#' +
      'binning-confidence-evaluation', '_blank');
  });

  for (let head of byId('silh-thead').rows[0].cells) {
    head.addEventListener('click', function() {
      sortTableByHead(this);
    });
  }
  
}


/**
 * Update calculation controls.
 * @function updateCalcBoxCtrl
 * @param {Object} mo - main object
 */
function updateCalcBoxCtrl(mo) {

  byId('silh-table-wrap').classList.add('hidden');
  byId('silh-calc-btn').classList.remove('hidden');
  byId('silh-title').classList.remove('hidden');
  byId('silh-flag-div').classList.remove('hidden');
  byId('silh-progress').classList.add('hidden');
  byId('silh-done-div').classList.add('hidden');
  byId('silh-done-btn').classList.add('hidden');
  byId('silh-stop-btn').classList.add('hidden');

  const view = mo.view,
        cols = mo.cols;

  // available variables
  let v, idx, chk, scale, n = 0;
  for (let item of ['x', 'y', 'size', 'opacity', 'color']) {
    v = view[item];
    idx = v.i;
    if (idx && cols.types[idx] === 'num') {
      chk = byId(`${item}-calc-chk`);
      chk.disabled = false;
      scale = v.scale;
      if (chk.checked) n++;
      byId(`${item}-calc-var`).textContent = cols.names[idx] + (
        (scale !== 'none') ? ` (${scale})` : '');
    } else {
      byId(`${item}-calc-chk`).disabled = true;
      byId(`${item}-calc-var`).textContent = '';
    }
  }
  byId('silh-calc-btn').disabled = (n === 0);
  byId('silh-col-text').value = 'silhouette';
}


/**
 * Calculate silhouette scores based on current binning plan.
 * @function calcSilhouette
 * @param {Object} mo - main object
 */
function calcSilhouette(mo) {

  byId('silh-calc-btn').classList.add('hidden');
  byId('silh-title').classList.add('hidden');
  byId('silh-flag-div').classList.add('hidden');
  byId('silh-progress').classList.remove('hidden');

  // const data = mo.data,
  const data = mo.data,
        view = mo.view,
        stat = mo.stat,
        binned = mo.binned,
        masked = mo.masked;

  // collect and scale data
  const items = [], scale_data = [];
  let chk, idx, scale;
  for (let item of ['x', 'y', 'size', 'opacity', 'color']) {
    chk = byId(`${item}-calc-chk`);
    if (!chk.checked || chk.disabled) continue;
    idx = view[item].i;
    scale = view[item].scale;
    scale_data.push(scaleArr(data[idx], scale));
    items.push(item);
  }
  const num_item = items.length;

  // filter data
  console.log('Filtering data...');
  const n = mo.cache.nctg;
  let n_binned = 0,
      n_masked = 0,
      n_inval = 0;
  const filt_ctgs = [],
        filt_plan = [],
        filt_data = Array(num_item).fill().map(() => Array());
  let valid = true;
  let j;
  for (let i = 0; i < n; i++) {
    if (binned[i]) {
      n_binned++;
      if (masked[i]) {
        n_masked++;
      } else {
        valid = true;
        for (j = 0; j < num_item; j++) {
          if (!isFinite(scale_data[j][i])) {
            valid = false;
            break;
          }
        }
        if (valid) {
          filt_ctgs.push(i);
          filt_plan.push(binned[i]);
          for (let j in scale_data) {
            filt_data[j].push(scale_data[j][i]);
          }
        } else {
          n_inval++;
        }
      }
    }
  }
  const n_ctg = filt_ctgs.length;

  // convert binning plan into numbers
  const [labels, bins] = factorize(filt_plan);
  const n_bin = bins.length;

  // log sample selection
  console.log(`The data set has ${n} contigs.`);
  console.log(`In which ${n_binned} contigs are currently binned.`);
  console.log(`Excluded ${n_masked} that are currently masked.`);
  console.log(`Excluded ${n_inval} contigs that have invalid values.`);
  console.log(`A total of ${n_ctg} contigs in ${n_bin} bins are used for ` +
    'this calculation.');

  // This is a heavy calculation so a progress bar is displayed prior to
  // starting the calculation. This can only be achieved through an async
  // operation. There is no good sync way to force the browser to "flush".
  // See: https://stackoverflow.com/questions/16876394/

  setTimeout(function () {

    // min-max scaling of each variable
    console.log('Performing min-max scaling...');
    for (let j = 0; j < num_item; j++) {
      arrMinMaxScale(filt_data[j]);
    }

    // transpose data matrix
    const vals = transpose(filt_data);

    // to store results
    let scores;
    console.log('Calculating silhouette coefficients...');

    // choose calculation method based on data size
    // 20000 is an empirically determined number

    // in JavaScript, the maximum array size is 2 ** 32 - 1 = 4,294,967,295
    // a condensed distance matrix for n data points has n * (n - 1) / 2
    // elements, therefore the maximum number of data points is 92,681, which
    // translates into 4,294,837,540 elements

    // for small dataset, calculate distance matrix first, then calculate
    // silhouette scores synchronously; don't display progress

    if (n_ctg < 20000) {
      // obsolete: use cached pdist
      // if (cache.pdist.length === 0) cache.pdist = pdist(vals);
      const dm = pdist(vals);
      scores = silhouetteSamplePre(dm, labels, n_ctg);
      finishCalc();
    }

    // for large dataset, divide calculation into chunks and display progress
    // in real-time; to achieve this, the algorithm is modified into animation
    // as follows; see silhouetteSampleIns in algorithm.js

    // note: this modification makes the entire calculation slower than the
    // non-interactive silhouetteSampleIns function

    // non-interactive mode, which is faster
    else if (!(byId('silh-progress-chk').checked)) {
      scores = silhouetteSampleIns(vals, labels);
      finishCalc();
    }

    // interactive mode (show progress), which is slower
    // dunno why; perhaps related to JS engine optimization
    else {
      byId('silh-stop-btn').classList.remove('hidden');
      const n = vals.length;
      const m = vals[0].length;
      const count = bincount(labels);
      const c = count.length;
      let distIn, distOut, li, j;
      scores = Array(n).fill();

      // current progress (0-100)
      let progress = 0;

      // display progress in this span
      const span = byId('silh-progress').firstChild;
      const prefix = span.textContent;
      span.textContent = `${prefix} (${progress}%)`;

      // progress updates at 1% of data size
      const percent = n / 100 >> 0;

      // each chunk has 1000 rows
      const step = 1000;

      let beg = 0;
      let end = Math.min(beg + step, n);
      let xi, xj, sum, k, d, p;
      requestAnimationFrame(chunk);

      // each chunk of calculation
      function chunk() {
        for (let i = beg; i < end; i++) {
          li = labels[i];
          xi = vals[i];
          if (count[li] > 1) {
            distIn = 0;
            distOut = Array(c).fill(0);
            for (j = 0; j < n; j++) {
              xj = vals[j];
              sum = 0;
              for (k = 0; k < m; k++) {
                sum += (xi[k] - xj[k]) ** 2;
              }
              d = Math.sqrt(sum);
              if (li === labels[j]) distIn += d;
              else distOut[labels[j]] += d;
            }
            for (j = 0; j < c; j++) distOut[j] /= count[j];
            distOut = Math.min.apply(null, distOut.filter(Boolean));
            distIn /= (count[li] - 1);
            scores[i] = (distOut - distIn) / Math.max(distOut, distIn);
          } else scores[i] = 0;
        }

        // check current progress; update span if needed
        p = end / percent >> 0;
        if (p > progress) {
          span.textContent = `${prefix} (${p}%)`;
          progress = p;
        }

        // abort calculation
        if (stat.stopping) {
          span.textContent = prefix;
          stat.stopping = false;
          abortCalc();
        }

        // move to next chunk
        else if (end < n) {
          beg = end;
          end = Math.min(beg + step, n);
          requestAnimationFrame(chunk);
        }

        // finish calculation
        else {
          span.textContent = prefix;
          stat.stopping = false;
          finishCalc();
        }
      }
    }

    // things to do after calculation
    function finishCalc() {
      console.log('Calculation completed.');
      mo.cache.silhs = [filt_ctgs, labels, bins, scores];
      fillSilhTable(mo, byId('silh-tbody'));
      byId('silh-table-wrap').classList.remove('hidden');
      byId('silh-title').classList.remove('hidden');
      byId('silh-progress').classList.add('hidden');
      byId('silh-done-div').classList.remove('hidden');
      byId('silh-done-btn').classList.remove('hidden');
      byId('silh-stop-btn').classList.add('hidden');
    }

    // calculation terminated prematurely
    function abortCalc() {
      console.log('Calculation aborted.');
      byId('silh-title').classList.remove('hidden');
      byId('silh-progress').classList.add('hidden');
      byId('silh-calc-btn').classList.remove('hidden');
      byId('silh-stop-btn').classList.add('hidden');
      byId('silh-modal').classList.add('hidden');
    }
  }, 100); // this 0.1 sec delay is to let progress dots start blinking
}


/**
 * Populate silhouette result table.
 * @function fillSilhTable
 * @param {Object} mo - main object
 * @param {Object} table - table DOM
 */
function fillSilhTable(mo, table) {
  const [, labels, bins, scores] = mo.cache.silhs;
  const n = scores.length;
  const bin2scores = {};
  let bin;
  for (let i = 0; i < n; i++) {
    bin = bins[labels[i]];
    if (!(bin in bin2scores)) bin2scores[bin] = [scores[i]];
    else bin2scores[bin].push(scores[i]);
  }
  const content = [];
  for (let [key, value] of Object.entries(bin2scores)) {
    if (!key) key = '(unbinned)';
    content.push([key, value.length, arrMean(value)]);
  }
  content.sort((a, b) => b[2] - a[2]);
  content.unshift(['(all)', n, arrMean(scores)]);

  table.innerHTML = '';
  let count, score, row, cell;
  for (let i = 0; i < content.length; i++) {
    [bin, count, score] = content[i];
    row = table.insertRow(-1);
    cell = row.insertCell(-1);
    cell.innerHTML = bin;
    cell = row.insertCell(-1);
    cell.innerHTML = count;
    cell = row.insertCell(-1);
    cell.innerHTML = score.toFixed(3);
    row.setAttribute('data-score', score);
  }
}


/**
 * Save silhouette result to column.
 * @function saveSilhToCol
 * @param {Object} mo - main object
 * @param {name} - column name
 */
function saveSilhToCol(mo, name) {
  if (!name) return;
  const [ctgs, , , scores] = mo.cache.silhs;
  const data = mo.data,
        cols = mo.cols;
  const names = cols.names,
        types = cols.types;
  const n = ctgs.length;
  let col = names.indexOf(name);

  // append new column and modify controls
  if (col === -1) {
    col = data.length;
    const arr = Array(mo.cache.nctg).fill(NaN);
    for (let i = 0; i < n; i++) {
      arr[ctgs[i]] = scores[i];
    }
    data.push(arr);
    names.push(name);
    types.push('num');
    updateControls(mo);
    buildInfoTable(mo);
    buildDataTable(mo);
  }

  // update existing column
  else {
    if (types[col] !== 'num') {
      toastMsg(`Error: Existing field "${name}" is not numeric.`, mo.stat);
      return;
    }
    let arr = data[col];
    arr.fill(NaN);
    for (let i = 0; i < n; i++) {
      arr[ctgs[i]] = scores[i];
    }
  }

  // color contigs by score
  mo.view.color.zero = false; // silhouettes can be negative
  const sel = byId('color-field-sel');
  sel.value = col;
  sel.dispatchEvent(new Event('change'));

  toastMsg(`Set color to field "${name}".`, mo.stat);
}


/**
 * Export silhouette result as a TSV file.
 * @function exportSilh
 * @param {Object} mo - main object
 */
function exportSilh(mo) {
  const [ctgs, labels, bins, scores] = mo.cache.silhs;
  const data = mo.data,
        cols = mo.cols;
  let tsv = '';
  tsv += (cols.names[0] + '\tbin\tsilhouette\n');
  const ids = data[0];
  const n = scores.length;
  for (let i = 0; i < n; i++) {
    tsv += ([ids[ctgs[i]], bins[labels[i]], scores[i]].join('\t') + '\n');
  }
  downloadFile(tsv, 'silhouette.tsv',
    'data:text/tab-separated-values;charset=utf-8');
}


/**
 * Calculate adjusted Rand index between current and reference binning plans.
 * @function calcAdjRand
 * @param {Object} mo - main object
 * @param {string} field - categorical field to serve as reference
 */
function calcAdjRand(mo, field) {
  if (!mo.cache.nctg) return;
  const ari = adjustedRandScore(factorize(mo.binned)[0],
    factorize(mo.data[mo.cols.names.indexOf(field)])[0]);

  toastMsg(`Adjusted Rand index between current binning plan and ` +
    `"${field}": ${ari.toFixed(5)}.`, mo.stat, 0, false, true);
}


/**
 * Populate feature group table.
 * @function fillMemLstTable
 * @param {Object} mo - main object
 * @returns {number} - number of items
 */
function fillMemLstTable(mo) {
  const table = byId('memlst-table');
  table.innerHTML = '';
  const names = mo.cols.names,
        types = mo.cols.types;
  const mems = mo.mems;
  let res = 0;
  let keys, row, cell, n, key;
  for (let i = 1; i < names.length; i++) {
    if (!(types[i] === 'fea')) continue;
    if (!(i in mems)) continue;
    keys = Object.keys(mems[i]);
    n = keys.length;
    if (n === 0) continue;
    res += n;

    // feature set name
    row = table.insertRow(-1);
    row.classList.add('mlField');
    cell = row.insertCell(-1);
    cell.innerHTML = names[i];

    // feature groups
    for (const key of keys) {
      row = table.insertRow(-1);
      row.setAttribute('data-index', i);
      row.setAttribute('data-group', key);
      row.classList.add('mlGroup');
      cell = row.insertCell(-1);
      cell.innerHTML = key;
      cell.addEventListener('click', function () {
        const row = this.parentElement;
        const field = parseInt(row.getAttribute('data-index'));
        const group = row.getAttribute('data-group');
        const [comp, cont] = calcComRed(mo, field, group);
        toastMsg(`Completeness: ${(comp * 100).toFixed(2)}%, ` +
                 `redundancy: ${(cont * 100).toFixed(2)}%.`,
                 mo.stat, 0, false, true);
      });
    }
  }
  return res;
}


/**
 * Calculate completeness and redundancy of current selection given a
 * feature group.
 * @function calcComRed
 * @param {Object} mo - main object
 * @param {number} field - feature set field index
 * @param {string} group - feature group name
 * @description The metrics are analogous to CheckM's.
 * Completeness - number of features seen vs total number of features in group.
 * Redundancy - number of times features are found more than once vs total
 * number of features in group.
 */
function calcComRed(mo, field, group) {
  let feaset = new Set(mo.mems[field][group]);
  const tot = feaset.size;
  const n = mo.cache.nctg;
  const picked = mo.picked;
  const col = mo.data[field];
  const seen = new Set();
  let ndup = 0;
  let datum, j, val;
  for (let i = 0; i < n; i ++) {
    if (!picked[i]) continue;
    datum = col[i];
    for (j = 0; j < datum.length; j ++) {
      val = datum[j];
      if (feaset.has(val)) {
        if (seen.has(val)) ndup ++;
        else seen.add(val);
      }
    }
  }
  return [seen.size / tot, ndup / tot];
}
