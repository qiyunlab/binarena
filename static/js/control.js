"use strict";

/**!
 * @module control
 * @file Control functions. They allow the user to work on the content through
 * the interface.
 * @description They may directly access the "document" object. They may access
 * the main object that is passed to them.
 * 
 * @summary Table of content
 * - Data import
 * - Assembly display
 * - Contig selection
 * - Binning utilities
 * - Bin information
 * - Mini plot
 * - Data export
 * - Data table
 * - Advanced calculation
 */


/**
 * @summary Data import
 */

/**
 * Import data from a text file.
 * @function uploadFile
 * @param {File} file - user upload file
 * @param {Object} mo - main object
 * @description It uses the FileReader object, available since IE 10.
 */
function uploadFile(file, mo) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const cache = updateDataFromText(e.target.result, mo.data, mo.view.filter);
    updateViewByData(mo, cache);
    toastMsg(`Read ${plural('contig', mo.data.df.length)}.`, mo.stat);
  }
  reader.readAsText(file);
}


/**
 * Import data from a remote location
 * @function updateDataFromRemote
 * @param {string} path - remote path to data file
 * @param {Object} mo - main object
 * @description It uses XMLHttpRequest, which has to be run on a server.
 */
function updateDataFromRemote(path, mo) {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        const cache = updateDataFromText(this.responseText, mo.data,
          mo.view.filter);
        updateViewByData(mo, cache);
        toastMsg(`Read ${plural('contig', mo.data.df.length)}.`, mo.stat);
      }
    }
  }
  xhr.open('GET', path, true);
  xhr.send();
}


/**
 * @summary Assembly display
 */

/**
 * Update view given current view parameters.
 * @function updateView
 * @param {Object} mo - main object
 */
function updateView(mo) {
  renderArena(mo);
  updateSelection(mo);
  if (mo.stat.drawing) drawPolygon(mo);
}


/**
 * Initiate display items based on updated data.
 * Basically, it is a "guess" process.
 * @function initDisplayItems
 * @param {Object} data - data object
 * @param {Object} view - view object
 */
function initDisplayItems(data, view) {
  const items = ['x', 'y', 'size', 'opacity', 'color'];
  const indices = guessDisplayFields(data, view),
        scales = guessDisplayScales(items);
  items.forEach(item => {
    view[item].i = indices[item];
    view[item].scale = scales[item];
  });
}


/**
 * Update controls based on new data.
 * @function updateCtrlByData
 * @param {Object} data - data object
 * @param {Object} view - view object
 * @description It updates select options representing columns in the dataset.
 */
function updateCtrlByData(data, view) {

  // these are select DOMs to be updated
  const keys = ['search', 'x', 'y', 'size', 'opacity', 'color', 'mini'];
  
  // these DOM can't accept categorical columns
  const noCat = ['x', 'y', 'size', 'opacity', 'mini'];

  const cols = data.cols,
        types = data.types;

  const n = cols.length;
  let sel, j, type, opt, idx, span, scale, btn;
  for (let key of keys) {
    sel = byId(key + '-field-sel');
    sel.innerHTML = '';

    // create an empty option
    sel.add(document.createElement('option'));

    // check all columns
    for (j = 0; j < n; j++) {
      type = types[j];
      if (type === 'id') continue;
      if (type === 'category' && noCat.indexOf(key) !== -1) continue;
      if ((type === 'feature' || type === 'description')
        && key !== 'search') continue;

      // create an option
      opt = document.createElement('option');
      opt.value = j;
      opt.text = cols[j];
      sel.add(opt);
      if (key === 'search' || key === 'mini') continue;

      // pre-defined index
      idx = view[key].i;
      if (idx) sel.value = idx;
      span = byId(key + '-param-span');
      if (idx) span.classList.remove('hidden');
      else span.classList.add('hidden');

      // pre-defined scale
      scale = view[key].scale;
      btn = byId(key + '-scale-btn');
      btn.setAttribute('data-scale', scale);
      btn.title = 'Scale: ' + scale;
      btn.innerHTML = scale2HTML(scale);
    }
  }
}


