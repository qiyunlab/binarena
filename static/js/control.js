"use strict";

/**!
 * @module control
 * @file Control functions. They allow the user to work on the content through
 * the interface.
 * @description They may directly access the "document" object. They may access
 * the master object that is passed to them.
 * @summary Table of content
 * - File functions
 * - View functions
 * - Select functions
 * - Bin functions
 * - Info table functions
 * - Export functions
 * - Data table functions
 */


/**
 * @summary File system operations
 */

/**
 * Import data from a text file.
 * @function uploadFile
 * @param {File} file - user upload file
 * @param {Object} mo - master object
 * @description It uses the FileReader object, available since IE 10.
 */
function uploadFile(file, mo) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var cache = updateDataFromText(e.target.result, mo.data);
    updateViewByData(mo, cache);
  }
  reader.readAsText(file);
}


/**
 * Import data from a remote location
 * @function updateDataFromRemote
 * @param {string} path - remote path to data file
 * @param {Object} mo - master object
 * @description It uses XMLHttpRequest, which has to be run on a server.
 */
function updateDataFromRemote(path, mo) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        var cache = updateDataFromText(this.responseText, mo.data);
        updateViewByData(mo, cache);
      }
    }
  }
  xhr.open('GET', path, true);
  xhr.send();
}


/**
 * @summary View functions
 */

/**
 * Update view given current view parameters.
 * @function updateView
 * @param {Object} mo - master object
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
  var indices = guessDisplayFields(data);
  var scales = guessDisplayScales(items);
  items.forEach(function (item) {
    view[item].i = indices[item];
    view[item].scale = scales[item];
  });
}


/**
 * Update control panel based on new data.
 * @function updateControls
 * @param {Object} data - data object
 * @param {Object} view - view object
 */
function updateControls(data, view) {

  // update field list in filtering
  var fl = document.getElementById('field-list');
  fl.innerHTML = '';
  var opt = document.createElement('option');
  fl.add(opt);
  for (var i = 0; i < data.cols.length; i++) {
    if (data.types[i] !== 'id') {
      var opt = document.createElement('option');
      opt.text = data.cols[i];
      opt.value = i;
      fl.add(opt);
    }
  }

  // update field list in display items
  var numFields = [],
    catFields = [];
  for (var i = 0; i < data.cols.length; i++) {
    var type = data.types[i],
      field = data.cols[i];
    if (type === 'number') {
      numFields.push([i, field]);
    } else if (type === 'category') {
      catFields.push([i, field]);
    }
  }

  // numeric fields
  ['x', 'y', 'size', 'opacity'].forEach(function (item) {
    var sel = document.getElementById(item + '-field-sel');
    sel.innerHTML = '';
    sel.add(document.createElement('option'));
    for (var j = 0; j < numFields.length; j++) {
      var opt = document.createElement('option');
      opt.text = numFields[j][1];
      opt.value = numFields[j][0];
      sel.add(opt);
    }

    // pre-defined index
    var idx = view[item].i;
    if (idx) sel.value = idx;
    var span = document.getElementById(item + '-param-span');
    if (idx) span.classList.remove('hidden');
    else span.classList.add('hidden');

    // pre-defined scale
    var scale = view[item].scale;
    var btn = document.getElementById(item + '-scale-btn');
    btn.setAttribute('data-scale', scale);
    btn.title = 'Scale: ' + scale;
    btn.innerHTML = scale2HTML(scale);
  });

  // categorical fields
  var sel = document.getElementById('color-field-sel');
  sel.innerHTML = '';
  sel.add(document.createElement('option'));
  catFields.forEach(function (cat) {
    var opt = document.createElement('option');
    opt.text = cat[1];
    opt.value = cat[0];
    sel.add(opt);
  });
  var idx = view.color.i;
  if (idx) sel.value = idx;
  var palette = view.color.palette;
  if (palette) document.getElementById('color-palette-sel').value =
    mo.palettes.list.indexOf(palette);
}


/**
 * Update color map based on selected field and palette.
 * @function updateColorMap
 * @param {Object} mo - master object
 * @param {number} [n=7] - number of colors to display
 */
