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
  var reader = new FileReader();
  reader.onload = function (e) {
    var cache = updateDataFromText(e.target.result, mo.data, mo.view.filter);
    updateViewByData(mo, cache);
    toastMsg('Read ' + mo.data.df.length + ' contigs.', mo.stat);
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
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        var cache = updateDataFromText(this.responseText, mo.data,
          mo.view.filter);
        updateViewByData(mo, cache);
        toastMsg('Read ' + mo.data.df.length + ' contigs.', mo.stat);
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
  var items = ['x', 'y', 'size', 'opacity', 'color'];
  var indices = guessDisplayFields(data, view);
  var scales = guessDisplayScales(items);
  items.forEach(function (item) {
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
  var sel, opt, key, type;

  // these are select DOMs to be updated
  var keys = ['search', 'x', 'y', 'size', 'opacity', 'color', 'mini'];
  
  // these DOM can't accept categorical columns
  var noCat = ['x', 'y', 'size', 'opacity', 'mini'];

  var cols = data.cols,
      types = data.types;
  var n = cols.length;
  for (var i = 0; i < keys.length; i++) {
    key = keys[i];
    sel = byId(key + '-field-sel');
    sel.innerHTML = '';

    // create an empty option
    sel.add(document.createElement('option'));

    // check all columns
    for (var j = 0; j < n; j++) {
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
      var idx = view[key].i;
      if (idx) sel.value = idx;
      var span = byId(key + '-param-span');
      if (idx) span.classList.remove('hidden');
      else span.classList.add('hidden');

      // pre-defined scale
      var scale = view[key].scale;
      var btn = byId(key + '-scale-btn');
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
  var icol = mo.view.color.i;
  if (!icol) return;
  if (mo.data.types[icol] !== 'category') return;
  mo.view.color.discmap = {};

  // get categories and their frequencies
  var cats = {};
  var df = mo.data.df;
  var n = df.length;
  var val;
  for (var i = 0; i < n; i++) {
    val = df[i][icol];
    if (val === undefined || val === null) continue;
    cats[val[0]] = (cats[val[0]] || 0) + 1;
  }

  // convert object to array of key: value pairs
  cats = Object.keys(cats).map(function (key) { return [key, cats[key]]; });

  // sort by frequency from high to low
  cats.sort(function (a, b) { return b[1] - a[1]; });

  // number of colors to show
  var ncolor = Math.min(mo.view.ncolor, cats.length);

  // obtain colors from palette (allow repeats if palette is shorter)
  var palette = PALETTES[mo.view.discpal];
  var m = palette.length;
  for (var i = 0; i < ncolor; i++) {
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
  var view = mo.view;
  var rena = mo.rena;
  var oray = mo.oray;

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
  var m = items.length;
  var data = mo.data;
  var view = mo.view;

  var indices = [],
      values = [];
  for (var i = 0; i < m; i++) {
    indices.push(view[items[i]].i);
    values.push([]);
  }

  // exclude masked contigs
  var hasMask = (Object.keys(mo.mask).length > 0);
  var df = data.df;
  var n = df.length;
  for (var i = 0; i < n; i++) {
    if (hasMask && i in mo.mask) continue;
    for (var j = 0; j < m; j++) {
      values[j].push(df[i][indices[j]]);
    }
  }

  // calculate min and max of display items
  for (var i = 0; i < m; i++) {
    var scale = view[items[i]].scale;
    var mm = arrMinMax(values[i]);
    view[items[i]].min = scaleNum(mm[0], scale);
    view[items[i]].max = scaleNum(mm[1], scale);
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

  var data = mo.data;
  var view = mo.view;
  var df = data.df;
  var n = df.length;

  // data is closed
  if (n === 0) {
    byId('hide-side-btn').click();
    byId('show-side-btn').disabled = true;
    byId('drop-sign').classList.remove('hidden');
    var btn = byId('dash-btn');
    if (btn.classList.contains('active')) btn.click();
    byId('dash-panel').classList.add('hidden');
  }

  // data is open
  else {
    byId('show-side-btn').disabled = false;
    byId('show-side-btn').click();
    byId('drop-sign').classList.add('hidden');
    var btn = byId('dash-btn');
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
    var len = view.spcols.len,
        cov = view.spcols.cov;
    view.abundance = 0;
    var row;
    for (var i = 0; i < n; i++) {
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
  var isCat = (item === 'color' && mo.data.types[i] === 'category');

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
  var ctgs = Object.keys(mo.pick);
  var n = ctgs.length;
  var str = 'Selected: ' + n;
  if (n === 1) str += ' (ID: ' + mo.data.df[ctgs[0]][0] + ')';
  byId('info-head-btn').innerHTML = str;
}


/**
 * Update masking controls.
 * @function updateMaskCtrl
 * @param {Object} mo - main object
 */
function updateMaskCtrl(mo) {
  var ctgs = Object.keys(mo.mask);
  var n = ctgs.length;
  var str = 'Masked: ' + n;
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
 * @param {Object} lencol - "length" column name
 * @param {Object} pick - picked contigs
 * @description Fields (rows) to be displayed in the information table are
 * determined based on the type and names of data fields.
 */
 function initInfoTable(data, lencol, pick) {
  lencol = lencol || '';
  var table = byId('info-table');

  // temporarily move control span
  var div = byId('info-ctrl');
  div.classList.add('hidden');

  // weight-by selection - clear
  var sel = byId('info-ref-sel');
  sel.innerHTML = '';
  sel.add(document.createElement('option'));

  // clear table
  table.innerHTML = '';

  // create rows
  var cols = data.cols,
      types = data.types;
  var col, type, row;
  var n = cols.length;
  for (var i = 1; i < n; i++) {
    col = cols[i];
    type = types[i];
    row = table.insertRow(-1);
    row.setAttribute('data-index', i);
    row.setAttribute('data-col', col);
    row.setAttribute('data-type', type);
    if (type === 'number') {
      var met = guessColMetric(col);
      row.setAttribute('data-refcol', (met.substring(met.length - 2) === 'by')
        ? lencol : '');
      row.setAttribute('data-metric', (met.substring(0, 3) === 'sum') ? 'sum'
        : 'mean');
    }

    // row hover event: append control span
    row.addEventListener('mouseenter', function () {
      if (document.activeElement === sel) return false;

      // three buttons: metric (sum or mean), plot entry, weight-by selection
      // the 4th and permanent button is "hide"
      var mbtn = byId('info-metric-btn');
      var pbtn = byId('info-plot-btn');
      var rspan = byId('info-ref-span');

      // only one contig is selected, then no need for controls
      if (Object.keys(pick).length === 1 ||
        (this.getAttribute('data-type') !== 'number')) {
        mbtn.classList.add('hidden');
        pbtn.classList.add('hidden');
        rspan.classList.add('hidden');
      }
      
      // multiple contigs are selected
      else {
        var met = this.getAttribute('data-metric');
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
      var rect = this.getBoundingClientRect();
      div.style.top = rect.top + 'px';
      div.classList.remove('hidden');
    });

    // weight-by selection - add numeric field
    if (type === 'number') {
      var opt = document.createElement('option');
      opt.text = col;
      opt.value = col;
      sel.add(opt);
    }

    // create cells
    var cell = row.insertCell(-1); // 1st cell: field name
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
 */
function updateSelInfo(mo) {
  var table = byId('info-table');
  var ctgs = Object.keys(mo.pick);
  if (ctgs.length === 0) { // no contig is selected
    table.classList.add('hidden');
  } else {
    var rows = table.rows;
    var n = rows.length;

    // single contig
    if (ctgs.length === 1) {
      var selData = mo.data.df[ctgs[0]];
      for (var i = 0; i < n; i++) {
        var val = selData[rows[i].getAttribute('data-index')];
        var type = rows[i].getAttribute('data-type');
        rows[i].cells[1].innerHTML = value2Str(val, type);
      }
    }

    // multiple contigs
    else {
      var selData =
        transpose(ctgs.sort().map(function (i) { return mo.data.df[i]; }));
      var cols = mo.data.cols;
      for (var i = 0; i < n; i++) {
        var arr = selData[rows[i].getAttribute('data-index')];
        var refcol = rows[i].getAttribute('data-refcol');
        var refarr = refcol ? selData[cols.indexOf(refcol)] : null;
        updateInfoRow(rows[i], mo, arr, refarr);
      }
    }
    table.classList.remove('hidden');
  }
}


/**
 * Update information of selected contigs.
 * @function updateInfoRow
 * @param {Object} row - information table row DOM
 * @param {Object} mo - main object
 * @param {Array} [arr] - data column
 * @param {Array} [refarr] - reference column
 */
function updateInfoRow(row, mo, arr, refarr) {
  if (arr === undefined) {
    var data_ = Object.keys(mo.pick).sort()
      .map(function (i) { return mo.data.df[i]; });
    var idx = row.getAttribute('data-index');
    arr = data_.map(function (x) { return x[idx]; });
    var refcol = row.getAttribute('data-refcol');
    if (refcol) {
      idx = mo.data.cols.indexOf(refcol);
      refarr = data_.map(function (x) { return x[idx]; });
    } else refarr = null;
  }
  arr = arr || Object.keys(mo.pick).sort()
    .map(function (i) { return mo.data.df[i]; })
    .map(function (x) { return x[row.getAttribute('data-index')]; });
  var type = row.getAttribute('data-type');

  if (type !== 'number') {
    row.cells[1].innerHTML = row.cells[1].title = columnInfo(arr, type);
  } else {
    var met = row.getAttribute('data-metric');
    var deci = mo.view.decimals[row.getAttribute('data-col')];
    var refcol = row.getAttribute('data-refcol');
    row.cells[1].innerHTML = columnInfo(arr, type, met, deci, refarr);
  }
}


/**
 * Deal with selected contigs.
 * @function treatSelection
 * @param {number[]} indices - indices of contigs to be selected / excluded
 * @param {string} [selmode='new'] - selection mode (new, add, remove)
 * @param {boolean} [masking=false] - masking mode on/off
 * @param {Object} mo - main object
 */
 function treatSelection(indices, selmode, masking, mo) {
  if (typeof masking === 'undefined') masking = false;
  if (typeof selmode === 'undefined') selmode = mo.stat.selmode;
  var target = masking ? mo.mask : mo.pick;

  // new selection
  if (selmode === 'new') {
    Object.keys(target).forEach(function (i) { delete target[i]; });
    indices.forEach(function (i) { target[i] = null; });
    toastMsg((masking ? 'Masked' : 'Selected') + ' ' + indices.length +
      ' contig(s).', mo.stat);
  }

  // add to selection
  else if (selmode === 'add') {
    var n = 0;
    indices.forEach(function (i) {
      if (!(i in target)) {
        target[i] = null;
        n++;
      }
    });
    toastMsg('Added ' + n + ' contig(s) to ' + (masking ? 'mask' : 'selection')
      + '.', mo.stat);
  }

  // remove from selection
  else if (selmode === 'remove') {
    var toDel = [];
    indices.forEach(function (i) {
      if (i in target) toDel.push(i);
    });
    toDel.forEach(function (i) { delete target[i]; });
    toastMsg('Removed ' + toDel.length + ' contig(s) from ' + (masking ?
      'mask' : 'selection') + '.', mo.stat);
  }

  // remove excluded contigs from selection, if any
  if (masking) {
    var toDel = [];
    Object.keys(mo.pick).forEach(function (i) {
      if (i in mo.mask) toDel.push(i);
    });
    toDel.forEach(function (i) { delete mo.pick[i]; });
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
  var data = mo.data;
  var view = mo.view;
  var stat = mo.stat;
  var rena = mo.rena;
  var oray = mo.oray;

  // change button appearance
  var btn = byId('polygon-btn');
  var title = btn.title;
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
    var df = data.df;
    var n = df.length;
    var indices = [];
    var hasMask = (Object.keys(mo.mask).length > 0);
    for (var i = 0; i < n; i++) {
      if (hasMask && i in mo.mask) continue;
      var datum = df[i];
      var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
        (view.x.max - view.x.min) - 0.5) * rena.width;
      var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
        (view.y.max - view.y.min) - 0.5) * rena.height;
      if (pnpoly(x, y, stat.polygon)) indices.push(i);
    }
    stat.polygon = [];
    stat.drawing = false;

    // treat selection
    if (indices.length > 0) {
      treatSelection(indices, stat.selmode, stat.masking, mo);
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
  var span = byId('str-match-span');
  span.classList.add('hidden');

  // show controls by field type
  var i = e.target.value;
  if (i === '') return;
  i = parseInt(i);
  switch (data.types[i]) {
    case 'number':
      byId('num-sel-p').classList.remove('hidden');
      break;
    case 'category':
      var p = byId('cat-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('cat-sel-txt'),
        Object.keys(view.categories[data.cols[i]]).sort());
      break;
    case 'feature':
      var p = byId('fea-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('fea-sel-txt'),
        Object.keys(view.features[data.cols[i]]).sort());
      break;
    case 'description':
      var p = byId('des-sel-p');
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
  var data = mo.data;
  var mask = mo.mask;
  var col = byId('search-field-sel').value;
  if (col === '') {
    toastMsg('No search criterion was specified.', mo.stat);
    return false;
  }
  col = parseInt(col);
  var type = data.types[col];

  // filter contigs by currently specified criteria
  var indices = [];
  var hasMask = (Object.keys(mask).length > 0);
  var df = data.df;
  var n = df.length;

  // search by threshold
  if (type === 'number') {

    // validate minimum and maximum thresholds
    var min = byId('min-txt').value;
    var max = byId('max-txt').value;
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
    var minIn = (byId('min-btn').innerHTML === '[');
    var maxIn = (byId('max-btn').innerHTML === '[');

    // compare values to threshold(s)
    var val;
    for (var i = 0; i < n; i++) {
      if (hasMask && i in mask) continue;
      val = df[i][col];
      if ((val !== null) &&
        (min === null || (minIn ? (val >= min) : (val > min))) &&
        (max === null || (maxIn ? (val <= max) : (val < max)))) {
          indices.push(i);
      }
    }
  }

  // search by keyword
  else {
    var text = byId(type.substr(0, 3) + '-sel-txt').value;
    if (text === '') {
      toastMsg('Must specify a keyword.', mo.stat);
      return false;
    }
    var mcase = byId('case-btn').classList.contains('pressed');
    if (!mcase) text = text.toUpperCase();
    var mwhole = byId('whole-btn').classList.contains('pressed');

    var val;
    for (var i = 0; i < n; i++) {
      if (hasMask && i in mask) continue;
      val = df[i][col];
      if (val === null) continue;

      // category or description
      if (type !== 'feature') {
        if (type === 'category') val = val[0];
        if (!mcase) val = val.toUpperCase();
        if (mwhole ? (val === text) : (val.indexOf(text) > -1))
          indices.push(i);
      }

      // feature
      else {
        for (var key in val) {
          if (mwhole ? (key === text) : (key.indexOf(text) > -1)) {
            indices.push(i);
            break;
          }
        }
      }
    }
  }

  treatSelection(indices, mo.stat.selmode, mo.stat.masking, mo);
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
  var n = Object.keys(mo.bins).length;

  // update save plan button
  var txt = byId('plan-sel-txt');
  var btn = byId('save-plan-btn');
  btn.classList.toggle('hidden', !n);
  var col = mo.data.cols[txt.getAttribute('data-col')];
  if (col == txt.value) btn.title = 'Overwrite binning plan "' + col + '"';
  else btn.title = 'Save current binning plan as "' + txt.value + '"';

  // update bins panel head
  byId('bins-head').lastElementChild.firstElementChild
    .innerHTML = 'Bins: ' + n;

  byId('export-plan-btn').classList.toggle('hidden', !n);
  byId('clear-plan-btn').classList.toggle('hidden', !n);
  byId('bin-thead').classList.toggle('hidden', !n);

  // number of selected bins
  var m = 0;
  var rows = byId('bin-tbody').rows;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].classList.contains('selected')) m ++;
  }

  byId('delete-bin-btn').classList.toggle('hidden', !m);
  byId('merge-bins-btn').classList.toggle('hidden', (m < 2));

  var k = Object.keys(mo.pick).length;
  byId('as-new-bin-btn').classList.toggle('hidden', !k);
  byId('add-to-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('remove-from-bin-btn').classList.toggle('hidden', !(m === 1 && k));
  byId('invert-btn').classList.toggle('hidden', !k);
  byId('mask-btn').classList.toggle('hidden', !k);
}


/**
 * Update bins table.
 * @function updateBinTable
 * @param {Object} mo - main object
 */
function updateBinTable(mo) {
  var view = mo.view;
  var data = mo.data;
  var bins = mo.bins;
  var table = byId('bin-tbody');
  table.innerHTML = '';

  // cache length and coverage data
  var lens = {};
  var covs = {};
  if (view.spcols.len || view.spcols.cov) {
    var ilen = view.spcols.len ? view.spcols.len : null;
    var icov = view.spcols.cov ? view.spcols.cov : null;
    for (var i = 0; i < data.df.length; i++) {
      if (ilen) lens[i] = data.df[i][ilen];
      if (icov) covs[i] = data.df[i][icov];
    }
  }

  Object.keys(bins).sort().forEach(function (name) {
    var row = table.insertRow(-1);

    // 1st cell: name
    var cell = row.insertCell(-1);
    // name label
    var label = document.createElement('span');
    label.title = label.innerHTML = name;
    cell.appendChild(label);
    // rename text box
    var text = document.createElement('input');
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

    // 2nd cell: contigs
    var cell = row.insertCell(-1);
    cell.innerHTML = Object.keys(bins[name]).length;

    // 3rd cell: length (kb)
    var cell = row.insertCell(-1);
    if (view.spcols.len) {
      var sum = 0;
      for (var i in bins[name]) sum += lens[i];
      cell.innerHTML = Math.round(sum / 1000);
    } else cell.innerHTML = 'na';
    
    // 4th cell: abundance (%)
    var cell = row.insertCell(-1);
    if (view.spcols.len && view.spcols.cov) {
      var sum = 0;
      for (var i in bins[name]) sum += lens[i] * covs[i];
      cell.innerHTML = (sum * 100 / view.abundance).toFixed(2);
    } else cell.innerHTML = 'na';
  });
}


/**
 * Bin name textbox keyup event.
 * @function binNameKeyUp
 * @param {Object} e - event object
 * @param {Object} stat - status object
 * @param {Object} bins - binning plan
 */
function binNameKeyUp(e, stat, bins) {
  var text = e.target;
  var label = text.parentElement.firstElementChild;
  var name = label.innerHTML;
  if (e.key === 'Enter') { // save new name
    if (text.value === '') {
      text.value = name;
      toastMsg('Bin name must not be empty.', stat)
    } else if (text.value === name) {
      text.classList.add('hidden');
      label.classList.remove('hidden');
    } else {
      var success = renameBin(bins, name, text.value);
      if (success) {
        text.classList.add('hidden');
        label.innerHTML = text.value;
        label.classList.remove('hidden');
      } else {
        toastMsg('Bin name "' + text.value + '" already exists.', stat);
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
  var canvas = mo.mini.canvas;
  var rect = canvas.getBoundingClientRect();
  var w = canvas.width,
      h = canvas.height;
  var x = (e.clientX - rect.left) / (rect.right - rect.left) * w,
      y = (e.clientY - rect.top)  / (rect.bottom - rect.top) * h;

  // first and last bin indices
  var bin0,
      bin1;

  // determine which bin the mouse is over
  var nbin = mo.mini.nbin;
  var i = Math.floor((x - 10) / (w - 20) * nbin);

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
    var j = Math.floor((mo.mini.drag - 10) / (w - 20) * nbin);

    // determine first and last bins
    bin0 = Math.max(Math.min(i, j), 0);
    bin1 = Math.min(Math.max(i, j), nbin - 1);

    // if same as saved bin status, still update plot but keep tooltip
    var skip = ((bin0 === mo.mini.bin0) && (bin1 === mo.mini.bin1))
      ? true : false;

    // save bin status
    mo.mini.bin0 = bin0;
    mo.mini.bin1 = bin1;

    // update mini plot to highlight a range of bins
    updateMiniPlot(mo, true, x);

    if (skip) return;
  }

  // reset tooltip
  var tip = byId('legend-tip');
  tip.classList.add('hidden');
  if (bin0 === null) return;
  
  // determine size of bin(s)
  var n = 0;
  for (var i = bin0; i <= bin1; i++) {
    n += mo.mini.hist[i];
  }

  // determine range of bin(s)
  var left = mo.mini.edges[bin0];
  var right = mo.mini.edges[bin1 + 1];

  // format range and size of bin(s)
  var icol = mo.mini.field;
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
  var col = mo.mini.field;

  // determine range of selection
  // These are lower and upper bounds of the original data. The lower bound is
  // inclusive ("["). However the upper bound is tricky. In all but last bar,
  // it is exclusive (")"). But in the last bar, it is inclusive ("]").
  // To tackle this, the code removes the upper bound of the last bar.
  var min = mo.mini.edges[mo.mini.bin0];
  var max = (mo.mini.bin1 === mo.mini.nbin - 1)
    ? null : mo.mini.edges[mo.mini.bin1 + 1];

  // reset histogram status
  mo.mini.hist = null;
  mo.mini.edges = null;
  mo.mini.bin0 = null;
  mo.mini.bin1 = null;
  mo.mini.drag = null;

  var res = [];
  var mask = mo.mask;
  var hasMask = (Object.keys(mask).length > 0);
  var df = mo.data.df;

  // selection will take place within the already selected contigs
  var picked = Object.keys(mo.pick);
  var n = picked.length;
  var idx,
      val;

  // find within selected contigs which ones are within the range
  for (var i = 0; i < n; i++) {
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
  var table = byId('data-table');
  table.innerHTML = '';
  var header = table.createTHead();
  var row = header.insertRow(-1);
  var n = columns.length;
  for (var i = 0; i < n; i++) {
    var cell = row.insertCell(-1);
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
  var a = document.createElement('a');
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
  var a = document.createElement('a');
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
  var idmap = {};
  var df = data.df;
  var n = df.length;
  for (var i = 0; i < n; i++) {
    idmap[i] = df[i][0];
  }
  var tsv = '';
  Object.keys(bins).sort().forEach(function (name) {
    tsv += (name + '\t' + Object.keys(bins[name]).sort().map(function (i) {
      return idmap[i];
    }).join(',') + '\n');
  });
  var a = document.createElement('a');
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
  var table = byId('data-table');
  for (var i = 0; i < n; i++) {
    var row = table.tBodies[0].insertRow(-1);
    for (var j = 0; j < data.cols.length; j++) {
      var cell = row.insertCell(-1);
      cell.innerHTML = value2Str(data.df[i][j], data.types[j]);
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
  var data = mo.data;
  var view = mo.view;
  var bins = mo.bins;

  // validate binning plan
  var names = Object.keys(bins);
  var n = names.length;
  if (n === 0) {
    toastMsg('Must define at least one bin.', mo.stat);
    return;
  }

  // get bin labels
  var labels = Array(data.df.length).fill(0);
  names.forEach(function (name, i) {
    Object.keys(bins[name]).forEach(function (idx) {
      labels[idx] = i + 1;
    });
  });

  // get contig positions
  var xi = view.x.i;
  var yi = view.y.i;
  var vals = data.df.map(function (datum) {
    return [datum[xi], datum[yi]];
  });

  // This is a heavy calculation so a progress bar is displayed prior to
  // starting the calculation. This can only be achieved through an async
  // operation. There is no good sync way to force the browser to "flush".
  // See: https://stackoverflow.com/questions/16876394/
  toastMsg('Calculating silhouette coefficients.', mo.stat, 0, true);
  setTimeout(function () {

    // calculate pairwise distance if not already
    if (mo.dist === null) mo.dist = pdist(vals);

    // calculate silhouette scores
    var scores = silhouetteSample(vals, labels, mo.dist);

    // remove unbinned contigs
    scores = scores.map(function (score, i) {
      return labels[i] ? score : null;
    });

    // add scores to data table
    var col = data.cols.indexOf('silhouette');

    // append new column and modify controls
    if (col === -1) {
      scores.forEach(function (score, i) {
        data.df[i].push(score);
      });
      col = data.cols.length;
      data.cols.push('silhouette');
      data.types.push('number');
      updateCtrlByData(data, view);
      initInfoTable(data, view.spcols.len, mo.pick);
    }

    // update existing column
    else {
      scores.forEach(function (score, i) {
        data.df[i][col] = score;
      });
    }

    // color contigs by score
    mo.view['color'].zero = false; // silhouettes can be negative
    var sel = byId('color-field-sel');
    sel.value = col;
    sel.dispatchEvent(new Event('change'));

    // summarize scores
    scores = scores.filter(function (score) {
      return score !== null;
    })
    toastMsg('Mean silhouette score of contigs of ' + n + ' bins: '
      + arrMean(scores).toFixed(3) + '.', mo.stat, 0, false, true);

  }, 0);
}


/**
 * Calculate adjusted Rand index between current and reference binning plans.
 * @function calcAdjRand
 * @param {Object} mo - main object
 * @param {string} field - categorical field to serve as reference
 */
function calcAdjRand(mo, field) {
  var df = mo.data.df;
  var n = df.length;

  // current labels
  var cur = Array(n).fill(0);
  var bins = mo.bins;
  for (var bin in bins) {
    for (var i in bins[bin]) {
      cur[i] = bin;
    }
  }

  // reference labels
  var ref = Array(n).fill(0);
  var idx = mo.data.cols.indexOf(field);
  for (var i = 0; i < n; i++) {
    var val = df[i][idx];
    if (val !== null) {
      ref[i] = val[0];
    }
  }

  // calculation
  var ari = adjustedRandScore(ref, cur);

  toastMsg('Adjusted Rand index between current binning plan and "' + field +
    '": ' + ari.toFixed(3) + '.', mo.stat, 0, false, true);
}
