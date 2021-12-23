"use strict";

/**!
 * @module binning
 * @file Binning functions.
 * @description This module implements functions related to binning.
 */


function initBinCtrl(mo) {
  const view = mo.view,
        stat = mo.stat;

  /**
   * Top bar of bin panel, including binning plan and save button.
   */

  // load bins from a categorical field
  byId('plan-sel-txt').addEventListener('click', function () {
    const cols = Object.keys(view.categories).sort();
    listSelect(['(clear)'].concat(cols), this, 'down', true);
  });

  byId('plan-sel-txt').addEventListener('focus', function () {
    const plan = this.value

    // empty option: unload any binning plan
    if (plan === '(clear)') {
      this.value = '';
      this.setAttribute('data-col', '');
      mo.bins = {};
    }

    // load an existing binning plan
    else {
      const idx = mo.data.cols.indexOf(plan);
      if (idx === -1) return;
      if (idx === this.getAttribute('data-col')) return;
      this.setAttribute('data-col', idx);
      mo.bins = loadBins(mo.data.df, idx);
    }

    // update interface
    updateBinTable(mo);
    updateBinCtrl(mo);
    byId('save-plan-btn').classList.add('hidden');
    const n = Object.keys(mo.bins).length;
    if (n === 0) return;
    toastMsg(`Loaded ${n} bins from "${plan}".`, stat);
  });

  byId('plan-sel-txt').addEventListener('input', function () {
    byId('save-plan-btn').classList.remove('hidden');
  });

  // save current binning plan
  byId('save-plan-btn').addEventListener('click', function () {
    const plan = byId('plan-sel-txt').value;
    if (plan === '') return;
    const bins = mo.bins;
    if (Object.keys(bins).length === 0) {
      toastMsg('Error: The current binning plan has no bin.', stat);
      return;
    }

    // generate a contig-to-bin map
    const df = mo.data.df;
    const map = {};
    let bin, ctg;
    let dups = [];
    for (bin in bins) {
      for (ctg in bins[bin]) {
        if (ctg in map) dups.push(ctg);
        else map[ctg] = bin;
      }
    }

    // report ambiguous assignments
    dups = arrUniq(dups);
    let n = dups.length;
    if (n > 0) {
      treatSelection(dups, 'new', false, mo);
      toastMsg(`Error: ${n} contigs were assigned to non-unique bins. 
        They are now selected.`, stat);
      return;
    }

    // create a new categorical field
    const idx = mo.data.cols.indexOf(plan);
    n = df.length;
    if (idx === -1) {
      mo.data.cols.push(plan);
      mo.data.types.push('category');
      for (let i = 0; i < n; i++) {
        df[i].push(i in map ? [map[i], null] : null);
      }
      updateControls(mo.data, mo.view);
      fillDataTable(mo.data, n);
      toastMsg(`Saved to new binning plan "${plan}".`, stat);
    }

    // overwrite an existing categorical field
    else {
      for (let i = 0; i < n; i++) {
        df[i][idx] = (i in map ? [map[i], null] : null);
      }
      updateControls(mo.data, mo.view);
      fillDataTable(mo.data, n);
      toastMsg(`Overwritten binning plan "${plan}".`, stat);
    }
  });


  /**
   * Bin panel toolbar.
   */

  // create an empty new bin
  byId('new-empty-bin-btn').addEventListener('click', function () {
    const name = createBin(mo.bins);
    updateBinTable(mo);
    updateBinCtrl(mo);
    const table = byId('bin-tbody');
    selectBin(table, name);
    toastMsg(`Created "${name}".`, stat);
  });

  // delete current bin
  byId('delete-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const deleted = deleteBins(table, mo.bins)[0];
    
    // update interface
    updateBinCtrl(mo);
    const n = deleted.length;
    if (n === 1) toastMsg(`Deleted "${deleted[0]}".`, stat);
    else toastMsg(`Deleted ${plural('bin', n)}.`, stat);
  });

  // merge currently selected bins
  byId('merge-bins-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [bins, ctgs] = deleteBins(table, mo.bins);
    const name = createBin(mo.bins);
    addToBin(ctgs, mo.bins[name]);
    updateBinTable(mo);
    updateBinCtrl(mo);
    selectBin(table, name);
    const n = bins.length;
    if (n === 2) toastMsg(`Merged "${bins[0]}" and "${bins[1]}" into 
      "${name}".`, stat, 2000);
    else toastMsg(`Merged ${plural('bin', n)} into "${name}".`, stat, 2000);
  });

  // export current binning plan
  byId('export-plan-btn').addEventListener('click', function () {
    exportBins(mo.bins, mo.data);
  });


  /**
   * Info panel toolbar (related to binning)
   */

  // Create a new bin from selected contigs.
  byId('as-new-bin-btn').addEventListener('click', function () {
  
    // if there is no binning plan, create one
    if (Object.keys(mo.bins).length === 0) {
      byId('plan-sel-txt').value = newName(arr2obj(mo.data.cols), 'plan');
    }

    // create a new bin
    const name = createBin(mo.bins);

    // if one or multiple contigs are selected, add them to bin
    const ctgs = Object.keys(mo.pick);
    const n = ctgs.length;
    if (n > 0) {
      addToBin(ctgs, mo.bins[name]);
      mo.pick = {};
      updateSelection(mo);
    }
    updateBinTable(mo);
    updateBinCtrl(mo);
    const table = byId('bin-tbody');
    selectBin(table, name);
    toastMsg(`Created "${name}" (with ${plural('contig', n)}).`, stat);
  });

  // Add selected contigs to current bin.
  byId('add-to-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idx, bin] = currentBin(table);
    if (idx == null) return;
    const ctgs = Object.keys(mo.pick);
    if (ctgs.length === 0) return;
    const exist = mo.bins[bin];
    const added = addToBin(ctgs, exist);
    const n = added.length;
    if (n > 0) updateBinRow(table.rows[idx], exist, mo);
    toastMsg(`Added ${plural('contig', n)} to "${bin}".`, stat);
  });


  // Remove selected contigs from current bin.
  byId('remove-from-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idx, bin] = currentBin(table);
    if (idx == null) return;
    const ctgs = Object.keys(mo.pick);
    if (ctgs.length === 0) return;
    const exist = mo.bins[bin];
    const removed = removeFromBin(ctgs, exist);
    updateBinCtrl(mo);
    const n = removed.length;
    if (n > 0) updateBinRow(table.rows[idx], exist, mo);
    toastMsg(`Removed ${plural('contig', n)} from "${bin}".`, stat);
  });


  /** Update current bin with selected contigs. */
  byId('update-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idx, bin] = currentBin(table);
    if (idx == null) return;
    if (Object.keys(mo.pick).length === 0) return;
    mo.bins[bin] = {};
    const ctgs = mo.bins[bin];
    for (let ctg in mo.pick) ctgs[ctg] = null;
    updateBinCtrl(mo);
    const n = Object.keys(ctgs).length;
    updateBinRow(table.rows[idx], ctgs, mo);
    toastMsg(`Updated "${bin}" (now has ${plural('contig', n)}).`, stat);
  });


  /**
   * Bin table events.
   */

  byId('bin-tbody').addEventListener('click', function (e) {
    // prevent table text from being selected
    this.onselectstart = () => false;

    let cell, label, text, selected;
    for (let row of this.rows) {
      cell = row.cells[0];
      label = cell.firstElementChild;
      text = cell.lastElementChild;
      if (row.contains(e.target)) { // bin being clicked
        if (row.classList.contains('current') &&
          cell.contains(e.target)) {
          label.classList.add('hidden');
          text.classList.remove('hidden');
          text.focus();
        } else if (row.classList.contains('selected')) {
          row.classList.remove('selected');
          row.classList.remove('current');
        } else {
          row.classList.add('selected');
          row.classList.add('current');
          selected = label.innerHTML;
        }
      } else { // all other bins
        row.classList.remove('current');
        label.classList.remove('hidden');
        text.classList.add('hidden');
        // when Shift is pressed, append instead of replace
        if (!e.shiftKey) row.classList.remove('selected');
      }
    }
    updateBinCtrl(mo);

    // select contigs in bin
    if (selected !== undefined) {
      mo.pick = {};
      for (let i in mo.bins[selected]) mo.pick[i] = null;
      updateSelection(mo);
    }
  });

}


