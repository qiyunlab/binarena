"use strict";

/**!
 * @module select
 * @file Contig selection functions.
 */


/**
 * Initialize mini plot controls.
 * @function initSelectCtrl
 * @param {Object} mo - main object
 */
function initSelectCtrl(mo) {
  initSelTools(mo);
  initInfoCtrl(mo);
}


/**
 * Initialize select panel toolbar.
 * @function initSelTools
 * @param {Object} mo - main object
 * @description The toolbar is floating at the left side of the info panel.
 * It also contains buttons related to binning operations, which are coded in
 * `bin.js`. The current function codes buttons related to contig selection
 * and masking.
 */
function initSelTools(mo) { 

  // Invert selection.
  byId('invert-btn').addEventListener('click', function () {
    if (mo.data.length === 0) return;
    let pick = mo.pick;
    const mask = mo.mask;
    let n = mo.data[0].length;
    const res = [];
    for (let i = 0; i < n; i++) {
      if (!(i in mask) && !(i in pick)) res.push(i);
    }
    mo.pick = {};
    pick = mo.pick;
    n = res.length;
    for (let i = 0; i < n; i++) {
      pick[res[i]] = null;
    }
    treatSelection(res, 'new', false, mo);
  });

  // Mask selection.
  byId('mask-btn').addEventListener('click', function () {
    const ctgs = Object.keys(mo.pick);
    if (ctgs.length > 0) {
      // switch to "add" mode, then treat deletion
      treatSelection(ctgs, 'add', true, mo);
    }
  });

  // Clear mask.
  byId('clear-mask-btn').addEventListener('click', function () {
    mo.mask = {};
    updateView(mo);
  });

}


/**
 * Initialize info table in-row controls.
 * @function initInfoCtrl
 * @param {Object} mo - main object
 * @description The info table is located in middle of the side panel. It
 * displays a summary of metadata of selected contigs. When the user hovers
 * a row, an inline control bar will emerge and let the user operate on the
 * specific row.
 */
function initInfoCtrl(mo) {

  /** Toggle summary metric (sum or mean). */
  byId('info-metric-btn').addEventListener('click', function () {
    const row = byId('info-table').rows[this.parentElement
      .getAttribute('data-row')];
    if (row.getAttribute('data-metric') === 'sum') {
      row.setAttribute('data-metric', 'mean');
      this.innerHTML = '<span style="text-decoration: overline;">' +
        '<i>x</i></span>';
    } else {
      row.setAttribute('data-metric', 'sum');
      this.innerHTML = '&Sigma;<i>x</i>';
    }
    updateInfoRow(row, mo);
  });

  /** Weight variable by reference. */
  byId('info-ref-sel').addEventListener('change', function () {
    const row = byId('info-table').rows[this.parentElement
      .parentElement.getAttribute('data-row')];
    row.setAttribute('data-refcol', this.value);
    updateInfoRow(row, mo);
  });

  /** Plot variable. */
  byId('info-plot-btn').addEventListener('click', function () {
    const div = this.parentElement;
    const idx = byId('info-table').rows[div.getAttribute('data-row')]
      .getAttribute('data-index');
    mo.mini.field = idx;
    byId('mini-field-sel').value = idx;
    updateMiniPlot(mo);
    byId('mini-canvas').parentElement.classList.remove('hidden');
  });

  /** Hide variable */
  byId('info-hide-btn').addEventListener('click', function () {
    const div = this.parentElement;
    const row = byId('info-table').rows[div.getAttribute('data-row')];
    div.classList.add('hidden');
    byId('info-table').deleteRow(row.rowIndex);
  });

}


/**
 * Deal with selected contigs.
 * @function treatSelection
 * @param {number[]} ctgs - indices of contigs to be selected / excluded
 * @param {string} [selmode='new'] - selection mode (new, add, remove)
 * @param {boolean} [masking=false] - masking mode on/off
 * @param {Object} mo - main object
 */
function treatSelection(ctgs, selmode, masking, mo) {
  if (typeof masking === 'undefined') masking = false;
  if (typeof selmode === 'undefined') selmode = mo.stat.selmode;
  const target = masking ? mo.mask : mo.pick;

  // new selection
  if (selmode === 'new') {
    Object.keys(target).forEach(i => { delete target[i]; });
    ctgs.forEach(i => { target[i] = null; });
    toastMsg(`${masking ? 'Masked' : 'Selected'} ${plural('contig',
      ctgs.length)}.`, mo.stat);
  }

  // add to selection
  else if (selmode === 'add') {
    let n = 0;
    ctgs.forEach(i => {
      if (!(i in target)) {
        target[i] = null;
        n++;
      }
    });
    toastMsg(`Added ${plural('contig', n)} to ${masking ? 'mask' :
      'selection'}.`, mo.stat);
  }

  // remove from selection
  else if (selmode === 'remove') {
    const todel = [];
    ctgs.forEach(i => { if (i in target) todel.push(i); });
    todel.forEach(i => { delete target[i]; });
    toastMsg(`Removed ${plural('contig', todel.length)} from ${masking ?
      'mask' : 'selection'}.`, mo.stat);
  }

  // remove excluded contigs from selection, if any
  if (masking) {
    const todel = [];
    Object.keys(mo.pick).forEach(i => {
      if (i in mo.mask) todel.push(i);
    });
    todel.forEach(i => { delete mo.pick[i]; });
  }

  updateView(mo);
  mo.rena.focus();
}