function updateColorMap(mo, n) {
  n = n || 7;
  mo.view.color.map = {};
  var palette = mo.palettes.make(mo.view.color.palette, 10);

  // get categories and their occurrence numbers
  var cats = {}
  for (var i = 0; i < mo.data.df.length; i++) {
    var val = mo.data.df[i][mo.view.color.i];
    if (val === undefined || val === null) continue;
    var cat = val[0];
    if (cat in cats) {
      cats[cat]++;
    } else {
      cats[cat] = 1;
    }
  }

  // convert object to array of key: value pairs, then sort
  cats = Object.keys(cats).map(function (key) {
    return [key, cats[key]];
  });
  cats.sort(function (a, b) {
    return b[1] - a[1];
  });

  // take up to given number of frequent categories
  for (var i = 0; i < Math.min(n, cats.length); i++) {
    mo.view.color.map[cats[i][0]] = palette[i];
  }
}


/**
 * Initiate or restore default view given data.
 * @function resetView
 * @param {Object} mo - master object
 * @param {boolean} [keep=false] - whether keep selection and masked
 */
function resetView(mo, keep) {
  var data = mo.data;
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

  // calculate min and max of display items
  var items = ['x', 'y', 'size', 'opacity'];
  var indices = [],
    values = [];
  for (var i = 0; i < items.length; i++) {
    indices.push(view[items[i]].i);
    values.push([]);
  }
  var masking = (Object.keys(mo.mask).length > 0);
  for (var i = 0; i < data.df.length; i++) {
    if (masking && i in mo.mask) continue;
    for (var j = 0; j < items.length; j++) {
      values[j].push(data.df[i][indices[j]]);
    }
  }
  for (var i = 0; i < items.length; i++) {
    view[items[i]].max = scaleNum(Math.max.apply(null, values[i]),
      view[items[i]].scale);
    view[items[i]].min = scaleNum(Math.min.apply(null, values[i]),
      view[items[i]].scale);
  }

  // clear overlay canvas
  oray.getContext('2d').clearRect(0, 0, oray.width, oray.height);

  // re-render
  updateView(mo);
}


/**
 * Update view based on data.
 * @function updateViewByData
 * @param {Object} mo - master object
 * @param {Array.<Object, Object, Object>} [cache=] - decimals, categories and
 * features
 * @description Singling out cache is for performance consideration.
 * @todo to fix
 */
function updateViewByData(mo, cache) {
  var data = mo.data;
  var view = mo.view;

  // close or open data
  if (data.df.length === 0) {
    document.getElementById('hide-side-btn').click();
    document.getElementById('show-side-btn').disabled = true;
    document.getElementById('drop-sign').classList.remove('hidden');
    var btn = document.getElementById('dash-btn');
    if (btn.classList.contains('active')) btn.click();
    document.getElementById('dash-panel').classList.add('hidden');
  } else {
    document.getElementById('show-side-btn').disabled = false;
    document.getElementById('show-side-btn').click();
    document.getElementById('drop-sign').classList.add('hidden');
    var btn = document.getElementById('dash-btn');
    if (!btn.classList.contains('active')) btn.click();
  }

  // cache data
  cache = cache || cacheData(data);
  view.decimals = cache[0];
  view.categories = cache[1];
  view.features = cache[2];
  view.lencol = guessLenColumn(data);
  view.covcol = guessCovColumn(data);

  // calculate total abundance
  if (view.lencol && view.covcol) {
    var il = data.cols.indexOf(view.lencol);
    var ic = data.cols.indexOf(view.covcol);
    view.abundance = 0;
    for (var i = 0; i < data.df.length; i++) {
      view.abundance += data.df[i][il] * data.df[i][ic];
    }
  }

  // manipulate interface
  initDisplayItems(mo.data, mo.view);
  updateControls(mo.data, mo.view);
  initInfoTable(mo.data, mo.view.lencol, mo.pick);
  initDataTable(mo.data.cols, mo.data.types);
  fillDataTable(data);
  document.getElementById('bin-tbody').innerHTML = '';
  resetView(mo);
}


/**
 * When user changes display item.
 * @function displayItemChange
 * @param {Object} item - display variable
 * @param {Object} i - field index
 * @param {Object} scale - scaling factor
 * @param {Object} mo - master object
 */
function displayItemChange(item, i, scale, mo) {
  mo.view[item].i = i;
  mo.view[item].scale = scale;
  resetView(mo, true);
}


/**
 * @summary Select functions
 */

/**
 * Update selection.
 * @function updateSelection
 * @param {Object} mo - master object
 */
