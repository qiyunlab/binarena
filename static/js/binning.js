"use strict";

/**!
 * @module binning
 * @file Binning functions.
 * @description This module implements functions related to binning.
 */


/**
 * Initialize binning controls.
 * @function initBinCtrl
 * @param {Object} mo - main object
 */
function initBinCtrl(mo) {
  const data = mo.data,
        cols = mo.cols,
        stat = mo.stat;
  const names = cols.names,
        types = cols.types;

  // prevent table text from being selected
  byId('bin-tbody').onselectstart = () => false;


  /**
   * Top bar of bin panel, including binning plan and save button.
   */

  // load bins from a categorical field
  byId('plan-sel-txt').addEventListener('click', function () {
    const lst = listColsByType(cols, 'cat');
    listSelect([''].concat(lst), this, 'down', true);
  });

  byId('plan-sel-txt').addEventListener('focus', function () {
    const plan = this.value;

    // empty option: unload any binning plan
    if (plan === '') {
      this.setAttribute('data-col', '');
      mo.binned.fill('');
      mo.cache.binns.clear();
    }

    // load an existing binning plan
    else {
      const idx = names.indexOf(plan);
      if (idx === -1) return;
      if (idx == this.getAttribute('data-col')) return;
      this.setAttribute('data-col', idx);
      mo.binned = [...data[idx]];
      mo.cache.binns = new Set(mo.binned.filter(Boolean));
    }

    // update interface
    updateBinTable(mo);
    updateBinCtrl(mo);
    updateSavePlanBtn(mo, false);
    const n = mo.cache.binns.size;
    if (n === 0) return;
    toastMsg(`Loaded ${n} bins from "${plan}".`, stat);
    mo.olay.focus();
  });

  byId('plan-sel-txt').addEventListener('input', function () {
    updateSavePlanBtn(mo);
  });

  // save current binning plan
  byId('save-plan-btn').addEventListener('click', function () {
    const plan = byId('plan-sel-txt').value;
    if (plan === '') return;
    if (mo.cache.binns.size === 0) {
      toastMsg('Error: The current binning plan has no bin.', stat);
      return;
    }

    // create a new categorical field
    const idx = names.indexOf(plan);
    if (idx === -1) {
      data.push([...mo.binned]);
      names.push(plan);
      types.push('cat');
      updateControls(mo);
      buildDataTable(mo);
      toastMsg(`Saved to new binning plan "${plan}".`, stat);
    }

    // overwrite an existing categorical field
    else {
      // take care of weights
      // todo: make it nicer
      if (mo.cols.types[idx + 1] === 'cwt') {
        const n = mo.cache.nctg;
        const binned = mo.binned;
        const arr = data[idx];
        const wts = data[idx + 1];
        for (let i = 0; i < n; i++) {
          if (arr[i] !== binned[i]) {
            arr[i] = binned[i];
            wts[i] = NaN;
          }
        }
      } else data[idx] = [...mo.binned];
      updateControls(mo);
      toastMsg(`Overwritten binning plan "${plan}".`, stat);
    }

    // hide itself when done
    this.setAttribute('data-edit', 0);
    this.classList.add('hidden');
    mo.olay.focus();
  });


  /**
   * Bin panel toolbar.
   */

  // create an empty new bin
  byId('new-empty-bin-btn').addEventListener('click', function () {
    if (mo.cache.binns.size === 0) {
      byId('plan-sel-txt').value = newName(new Set(names), 'plan');
    }
    const name = createBin(mo.cache.binns);
    updateBinTable(mo);
    updateBinCtrl(mo);
    const table = byId('bin-tbody');
    selectBin(table, name);
    toastMsg(`Created "${name}".`, stat);
    mo.olay.focus();
  });

  // delete current bin(s)
  byId('delete-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [deleted, unbinned] = deleteBins(table, mo.cache.binns, mo.binned);

    // update interface
    updateBinCtrl(mo);
    updateSavePlanBtn(mo, true);
    const n = deleted.length;
    const suffix = plural('contig', unbinned.length);
    if (n === 1) toastMsg(`Deleted "${deleted[0]}" (${suffix}).`, stat);
    else toastMsg(`Deleted ${plural('bin', n)} (${suffix}).`, stat);
    mo.olay.focus();
  });

  // merge currently selected bins
  byId('merge-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [deleted, unbinned] = deleteBins(table, mo.cache.binns, mo.binned);
    const name = createBin(mo.cache.binns);
    const picked = Array(mo.cache.nctg).fill(false);
    for (let ctg of unbinned) picked[ctg] = true;
    addToBin(name, picked, mo.binned);
    updateBinTable(mo);
    updateBinCtrl(mo);
    updateSavePlanBtn(mo, true);
    selectBin(table, name);
    const n = deleted.length;
    const suffix = plural('contig', unbinned.length);
    if (n === 2) toastMsg(`Merged "${deleted[0]}" and "${deleted[1]}" into ` +
      `"${name}" (${suffix}).`, stat);
    else toastMsg(`Merged ${plural('bin', n)} into "${name}" (${suffix}).`,
      stat,);
    mo.olay.focus();
  });

  // remove masked contigs from all bins
  byId('mask-bin-btn').addEventListener('click', function () {
    const binned = mo.binned,
          masked = mo.masked;
    const n = mo.cache.nctg;
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (binned[i] && masked[i]) {
        binned[i] = '';
        count++;
      }
    }
    if (count > 0) {
      updateBinTable(mo);
      updateBinCtrl(mo);
    }
    toastMsg(`Removed ${plural('contig', count)} from bins.`, mo.stat);
    mo.olay.focus();
  });

  // show contig data in bins
  byId('bin-data-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idxes, names] = selectedBins(table);
    if (idxes.length === 0) return;
    const binned = mo.binned,
          tabled = mo.tabled;
    tabled.length = 0;
    const n = mo.cache.nctg;
    for (let i = 1; i < n; i++) {
      if (names.indexOf(binned[i]) !== -1) tabled.push(i);
    }
    const m = names.length;
    const title = (m === 1) ? names[0] : `${m} bins`;
    fillDataTable(mo, title);
    byId('data-table-modal').classList.remove('hidden');
  });

  // calculate silhouette coefficients
  byId('silhouet-a').addEventListener('click', function () {
    if (this.classList.contains('disabled')) return;
    updateCalcBoxCtrl(mo);
    byId('silh-modal').classList.remove('hidden');
  });

  // calculate adjusted Rand index
  byId('adj-rand-a').addEventListener('click', function () {
    if (this.classList.contains('disabled')) return;
    if (!this.value) {
      const lst = listColsByType(mo.cols, 'cat');
      listSelect(lst, this, 'left');
    } else {
      calcAdjRand(mo, this.value);
      this.value = '';
    }
  });

  // export current binning plan
  byId('export-plan-a').addEventListener('click', function () {
    exportBinPlan(mo.binned, data[0], byId('plan-sel-txt').value);
  });


  /**
   * Info panel toolbar (related to binning)
   */

  // Create a new bin from selected contigs.
  byId('as-new-bin-btn').addEventListener('click', function () {
    if (mo.cache.npick === 0) return;

    // if there is no binning plan, create one
    if (mo.cache.binns.size === 0) {
      byId('plan-sel-txt').value = newName(new Set(names), 'plan');
    }

    // create a new bin
    const name = createBin(mo.cache.binns);

    // if one or multiple contigs are selected, add them to bin
    const [added,] = addToBin(name, mo.picked, mo.binned);
    mo.picked.fill(false);
    mo.cache.npick = 0;
    updateSelection(mo);
    updateBinTable(mo);
    updateBinCtrl(mo);
    updateSavePlanBtn(mo, true);
    const table = byId('bin-tbody');
    selectBin(table, name);
    toastMsg(`Created "${name}" (${plural('contig', added.length)}).`, stat);
    mo.olay.focus();
  });

  // Add selected contigs to current bin.
  byId('add-to-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idx, name] = currentBin(table);
    if (idx == null) return;
    if (mo.cache.npick === 0) return;
    const [added, existing] = addToBin(name, mo.picked, mo.binned);
    const n = added.length;
    if (n > 0) {
      updateSavePlanBtn(mo, true);
      updateBinRow(table.rows[idx], added.concat(existing), mo);
    }
    toastMsg(`Added ${plural('contig', n)} to "${name}".`, stat);
    mo.olay.focus();
  });

  // Remove selected contigs from current bin.
  byId('remove-from-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idx, name] = currentBin(table);
    if (idx == null) return;
    if (mo.cache.npick === 0) return;
    const [removed, remaining] = removeFromBin(name, mo.picked, mo.binned);
    updateBinCtrl(mo);
    updateSavePlanBtn(mo, true);
    const n = removed.length;
    if (n > 0) {
      updateSavePlanBtn(mo, true);
      updateBinRow(table.rows[idx], remaining, mo);
    }
    toastMsg(`Removed ${plural('contig', n)} from "${name}".`, stat);
    mo.olay.focus();
  });

  // Update current bin with selected contigs.
  byId('update-bin-btn').addEventListener('click', function () {
    const table = byId('bin-tbody');
    const [idx, name] = currentBin(table);
    if (idx == null) return;
    if (mo.cache.npick === 0) return;
    const [added, removed, unchanged] = updateBinWith(
      name, mo.picked, mo.binned);
    updateBinCtrl(mo);
    const n = added.length, m = removed.length;
    if (n > 0 || m > 0) {
      updateBinRow(table.rows[idx], added.concat(unchanged), mo);
      updateSavePlanBtn(mo, true);
    }
    toastMsg(`Updated "${name}" (added ${plural('contig', n)}, removed ${
      plural('contig', m)}).`, stat);
    mo.olay.focus();
  });


  /**
   * Bin table events.
   */

  // Click column header to sort data.
  for (let head of byId('bin-thead').rows[0].cells) {
    head.addEventListener('click', function() {
      sortTableByHead(this);
    });
  }

  // Click bin to select; click again to edit its name.
  byId('bin-tbody').addEventListener('click', function (e) {
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
      const picked = mo.picked,
            masked = mo.masked,
            binned = mo.binned;
      let npick = 0;
      const n = mo.cache.nctg;
      for (let i = 0; i < n; i++) {
        if (binned[i] === selected && !masked[i]) {
          picked[i] = true;
          npick++;
        } else picked[i] = false;
      }
      mo.cache.npick = npick;
      updateSelection(mo);
      mo.olay.focus();
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
  const n = mo.cache.binns.size;

  // update bins panel head
  byId('bins-head-btn').innerHTML = 'Bins: ' + n;
  byId('bins-menu-wrap').classList.toggle('hidden', !n);
  byId('bin-thead').classList.toggle('hidden', !n);
  byId('mask-bin-btn').classList.toggle('hidden', !n || !mo.cache.nmask);

  // number of selected bins
  let m = 0;
  for (let row of byId('bin-tbody').rows) {
    if (row.classList.contains('selected')) m ++;
  }

  byId('delete-bin-btn').classList.toggle('hidden', !m);
  byId('merge-bin-btn').classList.toggle('hidden', (m < 2));
  byId('bin-data-btn').classList.toggle('hidden', !m);

  const k = mo.cache.npick;
  byId('as-new-bin-btn').classList.toggle('hidden', !k);
  byId('add-to-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('remove-from-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('update-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('invert-btn').classList.toggle('hidden', !k);
}


/**
 * Update the entire bin table.
 * @function updateBinTable
 * @param {Object} mo - main object
 */
function updateBinTable(mo) {
  const table = byId('bin-tbody');
  table.innerHTML = '';

  // group contigs by bin
  const bin2ctgs = {};
  for (let bin of mo.cache.binns) {
    bin2ctgs[bin] = [];
  }
  const binned = mo.binned;
  const n = mo.cache.nctg;
  let bin;
  for (let i = 0; i < n; i++) {
    bin = binned[i];
    if (bin) bin2ctgs[bin].push(i);
  }

  // create rows
  for (const [name, ctgs] of Object.entries(bin2ctgs)) {

    // create new row
    const row = table.insertRow(-1);

    // 1st cell: bin name
    const cell = row.insertCell(-1);

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
      binNameKeyUp(e, mo);
    });
    cell.appendChild(text);

    // create 2nd, 3rd and 4th cells
    row.insertCell(-1);
    row.insertCell(-1);
    row.insertCell(-1);

    // populate these cells
    updateBinRow(row, ctgs, mo);
  }
}


/**
 * Update one row in the bin table.
 * @function updateBinRow
 * @param {Object} row - row in the bin table
 * @param {Array} ctgs - indices of contigs in the bin
 * @param {Object} mo - main object
 */
function updateBinRow(row, ctgs, mo) {
  const cells = row.cells;

  // 2nd cell: number of contigs
  const n = ctgs.length;
  cells[1].innerHTML = n;

  // stop if no length
  const cache = mo.cache;
  const ilen = cache.splen;
  if (!ilen) {
    cells[2].innerHTML = 'na';
    cells[3].innerHTML = 'na';
    return;
  }

  // 3rd cell: total length (kb)
  const data = mo.data;
  const L = data[ilen];
  const icov = cache.spcov;
  let sumlen = 0;
  if (!icov) {
    for (let i = 0; i < n; i++) sumlen += L[ctgs[i]];
    cells[2].innerHTML = Math.round(sumlen / 1000);
    cells[3].innerHTML = 'na';
    return;
  }

  // 4th cell: relative abundance (%)
  const C = data[icov];
  const totabd = cache.abund;
  let sumabd = 0;
  let ctg, len;
  for (let i = 0; i < n; i++) {
    ctg = ctgs[i];
    len = L[ctg];
    sumlen += len;
    sumabd += len * C[ctg];
  }
  cells[2].innerHTML = Math.round(sumlen / 1000);
  cells[3].innerHTML = (sumabd * 100 / totabd).toFixed(2);
}


/**
 * Bin name textbox keyup event.
 * @function binNameKeyUp
 * @param {Object} e - event object
 * @param {Object} mo - main object
 * @description Checks binning plan names in real time while the user is
 * typing.
 */
function binNameKeyUp(e, mo) {
  const text = e.target;
  const label = text.parentElement.firstElementChild;
  const name = label.innerHTML;
  if (e.key === 'Enter') { // save new name
    const val = text.value;
    if (val === '') {
      text.value = name;
      toastMsg('Error: Bin name must not be empty.', mo.stat);
    } else if (val === name) {
      text.classList.add('hidden');
      label.classList.remove('hidden');
    } else {
      try {
        renameBin(name, val, mo.cache.binns, mo.binned);
        text.classList.add('hidden');
        label.innerHTML = val;
        label.classList.remove('hidden');
        updateSavePlanBtn(mo, true);
        mo.olay.focus();
      } catch (ex) {
        toastMsg(ex, mo.stat);
        text.value = name;
      }
    }
  } else if (e.key === 'Esc' || e.key === 'Escape') { // cancel editing
    text.classList.add('hidden');
    label.classList.remove('hidden');
  }
}


/**
 * Create a new bin.
 * @function createBin
 * @param {Set.<string>} binns - current bin names
 * @param {string} [name] - bin name
 * @throws if bin name exists
 * @returns {string} bin name
 */
function createBin(binns, name) {
  if (name === undefined) {
    name = newName(binns, 'bin');
  } else if (binns.has(name)) {
    throw new Error(`Bin name "${name}" already exists.`);
  }
  binns.add(name);
  return name;
}


/**
 * Rename a bin.
 * @function renameBin
 * @param {string} oldname - old bin name
 * @param {string} newname - new bin name
 * @param {Set} binns - current bin names
 * @param {string[]} binned - current binning plan
 * @returns {boolean} whether renaming is successful
 */
function renameBin(old, neo, binns, binned) {
  if (binns.has(neo)) throw new Error(`Bin name ${neo} already exists.`);
  binns.add(neo);
  binns.delete(old);
  const n = binned.length;
  for (let i = 0; i < n; i++) {
    if (binned[i] === old) binned[i] = neo;
  }
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
      row.scrollIntoView();
      row.click();
      break;
    }
  }
}