/**
 * Update color map based on selected field and palette.
 * @function updateColorMap
 * @param {Object} mo - main object
 * @todo add feature (treat as number)
 */
function updateColorMap(mo) {
  const icol = mo.view.color.i;
  if (!icol) return;
  if (mo.data.types[icol] !== 'category') return;
  mo.view.color.discmap = {};

  // get categories and their frequencies
  let cats = {};
  const df = mo.data.df;
  const n = df.length;
  let val;
  for (let i = 0; i < n; i++) {
    val = df[i][icol];
    if (val === undefined || val === null) continue;
    cats[val[0]] = (cats[val[0]] || 0) + 1;
  }

  // convert object to array of key: value pairs
  cats = Object.keys(cats).map(key => [key, cats[key]]);

  // sort by frequency from high to low
  cats.sort((a, b) => b[1] - a[1]);

  // number of colors to show
  const ncolor = Math.min(mo.view.ncolor, cats.length);

  // obtain colors from palette (allow repeats if palette is shorter)
  const palette = PALETTES[mo.view.discpal];
  const m = palette.length;
  for (let i = 0; i < ncolor; i++) {
    mo.view.color.discmap[cats[i][0]] = palette[i % m];
  }
}


/**
 * Initiate or restore default view given data.
 * @function resetView
 * @param {Object} mo - main object
 * @param {boolean} [keep=false] - whether keep selection and masked
 */
function resetView(mo, keep) {
  const view = mo.view,
        rena = mo.rena,
        oray = mo.oray;

  // reset view parameters
  keep = keep || false;
  if (!keep) {
    view.pick = {};
    view.mask = {};
  }
  view.scale = 1.0;

  // re-center view
  view.pos.x = rena.width / 2;
  view.pos.y = rena.height / 2;

  // re-calculate display item ranges
  calcDispMinMax(mo);

  // clear overlay canvas
  oray.getContext('2d').clearRect(0, 0, oray.width, oray.height);

  // re-render
  updateView(mo);
}


/**
 * Calculate min and max of display items
 * @function calcDispMinMax
 * @param {Object} mo - main object
 * @param {Array.<string>} [items] - display items to calculate
 */
function calcDispMinMax(mo, items) {
  items = items || ['x', 'y', 'size', 'opacity', 'color'];
  const m = items.length;
  const data = mo.data,
        view = mo.view;

  const indices = [],
        values = [];
  for (let i = 0; i < m; i++) {
    indices.push(view[items[i]].i);
    values.push([]);
  }

  // exclude masked contigs
  const hasMask = (Object.keys(mo.mask).length > 0);
  const df = data.df;
  const n = df.length;
  let j;
  for (let i = 0; i < n; i++) {
    if (hasMask && i in mo.mask) continue;
    for (j = 0; j < m; j++) {
      values[j].push(df[i][indices[j]]);
    }
  }

  // calculate min and max of display items
  let v, scale, min, max;
  for (let i = 0; i < m; i++) {
    v = view[items[i]];
    scale = v.scale;
    [min, max] = arrMinMax(values[i]);
    v.min = scaleNum(min, scale);
    v.max = scaleNum(max, scale);
  }

  // update controls
  updateLegends(mo);
}


/**
 * Update view based on data.
 * @function updateViewByData
 * @param {Object} mo - main object
 * @param {Array.<Object, Object, Object>} [cache] - decimals, categories and
 * features
 * @description Singling out cache is for performance consideration.
 * @todo to fix
 */