/**
 * Update contig selection.
 * @function updateSelection
 * @param {Object} mo - main object
 */
function updateSelection(mo) {
  renderSelection(mo);
  updateMiniPlot(mo);
  updateBinCtrl(mo);
  updateSelTools(mo);
  updateInfoTable(mo);
  updateMaskCtrl(mo);
}


/**
 * Update selection controls.
 * @function updateSelTools
 * @param {Object} mo - main object
 */
function updateSelTools(mo) {
  const ctgs = Object.keys(mo.pick);
  const n = ctgs.length;
  let str = 'Selected: ' + n;
  if (n === 1) str += ' (ID: ' + mo.data[0][ctgs[0]] + ')';
  byId('info-head-btn').innerHTML = str;
}


/**
 * Update masking controls.
 * @function updateMaskCtrl
 * @param {Object} mo - main object
 */
function updateMaskCtrl(mo) {
  const ctgs = Object.keys(mo.mask);
  const n = ctgs.length;
  let str = 'Masked: ' + n;
  if (n === 1) str += ' (ID: ' +  mo.data[0][ctgs[0]] + ')';
  byId('mask-head-btn').innerHTML = str;
}


/**
 * Build info table based on the dataset and selected contigs.
 * @function buildInfoTable
 * @param {Object} cols - cols object
 * @param {Object} pick - selected contigs
 * @param {Object} [lencol] - "length" column index
 * @description It re-draws the entire info table to reflect updates in the
 * dataset (e.g., loaded a new dataset; added a new column). Fields (rows)
 * displayed in the table are determined based on the type and names of data
 * fields.
 */
function buildInfoTable(cols, pick, lencol) {
  const table = byId('info-table');

  // temporarily move control span
  const div = byId('info-ctrl');
  div.classList.add('hidden');

  // weight-by selection - clear
  const sel = byId('info-ref-sel');
  sel.innerHTML = '';
  sel.add(document.createElement('option'));

  // clear table
  table.innerHTML = '';

  // create rows
  const names = cols.names,
        types = cols.types;
  lencol = lencol ? names[lencol] : '';

  const n = names.length;
  let name, type, row, met;
  for (let i = 1; i < n; i++) {
    name = names[i];
    type = types[i];
    row = table.insertRow(-1);
    row.setAttribute('data-index', i);
    row.setAttribute('data-col', name);
    row.setAttribute('data-type', type);
    if (type === 'num') {
      met = guessColMetric(name);
      row.setAttribute('data-refcol', (
        met.substring(met.length - 2) === 'by') ? lencol : '');
      row.setAttribute('data-metric', (
        met.substring(0, 3) === 'sum') ? 'sum' : 'mean');
    }

    // row hover event: append control span
    row.addEventListener('mouseenter', function () {
      if (document.activeElement === sel) return false;

      // three buttons: metric (sum or mean), plot entry, weight-by selection
      // the 4th and permanent button is "hide"
      const mbtn = byId('info-metric-btn'),
            pbtn = byId('info-plot-btn'),
            rspan = byId('info-ref-span');

      // only one contig is selected, then no need for controls
      if (Object.keys(pick).length === 1 ||
        (this.getAttribute('data-type') !== 'num')) {
        mbtn.classList.add('hidden');
        pbtn.classList.add('hidden');
        rspan.classList.add('hidden');
      }

      // multiple contigs are selected
      else {
        const met = this.getAttribute('data-metric');
        mbtn.title = 'Metric: ' + met;
        sel.value = this.getAttribute('data-refcol');
        mbtn.innerHTML = (met === 'sum') ? '&Sigma;<i>x</i>' :
          '<span style="text-decoration: overline;"><i>x</i></span>';
        mbtn.classList.remove('hidden');
        pbtn.classList.remove('hidden');
        rspan.classList.remove('hidden');
      }

      // append controls to row
      div.setAttribute('data-row', this.rowIndex);
      const rect = this.getBoundingClientRect();
      div.style.top = rect.top + 'px';
      div.classList.remove('hidden');
    });

    // weight-by selection - add numeric field
    if (type === 'num') {
      const opt = document.createElement('option');
      opt.text = name;
      opt.value = name;
      sel.add(opt);
    }

    // create cells
    const cell = row.insertCell(-1); // 1st cell: field name
    cell.innerHTML = name;
    row.insertCell(-1); // 2nd cell: field value
  }

  // hide toolbar
  table.parentElement.addEventListener('mouseleave', InfoTableMouseLeave);
  function InfoTableMouseLeave() {
    if (document.activeElement === sel) return;
    div.classList.add('hidden');
  }
}