/**
 * Find current bin.
 * @function currentBin
 * @param {Object} table - bin table
 * @returns {[number, string]} row index and name of current bin, or both null
 * if no bin is current
 * @description At most one bin can be current; meanwhile there can be multiple
 * selected bins.
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
  const name = rows[idx].cells[0].firstElementChild.innerHTML;
  return [idx, name];
}


/**
 * Find selected bins.
 * @function selectedBins
 * @param {Object} table - bin table
 * @returns {[number[], string[]]} row indices and names of selected bins
 */
function selectedBins(table) {
  let idxes = [], names = [];
  const rows = table.rows;
  const n = rows.length;
  for (let i = 0; i < n; i++) {
    if (rows[i].classList.contains('selected')) {
      idxes.push(i);
      names.push(rows[i].cells[0].firstElementChild.innerHTML);
    }
  }
  return [idxes, names];
}


/**
 * Add selected contigs to a bin.
 * @function addToBin
 * @param {string} name - target bin name
 * @param {number[]} picked - contig selection
 * @param {string[]} binned - binning plan
 * @returns {number[], number[]} indices of added and existing contigs
 */
function addToBin(name, picked, binned) {
  const added = [], existing = [];
  const n = picked.length;
  for (let i = 0; i < n; i++) {
    if (binned[i] === name) {
      existing.push(i);
    } else if (picked[i]) {
      binned[i] = name;
      added.push(i);
    }
  }
  return [added, existing];
}