function updateViewByData(mo, cache) {
  resetControls();

  const data = mo.data,
        view = mo.view;
  const df = data.df;
  const n = df.length;

  // data is closed
  if (n === 0) {
    byId('hide-side-btn').click();
    byId('show-side-btn').disabled = true;
    byId('drop-sign').classList.remove('hidden');
    const btn = byId('dash-btn');
    if (btn.classList.contains('active')) btn.click();
    byId('dash-panel').classList.add('hidden');
  }

  // data is open
  else {
    byId('show-side-btn').disabled = false;
    byId('show-side-btn').click();
    byId('drop-sign').classList.add('hidden');
    const btn = byId('dash-btn');
    if (!btn.classList.contains('active')) btn.click();
  }

  // cache data
  cache = cache || cacheData(data);
  view.decimals = cache[0];
  view.categories = cache[1];
  view.features = cache[2];
  view.spcols.len = guessLenColumn(data);
  view.spcols.cov = guessCovColumn(data);
  view.spcols.gc = guessGCColumn(data);

  // calculate total abundance
  if (view.spcols.len && view.spcols.cov) {
    const len = view.spcols.len,
          cov = view.spcols.cov;
    view.abundance = 0;
    let row;
    for (let i = 0; i < n; i++) {
      row = df[i];
      view.abundance += row[len] * row[cov];
    }
  }

  // manipulate interface
  initDisplayItems(mo.data, mo.view);
  updateColorMap(mo);
  updateCtrlByData(mo.data, mo.view);
  initInfoTable(mo.data, mo.view.spcols.len, mo.pick);
  initDataTable(mo.data.cols, mo.data.types);
  fillDataTable(data, data.df.length);
  byId('bin-tbody').innerHTML = '';

  // reset view
  resetView(mo);
}


/**
 * When user changes display item.
 * @function displayItemChange
 * @param {Object} item - display variable
 * @param {Object} i - field index
 * @param {Object} scale - scaling factor
 * @param {Object} mo - main object
 * @todo throw if max === min
 */
function displayItemChange(item, i, scale, mo) {
  mo.view[item].i = i;
  mo.view[item].scale = scale;
  const isCat = (item === 'color' && mo.data.types[i] === 'category');

  // if x- or y-coordinates change, reset view
  if (item === 'x' || item === 'y') {
    resetView(mo, true);
  }
  
  // otherwise, keep current viewport
  else {
    if (isCat) updateColorMap(mo);
    else calcDispMinMax(mo, [item]);
    renderArena(mo);
  }

  // update legend
  updateLegends(mo, [item]);
}


/**
 * @summary Contig selection
 */

/**
 * Update contig selection.
 * @function updateSelection
 * @param {Object} mo - main object
 */
function updateSelection(mo) {
  renderSelection(mo);
  updateMiniPlot(mo);
  updateBinCtrl(mo);
  updateSelCtrl(mo);
  updateSelInfo(mo);
  updateMaskCtrl(mo);
}


/**
 * Update selection controls.
 * @function updateSelCtrl
 * @param {Object} mo - main object
 */
function updateSelCtrl(mo) {
  const ctgs = Object.keys(mo.pick);
  const n = ctgs.length;
  let str = 'Selected: ' + n;
  if (n === 1) str += ' (ID: ' + mo.data.df[ctgs[0]][0] + ')';
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
  const str = 'Masked: ' + n;
  if (n === 1) str += ' (ID: ' +  mo.data.df[ctgs[0]][0] + ')';
  byId('mask-head-btn').innerHTML = str;
}


/**
 * @summary Information of selected contigs
 */