/**
 * Update info table of selected contigs.
 * @function updateInfoTable
 * @param {Object} mo - main object
 * @description It re-fills the info table with information of selected
 * contigs. It does not re-define rows and metrics.
 * @todo Currently this function is very inefficient because it involves data
 * table splicing, transposing, etc.
 */
function updateInfoTable(mo) {
  const table = byId('info-table');
  const ctgs = Object.keys(mo.pick);
  const n = ctgs.length;

  // no contig is selected
  if (n === 0) {
    table.classList.add('hidden');
    return;
  }
  const rows = table.rows;
  const data = mo.data;

  // single contig
  if (n === 1) {
    const ctg = ctgs[0];
    for (let row of rows) {
      row.cells[1].innerHTML = value2Str(
        data[row.getAttribute('data-index')][ctg],
        row.getAttribute('data-type'));
    }
  }

  // multiple contigs
  else {
    const names = mo.cols.names;
    let idx, datum, arr, refarr, i;
    for (let row of rows) {

      // get data
      idx = row.getAttribute('data-index');
      datum = data[idx];
      arr = Array(n).fill();
      for (i = 0; i < n; i++) {
        arr[i] = datum[ctgs[i]];
      }

      // get reference data, if available
      idx = names.indexOf(row.getAttribute('data-refcol'));
      if (idx !== -1) {
        datum = data[idx];
        refarr = Array(n).fill();
        for (i = 0; i < n; i++) {
          refarr[i] = datum[ctgs[i]];
        }
      }

      // summarize data and display
      updateInfoRow(row, mo, arr, refarr);
    }
  }

  table.classList.remove('hidden');
}


/**
 * Update one piece of information of selected contigs.
 * @function updateInfoRow
 * @param {Object} row - one row in the info table
 * @param {Object} mo - main object
 * @param {Array} [arr] - data column
 * @param {Array} [refarr] - reference column
 * @description arr and refarr are not necessary; but they can be provided in
 * order to save compute
 */
function updateInfoRow(row, mo, arr, refarr) {
  const ctgs = Object.keys(mo.pick).sort();
  const n = ctgs.length;
  const data = mo.data;
  let idx, datum, info;

  // populate data array
  if (arr == null) {
    idx = row.getAttribute('data-index');
    datum = data[idx];
    arr = Array(n).fill();
    for (let i = 0; i < n; i++) {
      arr[i] = datum[ctgs[i]];
    }
  }

  // for non-number types, directly summarize
  const type = row.getAttribute('data-type');
  if (type !== 'num') {
    info = getFieldInfo(arr, type);
    row.cells[1].innerHTML = info;
    row.cells[1].title = info;
    return;
  }

  // populate reference array
  if (refarr == null) {
    idx = mo.cols.names.indexOf(row.getAttribute('data-refcol'));
    if (idx !== -1) {
      datum = data[idx];
      refarr = Array(n).fill();
      for (let i = 0; i < n; i++) {
        refarr[i] = datum[ctgs[i]];
      }
    }
  }

  // summarize a numberic column
  const met = row.getAttribute('data-metric');
  info = getFieldInfo(arr, type, met, 5, refarr);
  row.cells[1].innerHTML = info;
  row.cells[1].title = info;
}


/**
 * Generate a metric to summarize a field of multiple contigs.
 * @function getFieldInfo
 * @param {Array} arr - data column to describe
 * @param {string} type - type of column
 * @param {string} [met='none'] - metric (sum or mean)
 * @param {string} [deci=5] - digits after decimal point
 * @param {string} [refarr] - reference column for weighting
 */
function getFieldInfo(arr, type, met, deci, refarr) {
  const isRef = Array.isArray(refarr);
  met = met || 'none';
  deci = deci || 5;
  let res = 0;
  let x;
  switch (type) {

    case 'num':
      switch (met) {
        case 'sum':
          if (!isRef) res = arrSum(arr);
          else res = arrProdSum(arr, refarr);
          break;
        case 'mean':
          if (!isRef) res = arrMean(arr);
          else res = arrProdSum(arr, refarr) / arrSum(refarr);
          break;
      }
      res = formatNum(res, deci);
      break;

    case 'cat':
      x = objMinMax(listCats(arr));
      const frac = x[1][1] / arr.length;

      // majority rule
      res = (frac > 0.5) ? (x[1][0] + ' (' + (frac * 100).toFixed(2)
        .replace(/\.?0+$/, '') + '%)') : 'ambiguous';
      break;

    case 'fea':
      x = listFeas(arr);
      const a = [];
      Object.keys(x).sort().forEach(k => {
        if (x[k] === 1) a.push(k);
        else a.push(k + '(' + x[k] + ')');
      });
      res = a.join(', ');
      break;
  }
  return res;

}