/**
 * Remove selected contigs from a bin.
 * @function removeFromBin
 * @param {string} name - target bin name
 * @param {number[]} picked - contig selection
 * @param {string[]} binned - binning plan
 * @returns {number[], number[]} indices of removed and remaining contigs
 */
function removeFromBin(name, picked, binned) {
  const removed = [], remaining = [];
  const n = picked.length;
  for (let i = 0; i < n; i++) {
    if (binned[i] === name) {
      if (picked[i]) {
        binned[i] = '';
        removed.push(i);
      } else {
        remaining.push(i);
      }
    }
  }
  return [removed, remaining];
}


/**
 * Update a bin with selected contigs.
 * @function updateBinWith
 * @param {string} name - target bin name
 * @param {number[]} picked - contig selection
 * @param {string[]} binned - binning plan
 * @returns {number[], number[]} indices of added and removed contigs
 */
function updateBinWith(name, picked, binned) {
  const added = [], removed = [], unchanged = [];
  const n = picked.length;
  for (let i = 0; i < n; i++) {
    if (binned[i] === name) {
      if (!picked[i]) {
        binned[i] = '';
        removed.push(i);
      } else {
        unchanged.push(i);
      }
    } else if (picked[i]) {
      binned[i] = name;
      added.push(i);
    }
  }
  return [added, removed, unchanged];
}