function updateSelection(mo) {
  renderSelection(mo);
  updateBinToolbar(mo);
  updateSelectToolbar(mo);
  updateSelectionInfo(mo);
  updateMaskToolbar(mo);
}


/**
 * Update selected toolbar.
 * @function updateSelectToolbar
 * @param {Object} mo - master object
 */
function updateSelectToolbar(mo) {
  var keys = Object.keys(mo.pick);
  var n = keys.length;
  var str = 'Selected: ' + n;
  if (n === 1) str += ' (ID: ' + mo.data.df[keys[0]][0] + ')';
  document.getElementById('info-head').lastElementChild.firstElementChild
    .innerHTML = str;
}


/**
 * Update masked toolbar.
 * @function updateMaskToolbar
 * @param {Object} mo - master object
 */
function updateMaskToolbar(mo) {
  var keys = Object.keys(mo.mask);
  var n = keys.length;
  var str = 'Masked: ' + n;
  if (n === 1) str += ' (ID: ' +  mo.data.df[keys[0]][0] + ')';
  document.getElementById('mask-head').lastElementChild.firstElementChild
    .innerHTML = str;
}


/**
 * Update information of selected contigs.
 * @function updateSelectionInfo
 * @param {Object} mo - master object
 */
function updateSelectionInfo(mo) {
  var table = document.getElementById('info-table');
  var indices = Object.keys(mo.pick);
  if (indices.length === 0) { // no contig is selected
    table.classList.add('hidden');
  } else {
    var rows = table.rows;
    var span = document.getElementById('info-ctrl-span');

    // single contig
    if (indices.length === 1) {
      var selData = mo.data.df[indices[0]];
      for (var i = 0; i < rows.length; i++) {
        var val = selData[rows[i].getAttribute('data-index')];
        var type = rows[i].getAttribute('data-type');
        var spanIn = (rows[i].cells[1].contains(span));
        if (spanIn) table.parentElement.appendChild(span);
        rows[i].cells[1].innerHTML = value2Str(val, type);
        if (spanIn) rows[i].cells[1].appendChild(span);
      }
    }

    // multiple contigs
    else {
      var selData =
        transpose(indices.sort().map(function (i) { return mo.data.df[i]; }));
      for (var i = 0; i < rows.length; i++) {
        var arr = selData[rows[i].getAttribute('data-index')];
        var refcol = rows[i].getAttribute('data-refcol');
        var refarr = refcol ? selData[mo.data.cols.indexOf(refcol)] : null;
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
 * @param {Object} mo - master object
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

  // temporarily move control span, if present
  var span = document.getElementById('info-ctrl-span');
  var spanIn = (row.cells[1].contains(span));
  if (spanIn) row.parentElement.parentElement.appendChild(span);

  if (type !== 'number') {
    row.cells[1].innerHTML = columnInfo(arr, type);
  } else {
    var met = row.getAttribute('data-metric');
    var deci = mo.view.decimals[row.getAttribute('data-col')];
    var refcol = row.getAttribute('data-refcol');
    row.cells[1].innerHTML = columnInfo(arr, type, met, deci, refarr);
  }

  // move control span back
  if (spanIn) row.cells[1].appendChild(span);
}


/**
 * Select field change event.
 * @function selectFieldChange
 * @param {Object} e - event object
 * @param {Object} data - data object
 * @param {Object} view - view object
 */
function selectFieldChange(e, data, view) {
  ['search-btn', 'num-sel-p', 'cat-sel-p', 'fea-sel-p', 'des-sel-p']
    .forEach(function (id) {
    document.getElementById(id).classList.add('hidden');
  });
  var span = document.getElementById('str-match-span');
  span.classList.add('hidden');

  // show controls by field type
  var i = e.target.value;
  if (i !== '') {
    i = parseInt(i);
    switch (data.types[i]) {
      case 'number':
        document.getElementById('num-sel-p').classList.remove('hidden');
        break;
      case 'category':
        var p = document.getElementById('cat-sel-p');
        p.lastElementChild.appendChild(span);
        // p.appendChild(span);
        span.classList.remove('hidden');
        p.classList.remove('hidden');
        autoComplete(document.getElementById('cat-sel-txt'),
          Object.keys(view.categories[data.cols[i]]).sort());
        break;
      case 'feature':
        var p = document.getElementById('fea-sel-p');
        p.lastElementChild.appendChild(span);
        // p.appendChild(span);
        span.classList.remove('hidden');
        p.classList.remove('hidden');
        autoComplete(document.getElementById('fea-sel-txt'),
          Object.keys(view.features[data.cols[i]]).sort());
        break;
      case 'description':
        var p = document.getElementById('des-sel-p');
        p.lastElementChild.appendChild(span);
        // p.appendChild(span);
        span.classList.remove('hidden');
        p.classList.remove('hidden');
        break;
    }
    document.getElementById('search-btn').classList.remove('hidden');
  }
}


/**
 * Select contigs by criteria.
 * @function selectByCriteria
 * @param {Object} mo - master object
 * @returns {boolean} whether selection is successful
 */
function selectByCriteria(mo) {
  var data = mo.data;
  var mask = mo.mask;
  var f = document.getElementById('field-list').value;
  if (f === '') {
    toastMsg('No search criterium was specified.', mo.stat);
    return false;
  }
  f = parseInt(f);
  var type = data.types[f];

  // filter contigs by currently specified criteria
  var indices = [];
  var masking = (Object.keys(mask).length > 0) ? true : false;

  // search by threshold
  if (type === 'number') {

    // validate minimum and maximum thresholds
    var min = document.getElementById('min-txt').value;
    var max = document.getElementById('max-txt').value;
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
    var minIn = (document.getElementById('min-btn').innerHTML === '[') ?
      true : false;
    var maxIn = (document.getElementById('max-btn').innerHTML === '[') ?
      true : false;

    // compare values to threshold(s)
    for (var i = 0; i < data.df.length; i++) {
      if (masking && i in mask) continue;
      var val = data.df[i][f];
      if ((val !== null) &&
        (min === null || (minIn ? (val >= min) : (val > min))) &&
        (max === null || (maxIn ? (val <= max) : (val < max)))) {
          indices.push(i);
      }
    }
  }

  // search by keyword
  else {
    var text = document.getElementById(type.substr(0, 3) + '-sel-txt')
      .value;
    if (text === '') {
      toastMsg('Must specify a keyword.', mo.stat);
      return false;
    }
    var mcase = document.getElementById('case-btn').classList
      .contains('pressed');
    if (!mcase) text = text.toUpperCase();
    var mwhole = document.getElementById('whole-btn').classList
      .contains('pressed');
    for (var i = 0; i < data.df.length; i++) {
      if (masking && i in mask) continue;
      var val = data.df[i][f];
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

  var selecting = !document.getElementById('mask-chk').checked;
  treatSelection(indices, selecting, mo);
  return true;
}


/**
 * Deal with selected contigs.
 * @function treatSelection
 * @param {number[]} indices - indices of contigs to be selected / excluded
 * @param {boolean} [selecting=true] - pick or mask
 * @param {Object} mo - master object
 */
function treatSelection(indices, selecting, mo) {
  selecting = (typeof selecting !== 'undefined') ? selecting : true;
  var target = selecting ? mo.pick : mo.mask;

  // new selection
  if (document.getElementById('sel-new-btn').classList.contains('pressed')) {
    Object.keys(target).forEach(function (i) {
      delete target[i];
    });
    indices.forEach(function (i) {
      target[i] = null;
    });
    toastMsg((selecting ? 'Selected' : 'Masked') + ' ' + indices.length +
      ' contig(s).', mo.stat);
  }

  // add to selection
  else if (document.getElementById('sel-add-btn').classList
    .contains('pressed')) {
    var n = 0;
    indices.forEach(function (i) {
      if (!(i in target)) {
        target[i] = null;
        n++;
      }
    });
    toastMsg('Added ' + n + ' contig(s) to ' + (selecting ? 'selection' :
      'mask') + '.', mo.stat);
  }

  // remove from selection
  else if (document.getElementById('sel-remove-btn').classList
    .contains('pressed')) {
    var toDel = [];
    indices.forEach(function (i) {
      if (i in target) toDel.push(i);
    });
    toDel.forEach(function (i) {
      delete target[i];
    });
    toastMsg('Removed ' + parseInt(toDel.length) + ' contig(s) from ' +
      (selecting ? 'selection' : 'mask') + '.', mo.stat);
  }

  // remove excluded contigs from selection, if any
  if (!selecting) {
    var toDel = [];
    Object.keys(mo.pick).forEach(function (i) {
      if (i in mo.mask) toDel.push(i);
    });
    toDel.forEach(function (i) {
      delete mo.pick[i];
    });
  }

  updateView(mo);
  mo.rena.focus();
}


/**
 * Let user draw polygon to select a region of data points.
 * @function polygonSelect
 */
function polygonSelect(mo) {
  var data = mo.data;
  var view = mo.view;
  var stat = mo.stat;
  var rena = mo.rena;
  var oray = mo.oray;
  var btn = document.getElementById('polygon-btn');
  if (!stat.drawing) {
    btn.innerHTML = btn.innerHTML.substr(0, btn.innerHTML.lastIndexOf(' ') +
      1) + 'Finish';
    stat.polygon = [];
    stat.drawing = true;
  } else {
    oray.getContext('2d').clearRect(0, 0, oray.width, oray.height);
    var indices = [];
    var masking = (Object.keys(mo.mask).length > 0) ? true : false;
    for (var i = 0; i < data.df.length; i++) {
      if (masking && i in mo.mask) continue;
      var datum = data.df[i];
      var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
        (view.x.max - view.x.min) - 0.5) * rena.width;
      var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
        (view.y.max - view.y.min) - 0.5) * rena.height;
      if (pnpoly(x, y, stat.polygon)) indices.push(i);
    }
    btn.innerHTML = btn.innerHTML.substr(0, btn.innerHTML.lastIndexOf(' ') +
      1) + 'Start';
    stat.polygon = [];
    stat.drawing = false;
    if (indices.length > 0) {
      var selecting = !document.getElementById('mask-chk').checked;
      treatSelection(indices, selecting, mo);
    }
  }
}


/**
 * @summary Bin functions
 */

/**
 * Update bins toolbar.
 * @function updateBinToolbar
 * @param {Object} mo - master object
 */
function updateBinToolbar(mo) {
  document.getElementById('bins-head').lastElementChild.firstElementChild
    .innerHTML = 'Bins: ' + Object.keys(mo.bins).length;
  var n = 0;
  var table = document.getElementById('bin-tbody');
  for (var i = 0; i < table.rows.length; i++) {
    if (table.rows[i].classList.contains('selected')) n ++;
  }
  if (n === 0) {
    document.getElementById('delete-bin-btn').classList.add('hidden');
    document.getElementById('merge-bin-btn').classList.add('hidden');
  } else if (n === 1) {
    document.getElementById('delete-bin-btn').classList.remove('hidden');
    document.getElementById('merge-bin-btn').classList.add('hidden');
  } else {
    document.getElementById('delete-bin-btn').classList.remove('hidden');
    document.getElementById('merge-bin-btn').classList.remove('hidden');
  }
  if (n === 0 || Object.keys(mo.pick).length === 0) {
    document.getElementById('add-to-bin-btn').classList.add('hidden');
    document.getElementById('remove-from-bin-btn').classList.add('hidden');
  } else {
    document.getElementById('add-to-bin-btn').classList.remove('hidden');
    document.getElementById('remove-from-bin-btn').classList
      .remove('hidden');
  }
}


/**
 * Update bin table.
 * @function updateBinTable
 * @param {Object} mo - master object
 */
function updateBinTable(mo) {
  var view = mo.view;
  var data = mo.data;
  var bins = mo.bins;
  var table = document.getElementById('bin-tbody');
  table.innerHTML = '';

  // cache length and coverage data
  var lens = {};
  var covs = {};
  if (view.lencol || view.covcol) {
    var il = view.lencol ? data.cols.indexOf(view.lencol) : null;
    var ic = view.covcol ? data.cols.indexOf(view.covcol) : null;
    for (var i = 0; i < data.df.length; i++) {
      if (il) lens[i] = data.df[i][il];
      if (ic) covs[i] = data.df[i][ic];
    }
  }
  
  Object.keys(bins).sort().forEach(function (name) {
    var row = table.insertRow(-1);

    // 1st cell: name
    var cell = row.insertCell(-1);
    // name label
    var label = document.createElement('span');
    label.innerHTML = name;
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
      binNameKeyUp(e, mo.stat);
    });
    cell.appendChild(text);

    // 2nd cell: contigs
    var cell = row.insertCell(-1);
    cell.innerHTML = Object.keys(bins[name]).length;

    // 3rd cell: length (kb)
    var cell = row.insertCell(-1);
    if (view.lencol) {
      var sum = 0;
      for (var i in bins[name]) sum += lens[i];
      cell.innerHTML = parseInt(sum / 1000);
    } else cell.innerHTML = 'na';
    
    // 4th cell: abundance (%)
    var cell = row.insertCell(-1);
    if (view.lencol && view.covcol) {
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
 */
function binNameKeyUp(e, stat) {
  var text = e.target;
  var label = text.parentElement.firstElementChild;
  var name = label.innerHTML;
  if (e.keyCode === 13) { // press Enter to save new name
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
  } else if (e.keyCode === 27) { // press ESC to cancel editing
    text.classList.add('hidden');
    label.classList.remove('hidden');
  }
}


/**
 * @summary Information table functions
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
  var table = document.getElementById('info-table');

  // temporarily move control span
  var span = document.getElementById('info-ctrl-span');
  span.classList.add('hidden');
  table.parentElement.appendChild(span);

  // weight-by selection - clear
  var sel = document.getElementById('info-ref-sel');
  sel.innerHTML = '';
  sel.add(document.createElement('option'));

  // clear table
  table.innerHTML = '';

  // create rows
  for (var i = 1; i < data.cols.length; i++) {
    var row = table.insertRow(-1);
    row.setAttribute('data-index', i);
    row.setAttribute('data-col', data.cols[i]);
    row.setAttribute('data-type', data.types[i]);
    if (data.types[i] === 'number') {
      var met = guessColMetric(data.cols[i]);
      row.setAttribute('data-refcol', (met.substr(met.length - 2) === 'by')
        ? lencol : '');
      row.setAttribute('data-metric', (met.substr(0, 3) === 'sum') ? 'sum'
        : 'mean');
    }

    // row hover event: append control span
    row.addEventListener('mouseenter', function () {
      if (document.activeElement === sel) return false;

      // three buttons: metric (sum or mean), plot entry, weight-by selection
      // the 4th and permanent button is "hide"
      var mbtn = document.getElementById('info-metric-btn');
      var pbtn = document.getElementById('info-plot-btn');
      var rspan = document.getElementById('info-ref-span');

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
        sel.value = this.getAttribute('data-refcol');;
        mbtn.innerHTML = (met === 'sum') ? '&Sigma;<i>x</i>' :
          '<span style="text-decoration: overline;"><i>x</i></span>';
        mbtn.classList.remove('hidden');
        pbtn.classList.remove('hidden');
        rspan.classList.remove('hidden');
      }

      // append controls to row
      this.cells[this.cells.length - 1].appendChild(span);
      span.classList.remove('hidden');
    });
    row.addEventListener('mouseleave', function () {
      if (document.activeElement === sel) return false;
      span.classList.add('hidden');
    });

    // weight-by selection - add numeric field
    if (data.types[i] === 'number') {
      var opt = document.createElement('option');
      opt.text = data.cols[i];
      opt.value = data.cols[i];
      sel.add(opt);
    }

    // create cells
    var cell = row.insertCell(-1); // 1st cell: field name
    cell.innerHTML = data.cols[i];
    row.insertCell(-1); // 2nd cell: field value
  }
}


/**
 * @summary Export functions
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
  for (var i = 0; i < data.df.length; i++) {
    idmap[i] = data.df[i][0];
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
 * @summary Data table functions
 */

/**
 * Initiate data table based on data.
 * @function initDataTable
 */
function initDataTable(columns, types) {
  var table = document.getElementById('data-table');
  table.innerHTML = '';
  var header = table.createTHead();
  var row = header.insertRow(-1);
  for (var i = 0; i < columns.length; i++) {
    var cell = row.insertCell(-1);
    cell.setAttribute('data-index', i);
    cell.setAttribute('data-column', columns[i]);
    cell.setAttribute('data-type', types[i]);
    cell.innerHTML = columns[i];
  }
  table.appendChild(document.createElement('tbody'));
}


/**
 * Populate data table by data.
 * @function fillDataTable
 * @param {Object} data - data object
 * @param {number} [n=100] - maximum number of rows
 */
function fillDataTable(data, n) {
  n = n || 100;
  var table = document.getElementById('data-table');
  for (var i = 0; i < n; i++) {
    var row = table.tBodies[0].insertRow(-1);
    for (var j = 0; j < data.cols.length; j++) {
      var cell = row.insertCell(-1);
      cell.innerHTML = value2Str(data.df[i][j], data.types[j]);
    }
  }
}
