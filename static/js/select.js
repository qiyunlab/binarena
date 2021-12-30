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

  /** Invert selection. */
  byId('invert-btn').addEventListener('click', function () {
    if (!mo.cache.npick) return;
    const pick = mo.picked,
          mask = mo.masked;
    let m = 0;
    const n = mo.cache.nctg;
    for (let i = 0; i < n; i++) {
      if (!mask[i]) pick[i] = !pick[i];
      if (pick[i]) m++;
    }
    mo.cache.npick = m;
    toastMsg(`Selected ${plural('contig', m)}.`, mo.stat);
    updateSelection(mo);
    mo.rena.focus();
  });

  /** Mask selection. */
  byId('mask-btn').addEventListener('click', function () {
    if (!mo.cache.npick) return;
    const pick = mo.picked,
          mask = mo.masked;
    let m = 0;
    const n = mo.cache.nctg;
    for (let i = 0; i < n; i++) {
      if (pick[i]) {
        mask[i] = true;
        pick[i] = false;
        m ++;
      }
    }
    mo.cache.npick -= m;
    mo.cache.nmask += m;
    toastMsg(`Masked ${plural('contig', m)}.`, mo.stat);
    prepDataForDisplay(mo);
    updateLegends(mo);
    renderArena(mo);
    updateSelection(mo);
    mo.rena.focus();
  });

  /** Clear mask. */
  byId('clear-mask-btn').addEventListener('click', function () {
    mo.masked.fill(false);
    mo.cache.nmask = 0;
    prepDataForDisplay(mo);
    updateLegends(mo);
    renderArena(mo);
    updateMaskCtrl(mo);
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

  // Toggle summary metric (sum or mean).
  byId('info-metric-btn').addEventListener('click', function () {
    const row = byId('info-table').rows[
      this.parentElement.getAttribute('data-row')];
    if (row.getAttribute('data-met') === 'sum') {
      row.setAttribute('data-met', 'mean');
      this.innerHTML = '<span style="text-decoration: overline;">' +
        '<i>x</i></span>';
    } else {
      row.setAttribute('data-met', 'sum');
      this.innerHTML = '&Sigma;<i>x</i>';
    }
    updateInfoRow(row, mo);
  });

  // Weight variable by reference.
  byId('info-ref-sel').addEventListener('change', function () {
    const row = byId('info-table').rows[this.parentElement
      .parentElement.getAttribute('data-row')];
    row.setAttribute('data-ref', this.value);
    updateInfoRow(row, mo);
    this.blur();
  });

  // Plot variable.
  byId('info-plot-btn').addEventListener('click', function () {
    const div = this.parentElement;
    const idx = byId('info-table').rows[div.getAttribute('data-row')]
      .getAttribute('data-idx');
    mo.mini.field = idx;
    byId('mini-field-sel').value = idx;
    updateMiniPlot(mo);
    byId('mini-canvas').parentElement.classList.remove('hidden');
  });

  // Hide variable
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
 * @param {Object} mo - main object
 * @param {boolean} shift - whether Shift key is processed
 * @description If Shift key is pressed, the contigs will be added to the
 * existing selection; otherwise, they will become a new selection.
 */
function treatSelection(ctgs, mo, shift) {
  const pick = mo.picked;
  const n = ctgs.length;

  // new selection
  if (!shift) {
    pick.fill(false);
    mo.cache.npick = n;
    for (let i = 0; i < n; i++) {
      pick[ctgs[i]] = true;
    }
    toastMsg(`Selected ${plural('contig', n)}.`, mo.stat);
  }

  // add to selection
  else {
    let ctg;
    let m = 0;
    for (let i = 0; i < n; i++) {
      ctg = ctgs[i];
      if (!pick[ctg]) {
        pick[ctg] = true;
        m++;
      }
    }
    mo.cache.npick += m;
    toastMsg(`Added ${plural('contig', n)} to selection.`, mo.stat);
  }

  updateSelection(mo);
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
  updateInfoTable(mo);
  updateMaskCtrl(mo);
}


/**
 * Update masking controls.
 * @function updateMaskCtrl
 * @param {Object} mo - main object
 */
function updateMaskCtrl(mo) {
  const n = mo.cache.nmask;
  byId('masked-span').innerHTML = `Masked: ${n}`;
  byId('clear-mask-btn').classList.toggle('hidden', !n);
}


/**
 * Build info table based on the dataset and selected contigs.
 * @function buildInfoTable
 * @param {Object} mo - main object
 * @description It re-draws the entire info table to reflect updates in the
 * dataset (e.g., loaded a new dataset; added a new column).
 * 
 * Fields (rows) displayed in the table are determined based on the type and
 * names of data fields.
 * 
 * Each row of the table has five data attributes:
 * - idx: index of data field that is displayed
 * - ref: index of data field that serves as reference
 * - met: how to summarize multiple values; sum or mean
 */
function buildInfoTable(mo) {
  const table = byId('info-table');

  // temporarily move control span
  const div = byId('info-ctrl');
  div.classList.add('hidden');

  // reference selection
  const sel = byId('info-ref-sel');
  sel.innerHTML = '';

  // empty option - clear
  sel.add(document.createElement('option'));

  // clear table
  table.innerHTML = '';

  const names = mo.cols.names,
        types = mo.cols.types;
  const lencol = mo.cache.speci.len;

  // create rows
  const n = names.length;
  let name, type, row, metric;
  for (let i = 1; i < n; i++) {
    name = names[i];
    type = types[i];

    // weights are not displayed
    if (type.endsWith('wt')) continue;

    // add numeric field to reference selection
    if (type === 'num') {
      const opt = document.createElement('option');
      opt.text = name;
      opt.value = i;
      sel.add(opt);
    }

    // create row
    row = table.insertRow(-1);
    row.setAttribute('data-idx', i);

    // 1st cell: field name
    const cell = row.insertCell(-1);
    cell.innerHTML = name;

    // 2nd cell: field value
    row.insertCell(-1);

    // numeric: guess which metric may best describe the field
    if (type === 'num') {
      metric = guessColMetric(name);

      // with reference (default: length)
      if (metric.endsWith('by')) {
        row.setAttribute('data-met', metric.substring(0, metric.length - 2));
        row.setAttribute('data-ref', lencol);
      }

      // no reference
      else {
        row.setAttribute('data-met', metric);
        row.setAttribute('data-ref', 0);
      }
    }

    // categorical: weight by length, metric not relevant
    else if (type === 'cat') {
      row.setAttribute('data-ref', lencol);
    }

    // row hover event: append control span
    row.addEventListener('mouseenter', function () {
      if (document.activeElement === sel) return false;

      // three DOMs: metric (sum or mean), reference selection, plotting
      // the 4th and permanent button is "hide"
      const mbtn = byId('info-metric-btn'),
            pbtn = byId('info-plot-btn'),
            span = byId('info-ref-span');

      // only one contig is selected, then no need for controls
      if (mo.cache.npick < 2) {
        for (let dom of [mbtn, pbtn, span]) dom.classList.add('hidden');
      }

      // multiple contigs are selected
      else {
        const type = mo.cols.types[parseInt(this.getAttribute('data-idx'))];

        // numeric fields need all controls
        if (type === 'num') {
          const metric = this.getAttribute('data-met');
          mbtn.title = 'Metric: ' + metric;
          sel.value = this.getAttribute('data-ref');
          mbtn.innerHTML = (metric === 'sum') ? '&Sigma;<i>x</i>' :
            '<span style="text-decoration: overline;"><i>x</i></span>';
          for (let dom of [mbtn, pbtn, span]) dom.classList.remove('hidden');
        }

        // categorical fields need only weight
        else if (type === 'cat') {
          sel.value = this.getAttribute('data-ref');
          span.classList.remove('hidden');
          for (let dom of [mbtn, pbtn]) dom.classList.add('hidden');
        }

        // other types don't
        else {
          for (let dom of [mbtn, pbtn, span]) dom.classList.add('hidden');
        }
      }

      // append controls to row
      div.setAttribute('data-row', this.rowIndex);
      const rect = this.getBoundingClientRect();
      div.style.top = rect.top + 'px';
      div.classList.remove('hidden');
    });

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
 */
function updateInfoTable(mo) {
  const table = byId('info-table');
  const npick = mo.cache.npick;
  const data = mo.data,
        pick = mo.picked;
  const types = mo.cols.types;

  // display count in info panel head
  const label = `Selected: ${npick}`;

  // no contig is selected
  if (npick === 0) {
    byId('info-head-btn').innerHTML = label;
    table.classList.add('hidden');
  }

  // single contig
  else if (npick === 1) {

    // find that contig
    const i = pick.indexOf(true);

    // append contig Id to panel head
    byId('info-head-btn').innerHTML = label + ` (ID: ${data[0][i]})`;

    // display contig information
    let idx;
    for (let row of table.rows) {
      idx = parseInt(row.getAttribute('data-idx'));
      row.cells[1].innerHTML = value2Str(data[idx][i], types[idx]);
      row.cells[1].title = '';
    }
    table.classList.remove('hidden');
  }

  // multiple contigs
  else {
    byId('info-head-btn').innerHTML = label;
    const n = mo.cache.nctg;
    const picked = [];
    for (let i = 0; i < n; i++) {
      if (pick[i]) picked.push(i);
    }
    for (let row of table.rows) {
      updateInfoRow(row, mo, picked);
    }
    table.classList.remove('hidden');
  }
}


/**
 * Update one piece of information of selected contigs.
 * @function updateInfoRow
 * @param {Object} row - one row in the info table
 * @param {Object} mo - main object
 * @param {Array} [picked] - indices of selected contigs
 * @description An explicitly supplied `picked` can save compute. This design
 * may or may not be most optimal though.
 */
function updateInfoRow(row, mo, picked) {

  // find selected contigs
  let n;
  if (picked == null) {
    picked = [];
    const pick = mo.picked;
    n = mo.cache.nctg;
    for (let i = 0; i < n; i++) {
      if (pick[i]) picked.push(i);
    }
  }

  // locate data column
  const idx = parseInt(row.getAttribute('data-idx'));
  const ref = parseInt(row.getAttribute('data-ref'));
  const metric = row.getAttribute('data-met');
  const type = mo.cols.types[idx];

  // descriptive field can't be summarized
  if (type === 'des') return;

  n = picked.length;
  const arr = Array(n);
  const data = mo.data;
  const col = data[idx];

  // just data, no reference
  // feature set field doesn't need reference
  if (type === 'fea' || !ref) {
    for (let i = 0; i < n; i++) {
      arr[i] = col[picked[i]];
    }
    const [text, comment] = summFieldInfo(arr, type, metric);
    row.cells[1].innerHTML = text;
    row.cells[1].title = comment;
  }

  // data and reference
  else {
    const rarr = Array(n);
    const rcol = data[ref];
    let ctg;
    for (let i = 0; i < n; i++) {
      ctg = picked[i];
      arr[i] = col[ctg];
      rarr[i] = rcol[ctg];
    }
    const [text, comment] = summFieldInfo(arr, type, metric, 3, rarr);
    row.cells[1].innerHTML = text;
    row.cells[1].title = comment;
  }
}


/**
 * Summarize a field of multiple contigs.
 * @function summFieldInfo
 * @param {Array} arr - data array to describe
 * @param {string} type - field type
 * @param {string} [metric='mean'] - metric for numeric field (sum or mean)
 * @param {string} [deci=3] - digits after decimal point
 * @param {string} [rarr] - reference data array
 * @param {string} [warr] - weight data array
 * @returns {[string, string]} descriptive text and comment
 * @todo The weights are currently not in use.
 */
function summFieldInfo(arr, type, metric, deci, rarr, warr) {
  metric = metric || 'mean';
  deci = deci || 3;
  const noref = rarr === undefined;
  const nowei = warr === undefined;
  const issum = metric === 'sum';
  let text = '', comment = '';

  switch (type) {
    case 'num':
      let val, n, _;
      if (noref) {
        if (issum) [val, n] = arrSumN(arr);
        else [val, n] = arrMeanN(arr);
      } else {
        if (issum) [val, _, n] = arrProdSumN(arr, rarr);
        else [val, _, n] = arrProdMeanN(arr, rarr);
      }

      // round number
      text = val.toFixed(deci).replace(/\.?0+$/, '');
      comment = `${noref ? '' : 'weighted '}${metric} of ${n} values`;
      break;

    case 'cat':
      let top;  // most frequent category
      let freq; // (weighted) number of contigs in this category
      let frac; // (weighted) fraction of contigs in this category
      if (noref) {
        [top, freq] = objMax(listCats(arr));
        frac = freq / arr.length;
      } else {
        const [freqs, rsum] = listCatsW(arr, rarr);
        [top, freq] = objMax(freqs);
        frac = freq / rsum;
      }
      if (frac === 1) {
        text = top;
        comment = `uniform category`;
      } else {
        // convert fraction to percentage
        const perc = (frac * 100).toFixed(2).replace(/\.?0+$/, '');
        // find top category by majority rule
        if (frac > 0.5) {
          text = `${top} (${perc}%)`;
          comment = `${noref ? '' : 'weighted '}majority category`;
        }
        // ambiguity - no category is majority
        else {
          text = 'ambiguous';
          comment = `no category is ${noref ? '' : 'weighted '}majority; ` +
            `most frequent: ${top} (${perc}%)`;
        }
      }
      break;

    case 'fea':
      text = summFeas(arr);
      break;
  }
  return [text, capital(comment)];
}