/**
 * Delete selected bins.
 * @function deleteBins
 * @param {Object} table - bin table
 * @param {Set} binns - bin names
 * @param {Array} binned - binning plan
 * @throws error if no bin is selected
 * @returns {string[], number[]} deleted bins and their contigs
 */
function deleteBins(table, binns, binned) {
  const [idxes, deleted] = selectedBins(table);
  if (idxes.length === 0) throw new Error('No bin is selected.');

  // delete rows from bottom to top so that row indices won't change
  for (let i = idxes.length - 1; i >= 0; i--) table.deleteRow(idxes[i]);

  // delete bin names
  for (let name of deleted) binns.delete(name);

  // unbin contigs
  const unbinned = [];
  const n = binned.length;
  for (let i = 0; i < n; i++) {
    if (binned[i] && deleted.indexOf(binned[i]) !== -1) {
      binned[i] = '';
      unbinned.push(i);
    }
  }
  return [deleted, unbinned];
}


function updateSavePlanBtn(mo, edited) {
  const btn = byId('save-plan-btn');
  if (edited !== undefined) btn.setAttribute('data-changed', Number(edited));
  else edited = Boolean(parseInt(btn.getAttribute('data-changed')));
  btn.classList.add('hidden');
  if (!edited) return;
  if (!mo.cache.binns.size) return;
  const name = byId('plan-sel-txt').value;
  if (!name) return;
  const cols = mo.cols;
  const names = cols.names,
        types = cols.types;
  const idx = names.indexOf(name);
  if (idx !== -1) {
    if (types[idx] === 'cat') {
      btn.title = `Overwrite binning plan "${name}"`;
      btn.disabled = false;
      btn.classList.remove('hidden');
    } else {
      btn.title = `Cannot overwrite non-categorical field "${name}"`;
      btn.disabled = true;
      btn.classList.remove('hidden');
    }
  } else {
    btn.title = `Save current binning plan as "${name}"`;
    btn.disabled = false;
    btn.classList.remove('hidden');
  }
}


/**
 * Export binning plan as a text file.
 * @function exportBinPlan
 * @param {string[]} binned - binning plan
 * @param {string[]} ids - contig Ids
 * @param {string} [name=] - plan name
 */
function exportBinPlan(binned, ids, name) {
  const fname = name ? `${name}.tsv` : 'untitled.tsv';
  let tsv = '';
  const n = binned.length;
  for (let i = 0; i < n; i++) {
    tsv += `${ids[i]}\t${binned[i]}\n`;
  }
  downloadFile(tsv, fname,
    'data:text/tab-separated-values;charset=utf-8');
}


/**
 * Previous export function (bin-to-contigs map).
 */
// function exportBinPlan(binned, ids) {
//   const bin2ctgs = arrGroupByF(binned);
//   if (Object.keys(bin2ctgs).length === 0) return;
//   let tsv = '';
//   for (const [name, ctgs] of Object.entries(bin2ctgs)) {
//     tsv += (name + '\t' + ctgs.sort().map(x => ids[x]).join(',') + '\n');
//   }
//   downloadFile(tsv, 'bins.tsv',
//     'data:text/tab-separated-values;charset=utf-8');
// }