/**
 * Initiate information table.
 * @function initInfoTable
 * @param {Object} data - data object
 * @param {Object} [lencol] - "length" column name
 * @param {Object} pick - picked contigs
 * @description Fields (rows) to be displayed in the information table are
 * determined based on the type and names of data fields.
 */
 function initInfoTable(data, lencol, pick) {
  lencol = lencol || '';
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
  const cols = data.cols,
        types = data.types;
  const n = cols.length;
  let col, type, row, met;
  for (let i = 1; i < n; i++) {
    col = cols[i];
    type = types[i];
    row = table.insertRow(-1);
    row.setAttribute('data-index', i);
    row.setAttribute('data-col', col);
    row.setAttribute('data-type', type);
    if (type === 'number') {
      met = guessColMetric(col);
      row.setAttribute('data-refcol', (met.substring(met.length - 2) ===
        'by') ? lencol : '');
      row.setAttribute('data-metric', (met.substring(0, 3) === 'sum') ?
        'sum' : 'mean');
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
        (this.getAttribute('data-type') !== 'number')) {
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
    if (type === 'number') {
      const opt = document.createElement('option');
      opt.text = col;
      opt.value = col;
      sel.add(opt);
    }

    // create cells
    const cell = row.insertCell(-1); // 1st cell: field name
    cell.innerHTML = col;
    row.insertCell(-1); // 2nd cell: field value
  }

  table.parentElement.addEventListener('mouseleave', function () {
    if (document.activeElement === sel) return;
    div.classList.add('hidden');
  });
}


/**
 * Update information table of selected contigs.
 * @function updateSelInfo
 * @param {Object} mo - main object
 * @todo Currently this function is very inefficient because it involves data
 * table splicing, transposing, etc.
 */
function updateSelInfo(mo) {
  const table = byId('info-table');
  const ctgs = Object.keys(mo.pick);
  const n = ctgs.length;

  // no contig is selected
  if (n === 0) {
    table.classList.add('hidden');
    return;
  }
  const rows = table.rows;

  // single contig
  if (n === 1) {
    const datum = mo.data.df[ctgs[0]];
    for (let row of rows) {
      row.cells[1].innerHTML = value2Str(
        datum[row.getAttribute('data-index')],
        row.getAttribute('data-type'));
    }
  }

  // multiple contigs
  else {
    const cols = mo.data.cols,
          df = mo.data.df;
    let idx, arr, refarr, i;
    for (let row of rows) {

      // get data
      idx = row.getAttribute('data-index');
      arr = Array(n).fill();
      for (i = 0; i < n; i++) {
        arr[i] = df[ctgs[i]][idx];
      }

      // get reference data, if available
      idx = cols.indexOf(row.getAttribute('data-refcol'));
      if (idx !== -1) {
        refarr = Array(n).fill();
        for (i = 0; i < n; i++) {
          refarr[i] = df[ctgs[i]][idx];
        }
      }

      // summarize data and display
      updateInfoRow(row, mo, arr, refarr);
    }
  }

  table.classList.remove('hidden');
}


/**
 * Update information of selected contigs.
 * @function updateInfoRow
 * @param {Object} row - information table row DOM
 * @param {Object} mo - main object
 * @param {Array} [arr] - data column
 * @param {Array} [refarr] - reference column
 * @description arr and refarr are not necessary; but they can be provided in
 * order to save compute
 */
function updateInfoRow(row, mo, arr, refarr) {
  const ctgs = Object.keys(mo.pick).sort();
  const n = ctgs.length;
  const df = mo.data.df;
  let idx;

  // populate data array
  if (arr == null) {
    idx = row.getAttribute('data-index');
    arr = Array(n).fill();
    for (let i = 0; i < n; i++) {
      arr[i] = df[ctgs[i]][idx];
    }
  }

  // for non-number types, directly summarize
  const type = row.getAttribute('data-type');
  if (type !== 'number') {
    row.cells[1].innerHTML = row.cells[1].title = columnInfo(arr, type);
    return;
  }

  // populate reference array
  if (refarr == null) {
    idx = mo.data.cols.indexOf(row.getAttribute('data-refcol'));
    if (idx !== -1) {
      refarr = Array(n).fill();
      for (let i = 0; i < n; i++) {
        refarr[i] = df[ctgs[i]][idx];
      }
    }
  }

  // summarize a numberic column
  const met = row.getAttribute('data-metric');
  const deci = mo.view.decimals[row.getAttribute('data-col')];
  row.cells[1].innerHTML = columnInfo(arr, type, met, deci, refarr);
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
    ctgs.forEach(function (i) {
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
    ctgs.forEach(function (i) {
      if (i in target) toDel.push(i);
    });
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
 * Let user draw polygon to select a region of data points.
 * @function polygonSelect
 * @param {Object} mo - main object
 */
function polygonSelect(mo) {
  const data = mo.data,
        view = mo.view,
        stat = mo.stat,
        rena = mo.rena,
        oray = mo.oray;

  // change button appearance
  const btn = byId('polygon-btn');
  const title = btn.title;
  btn.title = btn.getAttribute('data-title');
  btn.setAttribute('data-title', title);
  btn.classList.toggle('pressed');

  // start drawing
  if (!stat.drawing) {
    stat.polygon = [];
    stat.drawing = true;
  }
  
  // finish drawing
  else {
    oray.getContext('2d').clearRect(0, 0, oray.width, oray.height);
    const df = data.df;
    const n = df.length;
    const ctgs = [];
    const hasMask = (Object.keys(mo.mask).length > 0);
    let datum, x, y;
    for (let i = 0; i < n; i++) {
      if (hasMask && i in mo.mask) continue;
      datum = df[i];
      x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
        (view.x.max - view.x.min) - 0.5) * rena.width;
      y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
        (view.y.max - view.y.min) - 0.5) * rena.height;
      if (pnpoly(x, y, stat.polygon)) ctgs.push(i);
    }
    stat.polygon = [];
    stat.drawing = false;

    // treat selection
    if (ctgs.length > 0) {
      treatSelection(ctgs, stat.selmode, stat.masking, mo);
    }
  }
}


/**
 * @summary Contig searching
 */

/**
 * Search field change event.
 * @function searchFieldChange
 * @param {Object} e - event object
 * @param {Object} data - data object
 * @param {Object} view - view object
 */
function searchFieldChange(e, data, view) {
  ['num-sel-p', 'cat-sel-p', 'fea-sel-p', 'des-sel-p'].forEach(function (id) {
    byId(id).classList.add('hidden');
  });
  byId('search-btn').style.visibility = 'hidden';
  const span = byId('str-match-span');
  span.classList.add('hidden');

  // show controls by field type
  let i = e.target.value;
  if (i === '') return;
  i = parseInt(i);
  let p;
  switch (data.types[i]) {

    case 'number':
      byId('num-sel-p').classList.remove('hidden');
      break;

    case 'category':
      p = byId('cat-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('cat-sel-txt'),
        Object.keys(view.categories[data.cols[i]]).sort());
      break;

    case 'feature':
      p = byId('fea-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('fea-sel-txt'),
        Object.keys(view.features[data.cols[i]]).sort());
      break;

    case 'description':
      p = byId('des-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      break;
  }
  byId('search-btn').style.visibility = 'visible';
}


/**
 * Search contigs by criteria.
 * @function searchByCriteria
 * @param {Object} mo - main object
 * @returns {boolean} whether search is successful
 */
function searchByCriteria(mo) {
  const data = mo.data,
        mask = mo.mask;
  let col = byId('search-field-sel').value;
  if (col === '') {
    toastMsg('No search criterion was specified.', mo.stat);
    return false;
  }
  col = parseInt(col);
  const type = data.types[col];

  // filter contigs by currently specified criteria
  const ctgs = [];
  const hasMask = (Object.keys(mask).length > 0);
  const df = data.df;
  const n = df.length;

  // search by threshold
  if (type === 'number') {

    // validate minimum and maximum thresholds
    let min = byId('min-txt').value,
        max = byId('max-txt').value;
    if (min === '' && max === '') {
      toastMsg('Must specify minimum and/or maximum thresholds.', mo.stat);
      return false;
    }
    if (min === '') min = null;
    else if (isNaN(min)) {
      toastMsg('Invalid minimum threshold was specified.', mo.stat);
      return false;
    } else min = Number(min);
    if (max === '') max = null;
    else if (isNaN(max)) {
      toastMsg('Invalid maximum threshold was specified.', mo.stat);
      return false;
    } else max = Number(max);

    // whether to include lower and upper bounds
    const minIn = (byId('min-btn').innerHTML === '['),
          maxIn = (byId('max-btn').innerHTML === '[');

    // compare values to threshold(s)
    let val;
    for (let i = 0; i < n; i++) {
      if (hasMask && i in mask) continue;
      val = df[i][col];
      if ((val !== null) &&
        (min === null || (minIn ? (val >= min) : (val > min))) &&
        (max === null || (maxIn ? (val <= max) : (val < max)))) {
          ctgs.push(i);
      }
    }
  }

  // search by keyword
  else {
    let text = byId(type.substring(0, 3) + '-sel-txt').value;
    if (text === '') {
      toastMsg('Must specify a keyword.', mo.stat);
      return false;
    }
    const mcase = byId('case-btn').classList.contains('pressed');
    if (!mcase) text = text.toUpperCase();
    const mwhole = byId('whole-btn').classList.contains('pressed');

    let val;
    for (let i = 0; i < n; i++) {
      if (hasMask && i in mask) continue;
      val = df[i][col];
      if (val === null) continue;

      // category or description
      if (type !== 'feature') {
        if (type === 'category') val = val[0];
        if (!mcase) val = val.toUpperCase();
        if (mwhole ? (val === text) : (val.indexOf(text) > -1))
          ctgs.push(i);
      }

      // feature
      else {
        for (let key in val) {
          if (mwhole ? (key === text) : (key.indexOf(text) > -1)) {
            ctgs.push(i);
            break;
          }
        }
      }
    }
  }

  treatSelection(ctgs, mo.stat.selmode, mo.stat.masking, mo);
  return true;
}


/**
 * @summary Binning utilities
 */

/**
 * Update bins controls.
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
 * @summary Mini plot
 */


/**
 * Mini plot mouse move event
 * @function miniPlotMouseMove
 * @param {Object} e - event
 * @param {Object} mo - main object
 * @description There are three scenarios:
 * 1. No mini plot is displayed. Nothing happens.
 * 2. The user is moving the mouse over the mini plot without clicking. The bar
 * in the histogram being hovered will be highlighted.
 * 3. The user presses the left button of the mouse, holds it and moves around.
 * The bars within the range will be highlighted.
 */
function miniPlotMouseMove(e, mo) {

  // skip if no mini plot is displayed
  if (mo.mini.field === null) return;
  if (mo.mini.hist === null) return;
  if ((Object.keys(mo.pick)).length === 0) return;

  // find mouse position in mini plot
  const canvas = mo.mini.canvas;
  const rect = canvas.getBoundingClientRect();
  const w = canvas.width,
        h = canvas.height;
  const x = (e.clientX - rect.left) / (rect.right - rect.left) * w,
        y = (e.clientY - rect.top)  / (rect.bottom - rect.top) * h;

  // first and last bin indices
  let bin0, bin1;

  // determine which bin the mouse is over
  const nbin = mo.mini.nbin;
  let i = Math.floor((x - 10) / (w - 20) * nbin);

  // mouse over to display info of single bin
  if (e.buttons !== 1) {

    // if before first bin or after last bin, ignore
    if ((i < 0) || (i >= nbin)) i = null;
    
    // if same as saved bin status, skip
    if ((i === mo.mini.bin0) && (i === mo.mini.bin1)) return;

    // save bin status
    bin0 = bin1 = i;
    mo.mini.bin0 = i;
    mo.mini.bin1 = i;

    // update mini plot to highlight this bin
    updateMiniPlot(mo, true);
  }

  // hold mouse key to select a range of bins
  else {

    // determine the other bin
    let j = Math.floor((mo.mini.drag - 10) / (w - 20) * nbin);

    // determine first and last bins
    bin0 = Math.max(Math.min(i, j), 0);
    bin1 = Math.min(Math.max(i, j), nbin - 1);

    // if same as saved bin status, still update plot but keep tooltip
    const skip = ((bin0 === mo.mini.bin0) && (bin1 === mo.mini.bin1))
      ? true : false;

    // save bin status
    mo.mini.bin0 = bin0;
    mo.mini.bin1 = bin1;

    // update mini plot to highlight a range of bins
    updateMiniPlot(mo, true, x);

    if (skip) return;
  }

  // reset tooltip
  const tip = byId('legend-tip');
  tip.classList.add('hidden');
  if (bin0 === null) return;
  
  // determine size of bin(s)
  let n = 0;
  for (i = bin0; i <= bin1; i++) {
    n += mo.mini.hist[i];
  }

  // determine range of bin(s)
  let left = mo.mini.edges[bin0],
      right = mo.mini.edges[bin1 + 1];

  // format range and size of bin(s)
  const icol = mo.mini.field;
  left = formatValueLabel(left, icol, 3, false, mo);
  right = formatValueLabel(right, icol, 3, true, mo);
  byId('legend-value').innerHTML = n + '<br><small>' + left + ' to '
    + right + '</small>';

  // determine tooltip position
  tip.style.left = Math.round((10 + ((bin0 + bin1) / 2 + 0.5) * (w - 20)
    / nbin) / w * (rect.right - rect.left) + rect.left) + 'px';
  tip.style.top = Math.round(rect.bottom - 5) + 'px';
  
  // display bin size and range in tooltip
  byId('legend-circle').classList.add('hidden');
  tip.classList.remove('hidden');
}


/**
 * Select a range of data in the mini plot
 * @function miniPlotSelect
 * @param {Object} mo - main object
 * @description This operation is triggered when the user releases the mouse
 * button from the mini plot (either by clicking or by holding). The contigs
 * represented by the bars in the range of selection will be selected.
 */
function miniPlotSelect(mo) {
  const col = mo.mini.field;

  // determine range of selection
  // These are lower and upper bounds of the original data. The lower bound is
  // inclusive ("["). However the upper bound is tricky. In all but last bar,
  // it is exclusive (")"). But in the last bar, it is inclusive ("]").
  // To tackle this, the code removes the upper bound of the last bar.
  const min = mo.mini.edges[mo.mini.bin0];
  const max = (mo.mini.bin1 === mo.mini.nbin - 1)
    ? null : mo.mini.edges[mo.mini.bin1 + 1];

  // reset histogram status
  mo.mini.hist = null;
  mo.mini.edges = null;
  mo.mini.bin0 = null;
  mo.mini.bin1 = null;
  mo.mini.drag = null;

  const res = [];
  const mask = mo.mask;
  const hasMask = (Object.keys(mask).length > 0);
  const df = mo.data.df;

  // selection will take place within the already selected contigs
  const picked = Object.keys(mo.pick);
  const n = picked.length;
  let idx, val;

  // find within selected contigs which ones are within the range
  for (let i = 0; i < n; i++) {
    idx = picked[i];
    if (hasMask && idx in mask) continue;
    val = df[idx][col];

    // lower bound: inclusive; upper bound: exclusive
    if (val !== null && val >= min && (max === null || val < max)) {
      res.push(idx);
    }
  }
  treatSelection(res, mo.stat.selmode, mo.stat.masking, mo);
}


/**
 * @summary Data table
 */

/**
 * Initiate data table based on data.
 * @function initDataTable
 */
function initDataTable(columns, types) {
  const table = byId('data-table');
  table.innerHTML = '';
  const header = table.createTHead();
  const row = header.insertRow(-1);
  const n = columns.length;
  let cell;
  for (let i = 0; i < n; i++) {
    cell = row.insertCell(-1);
    cell.setAttribute('data-index', i);
    cell.setAttribute('data-column', columns[i]);
    cell.setAttribute('data-type', types[i]);
    cell.innerHTML = columns[i];
  }
  table.appendChild(document.createElement('tbody'));
}


/**
 * @summary Data export
 */

/**
 * Take a screenshot and export as a PNG image.
 * @function exportPNG
 * @param {Object} canvas - canvas DOM to export
 */
 function exportPNG(canvas) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/**
 * Export data as a JSON file.
 * @function exportJSON
 * @param {Object} data - data object to export
 * @see {@link https://stackoverflow.com/questions/17527713/}
 * This way avoids saving the lengthy href.
 */
function exportJSON(data) {
  const a = document.createElement('a');
  a.href = 'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(data, null, 2));
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/**
 * Export bins as a plain text file.
 * @function exportBins
 * @param {Object} bins - bins object to export
 * @param {Object} data - data object to refer to
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


/**
 * @summary Data table
 */

/**
 * Populate data table by data.
 * @function fillDataTable
 * @param {Object} data - data object
 * @param {number} [n=100] - maximum number of rows
 */
function fillDataTable(data, n) {
  n = n || 100;
  const df = data.df,
        cols = data.cols,
        types = data.types;
  const m = cols.length;
  const table = byId('data-table');
  table.tBodies[0].innerHTML = '';
  let i, j, row, cell;
  for (i = 0; i < n; i++) {
    row = table.tBodies[0].insertRow(-1);
    for (j = 0; j < m; j++) {
      cell = row.insertCell(-1);
      cell.innerHTML = value2Str(df[i][j], types[j]);
    }
  }
}


/**
 * @summary Advanced calculation
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
      updateCtrlByData(data, view);
      initInfoTable(data, view.spcols.len, mo.pick);
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