/**
 * Update binning controls.
 * @function updateBinCtrl
 * @param {Object} mo - main object
 */
function updateBinCtrl(mo) {
  // number of bins
  const n = Object.keys(mo.bins).length;

  // update save plan button
  const txt = byId('plan-sel-txt');
  const btn = byId('save-plan-btn');
  btn.classList.toggle('hidden', !n);
  const col = mo.data.cols[txt.getAttribute('data-col')];
  if (col == txt.value) btn.title = `Overwrite binning plan "${col}"`;
  else btn.title = `Save current binning plan as "${txt.value}"`;

  // update bins panel head
  byId('bins-head').lastElementChild.firstElementChild
    .innerHTML = 'Bins: ' + n;

  byId('export-plan-btn').classList.toggle('hidden', !n);
  byId('bin-thead').classList.toggle('hidden', !n);

  // number of selected bins
  let m = 0;
  for (let row of byId('bin-tbody').rows) {
    if (row.classList.contains('selected')) m ++;
  }

  byId('delete-bin-btn').classList.toggle('hidden', !m);
  byId('merge-bins-btn').classList.toggle('hidden', (m < 2));

  const k = Object.keys(mo.pick).length;
  byId('as-new-bin-btn').classList.toggle('hidden', !k);
  byId('add-to-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('remove-from-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('update-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('invert-btn').classList.toggle('hidden', !k);
  byId('mask-btn').classList.toggle('hidden', !k);
}


/**
 * Update the entire bin table.
 * @function updateBinTable
 * @param {Object} mo - main object
 */
function updateBinTable(mo) {
  const view = mo.view,
        data = mo.data,
        bins = mo.bins;
  const table = byId('bin-tbody');
  table.innerHTML = '';

  // cache length and coverage data
  const lens = {},
        covs = {};
  if (view.spcols.len || view.spcols.cov) {
    const ilen = view.spcols.len ? view.spcols.len : null,
          icov = view.spcols.cov ? view.spcols.cov : null;
    const df = data.df;
    const n = df.length;
    for (let i = 0; i < n; i++) {
      if (ilen) lens[i] = df[i][ilen];
      if (icov) covs[i] = df[i][icov];
    }
  }

  Object.keys(bins).sort().forEach(function (name) {
    const row = table.insertRow(-1);

    // 1st cell: bin name
    let cell = row.insertCell(-1);

    // name label
    const label = document.createElement('span');
    label.title = label.innerHTML = name;
    cell.appendChild(label);

    // rename text box
    const text = document.createElement('input');
    text.type = 'text';
    text.value = name;
    text.classList.add('hidden');
    text.addEventListener('focus', function () {
      this.select();
    });
    text.addEventListener('keyup', function (e) {
      binNameKeyUp(e, mo.stat, mo.bins);
    });
    cell.appendChild(text);

    // 2nd cell: number of contigs
    cell = row.insertCell(-1);
    cell.innerHTML = Object.keys(bins[name]).length;

    // 3rd cell: total length (kb)
    cell = row.insertCell(-1);
    if (view.spcols.len) {
      let sum = 0;
      for (let i in bins[name]) sum += lens[i];
      cell.innerHTML = Math.round(sum / 1000);
    } else cell.innerHTML = 'na';
    
    // 4th cell: relative abundance (%)
    cell = row.insertCell(-1);
    if (view.spcols.len && view.spcols.cov) {
      let sum = 0;
      for (let i in bins[name]) sum += lens[i] * covs[i];
      cell.innerHTML = (sum * 100 / view.abundance).toFixed(2);
    } else cell.innerHTML = 'na';
  });
}


/**
 * Update one row in the bin table.
 * @function updateBinRow
 * @param {Object} row - row in the bin table
 * @param {Object} ctgs - contigs in the bin
 * @param {Object} mo - main object
 */
function updateBinRow(row, ctgs, mo) {
  const cells = row.cells;

  // 2nd cell: number of contigs
  cells[1].innerHTML = Object.keys(ctgs).length;
    
  // stop if no length
  const view = mo.view;
  const ilen = view.spcols.len;
  if (!ilen) {
    cells[2].innerHTML = 'na';
    cells[3].innerHTML = 'na';
    return;
  }

  // 3rd cell: total length (kb)
  const df = mo.data.df;
  const icov = view.spcols.cov;
  let sumlen = 0;
  if (!icov) {
    for (let ctg in ctgs) sumlen += df[ctg][ilen];
    cells[2].innerHTML = Math.round(sumlen / 1000);
    cells[3].innerHTML = 'na';
    return;
  }

  // 4th cell: relative abundance (%)
  const totabd = view.abundance;
  let sumabd = 0;
  let datum, len;
  for (let ctg in ctgs) {
    datum = df[ctg];
    len = datum[ilen];
    sumlen += len;
    sumabd += len * datum[icov];
  }
  cells[2].innerHTML = Math.round(sumlen / 1000);
  cells[3].innerHTML = (sumabd * 100 / totabd).toFixed(2);
}


/**
 * Bin name textbox keyup event.
 * @function binNameKeyUp
 * @param {Object} e - event object
 * @param {Object} stat - status object
 * @param {Object} bins - binning plan
 */
function binNameKeyUp(e, stat, bins) {
  const text = e.target;
  const label = text.parentElement.firstElementChild;
  const name = label.innerHTML;
  if (e.key === 'Enter') { // save new name
    if (text.value === '') {
      text.value = name;
      toastMsg('Bin name must not be empty.', stat)
    } else if (text.value === name) {
      text.classList.add('hidden');
      label.classList.remove('hidden');
    } else {
      const success = renameBin(bins, name, text.value);
      if (success) {
        text.classList.add('hidden');
        label.innerHTML = text.value;
        label.classList.remove('hidden');
      } else {
        toastMsg(`Bin name "${text.value}" already exists.`, stat);
        text.value = name;
      }
    }
  } else if (e.key === 'Esc' || e.key === 'Escape') { // cancel editing
    text.classList.add('hidden');
    label.classList.remove('hidden');
  }
}


/**
 * @summary Binning operations
 * - Create a new bin.
 * - Rename a bin.
 * - Find current bin.
 * - Add contigs to a bin.
 * - Remove contigs from a bin.
 * - Delete selected bins.
 * - Load bins from a categorical field.
 */

/**
 * Create a new bin.
 * @function createBin
 * @param {Object} bins - current bins
 * @param {string} [name] - bin name
 * @throws if bin name exists
 * @returns {string} bin name
 */
function createBin(bins, name) {
  if (name === undefined) {
    name = newName(bins, 'bin');
  } else if (name in bins) {
    throw `Error: bin name "${name}" already exists.`;
  }
  bins[name] = {};
  return name;
}


/**
 * Rename a bin.
 * @function renameBin
 * @param {Object} bins - bins
 * @param {string} oldname - old bin name
 * @param {string} newname - new bin name
 * @returns {boolean} whether renaming is successful
 */
function renameBin(bins, oldname, newname) {
  if (newname in bins) return false;
  bins[newname] = {};
  for (let ctg in bins[oldname]) {
    bins[newname][ctg] = null;
  }
  delete bins[oldname];
  return true;
}


/**
 * Find current bin.
 * @function currentBin
 * @param {Object} table - bin table
 * @returns {[number, string]} row index and name of current bin, or both null
 * if no bin is current
 */
function currentBin(table) {
  let idx;
  const rows = table.rows;
  const n = rows.length;
  for (let i = 0; i < n; i++) {
    if (rows[i].classList.contains('current')) {
      idx = i;
      break;
    }
  }
  if (idx === undefined) return [null, null];
  const bin = rows[idx].cells[0].firstElementChild.innerHTML;
  return [idx, bin];
}


/**
 * Add contigs to a bin.
 * @function addToBin
 * @param {number[]} ctgs - contig indices
 * @param {Object} bin - target bin
 * @returns {number[]} indices of added contigs
 */
function addToBin(ctgs, bin) {
  const added = [];
  const n = ctgs.length;
  let ctg;
  for (let i = 0; i < n; i++) {
    ctg = ctgs[i];
    if (!(ctg in bin)) {
      bin[ctg] = null;
      added.push(ctg);
    }
  }
  return added;
}


/**
 * Remove contigs from a bin.
 * @function removeFromBin
 * @param {number[]} ctgs - contig indices
 * @param {Object} bin - target bin
 * @returns {number[]} indices of removed contigs
 */
function removeFromBin(ctgs, bin) {
  const removed = [];
  const n = ctgs.length;
  let ctg;
  for (let i = 0; i < n; i++) {
    ctg = ctgs[i];
    if (ctg in bin) {
      delete bin[ctg];
      removed.push(ctg);
    }
  }
  return removed;
}


/**
 * Delete selected bins.
 * @function deleteBins
 * @param {Object} table - bin table
 * @param {Object} bins - bins object
 * @throws error if no bin is selected
 * @returns {[string[]], [number[]]} deleted bins and their contigs
 */
function deleteBins(table, bins) {

  // identify bins to delete (from bottom to top of the table)
  const todel = [];
  const rows = table.rows;
  let row;
  for (let i = rows.length - 1; i >= 0; i--) {
    row = rows[i];
    if (row.classList.contains('selected')) {
      todel.push(row.cells[0].firstElementChild.innerHTML);
      table.deleteRow(i);
    }
  }
  if (todel.length === 0) throw 'Error: No bin is selected.';

  // delete bins while listing affected bins and contigs
  const ctgs = {};
  const n = todel.length;
  let bin, ctg;
  for (let i = 0; i < n; i++) {
    bin = todel[i];
    for (ctg in bins[bin]) ctgs[ctg] = null;
    delete bins[bin];
  }
  return [todel, Object.keys(ctgs).sort()];
}


/**
 * Programmatically select a bin in the bin table.
 * @function selectBin
 * @param {Object} table - bin table
 * @param {string} bin - bin name
 */
function selectBin(table, bin) {
  for (let row of table.rows) {
    if (row.cells[0].firstElementChild.innerHTML === bin) {
      row.click();
      break;
    }
  }
}


/**
 * Load bins from a categorical field.
 * @function loadBin
 * @param {Object} df - data frame
 * @param {number} idx - field index
 * @returns {Object} bins object
 */
function loadBins(df, idx) {
  let val, cat;
  const bins = {};
  const n = df.length;
  for (let i = 0; i < n; i++) {
    val = df[i][idx];
    if (val !== null) {
      cat = val[0];
      if (!(cat in bins)) bins[cat] = {};
      bins[cat][i] = null;
    }
  }
  return bins;
}


/**
 * Export bins as a plain text file.
 * @function exportBins
 * @param {Object} bins - bins object to export
 * @param {Object} data - data object to refer to
 * @description The output file format is like:
 * bin1 <tab> ctg4,ctg15,ctg23
 * bin2 <tab> ctg12,ctg18
 * bin4 <tab> ctg3,ctg5,ctg20
 * ...
 */
 function exportBins(bins, data) {
  const idmap = {};
  const df = data.df;
  const n = df.length;
  for (let i = 0; i < n; i++) {
    idmap[i] = df[i][0];
  }
  let tsv = '';
  Object.keys(bins).sort().forEach(name => {
    tsv += (name + '\t' + Object.keys(bins[name]).sort().map(
      i => idmap[i]).join(',') + '\n');
  });
  const a = document.createElement('a');
  a.href = "data:text/tab-separated-values;charset=utf-8," +
    encodeURIComponent(tsv);
  a.download = 'bins.tsv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
