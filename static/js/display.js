"use strict";

/**!
 * @module display
 * @file Display functions.
 * @description This module regulates the five display items (x- and y-axis),
 * size, opacity, and color of the assembly plot.
 */


function initDisplayCtrl(mo) {
  const view = mo.view;

  /**
   * Display panel controls
   */

  // show/hide legend
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const tr = this.parentElement.parentElement.parentElement;
      const legend = tr.nextElementSibling;
      legend.classList.toggle('hidden');
      this.classList.toggle('pressed');
      // have to update legends here, because it relies on visibility
      if (!legend.classList.contains('hidden')) {
        updateLegends(mo, [tr.getAttribute('data-item')]);
      }
    });
  });

  // change display item
  ['x', 'y', 'size', 'opacity', 'color'].forEach(function (key) {
    byId(key + '-field-sel').addEventListener('change', function () {
      byId(key + '-param-span').classList.toggle('hidden', !this.value);
      if (!this.value) {
        const div = byId(key + '-legend');
        if (div) div.parentElement.parentElement.classList.add('hidden');
      }
      displayItemChange(key, this.value, view[key].scale, mo);
    });
  });

  // swap x- and y-axes
  document.querySelectorAll('button.swap-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const xx = view.x,
            yy = view.y;
      ['i', 'scale', 'min', 'max'].forEach(key => {
        xx[key] = [yy[key], yy[key] = xx[key]][0];
      });
      updateControls(mo.data, view);
      renderArena(mo);
    });
  });

  // populate palettes
  populatePaletteSelect();

  // initialize continuous color map
  view.color.contmap = palette11to101(PALETTES[view.contpal]);

  // color palette select button
  byId('palette-btn').addEventListener('click', function () {
    const lst = byId('palette-select');
    if (lst.classList.contains('hidden')) {
      const val = byId('color-field-sel').value;
      if (!val) return;
      const isNum = (mo.data.types[val] === 'number');
      lst.querySelectorAll('.disc').forEach(div => {
        div.classList.toggle('hidden', isNum);
      });
      lst.querySelectorAll('.cont').forEach(div => {
        div.classList.toggle('hidden', !isNum);
      });
      const rect = this.getBoundingClientRect();
      lst.style.top = rect.bottom + 'px';
      lst.style.left = rect.left + 'px';
      lst.classList.remove('hidden');
    } else {
      lst.classList.add('hidden');
    }
  });

  // select palette
  byId('palette-select').querySelectorAll('table').forEach(
    function (table) {
    for (let row of table.rows) {
      row.addEventListener('click', function () {
        const palette = this.firstElementChild.innerHTML;
        if (this.parentElement.parentElement.parentElement.classList
          .contains('cont')) {
          view.contpal = palette;
          view.color.contmap = palette11to101(PALETTES[palette]);
        } else {
          view.discpal = palette;
          updateColorMap(mo);
        }
        updateLegends(mo, ['color']);
        renderArena(mo);
      });
    }
  });

  // add/remove discrete color
  byId('add-color-btn').addEventListener('click', function () {
    view.ncolor += 1;
    updateColorMap(mo);
    renderArena(mo);
    updateLegends(mo, ['color']);
  });

  byId('remove-color-btn').addEventListener('click', function () {
    if (view.ncolor === 1) return;
    view.ncolor -= 1;
    updateColorMap(mo);
    renderArena(mo);
    updateLegends(mo, ['color']);
  });


  /**
   * Legends of display items.
   */

  document.querySelectorAll('.legend').forEach(function (leg) {

    leg.addEventListener('mouseenter', function () {
      this.querySelectorAll('.clip').forEach(function (clip) {
        clip.classList.add('hidden');
      });
    });

    leg.addEventListener('mouseleave', function () {
      this.setAttribute('data-ranging', 'none');
      this.querySelectorAll('.clip').forEach(function (clip) {
        clip.classList.remove('hidden');
      });
    });
  });

  document.querySelectorAll('.gradient').forEach(function (grad) {

    grad.addEventListener('mousemove', function (e) {
      const item = this.parentElement.getAttribute('data-item');
      const v = view[item];
      const rect = this.getBoundingClientRect();
      const width = rect.right - rect.left;
      const offset = e.clientX - rect.left;
      const step = width / 10;
      const ranging = this.parentElement.getAttribute('data-ranging');

      // show tooltip
      if (ranging === 'none') {

        // skip if cursor is outside range
        if (offset < this.parentElement.querySelector('.range.lower')
          .getAttribute('data-tick') * step) return;
        if (offset > this.parentElement.querySelector('.range.upper')
          .getAttribute('data-tick') * step) return;

        // specify tip position
        const tip = byId('legend-tip');
        tip.style.left = e.clientX + 'px';
        tip.style.top = Math.round(rect.bottom) + 'px';

        // specify tip label
        const vmin = v.zero ? 0 : v.min;
        const value = scaleNum(vmin + offset / width * (v.max - vmin),
          unscale(v.scale));
        byId('legend-value').innerHTML = formatValueLabel(
          value, view[item].i, 3, true, mo);

        // item-specific operations
        const circle = byId('legend-circle');
        circle.classList.remove('hidden');
        if (item === 'size') {
          circle.style.backgroundColor = 'black';
          const diameter = Math.ceil(view.rbase * 2 * offset / width);
          circle.style.height = diameter + 'px';
          circle.style.width = diameter + 'px';
        }
        else if (item === 'opacity') {
          circle.style.height = '15px';
          circle.style.width = '15px';
          circle.style.backgroundColor = 'rgba(0,0,0,' + (offset / width)
            .toFixed(2) + ')';
        }
        else if (item === 'color') {
          circle.style.height = '15px';
          circle.style.width = '15px';
          circle.style.backgroundColor = 'rgb(' + view.color.contmap[
            Math.round(offset / width * 100)] + ')';
        }
      }

      // drag to adjust range
      else {
        const tick = Math.round(offset / width * 10);
        const range = this.parentElement.querySelector('.range.' + ranging);
        if (tick == range.getAttribute('data-tick')) return;
        // ensure there's at least one step between lower & upper bounds
        const other = (ranging === 'lower') ? 'upper' : 'lower';
        const space = (this.parentElement.querySelector('.range.' + other)
          .getAttribute('data-tick') - tick) * (1 - ['lower', 'upper']
          .indexOf(ranging) * 2);
        if (space < 1) return;
        range.setAttribute('data-tick', tick);
        range.style.left = Math.round(rect.left + tick * step) + 'px';
      }
    });

    grad.addEventListener('mouseenter', function () {
      if (this.parentElement.getAttribute('data-ranging') === 'none') {
        byId('legend-tip').classList.remove('hidden');
      }
    });

    grad.addEventListener('mouseleave', function () {
      byId('legend-tip').classList.add('hidden');
    });

    grad.addEventListener('mouseup', function () {
      const ranging = this.parentElement.getAttribute('data-ranging');
      if (ranging === 'none') {
        byId('legend-tip').classList.add('hidden');
      } else {
        this.parentElement.setAttribute('data-ranging', 'none');
        const item = this.parentElement.getAttribute('data-item');
        view[item][ranging]= parseInt(this.parentElement.querySelector(
          '.range.' + ranging).getAttribute('data-tick')) * 10;
        renderArena(mo);
        updateLegends(mo, [item]);
      }
    });
  });

  document.querySelectorAll('.legend .range').forEach(function (range) {
    range.title = 'Adjust ' + checkClassName(range, ['lower', 'upper']) +
      ' bound of ' + range.parentElement.getAttribute('data-item');
    range.addEventListener('mousedown', rangeMouseDown);
    range.addEventListener('mouseup', rangeMouseUp);
  });

  function rangeMouseDown(e) {
    e.preventDefault();
    this.parentElement.setAttribute('data-ranging',
      checkClassName(this, ['lower', 'upper']));
  }

  function rangeMouseUp(e) {
    e.preventDefault();
    this.parentElement.setAttribute('data-ranging', 'none');
    const item = this.parentElement.getAttribute('data-item');
    view[item][checkClassName(this, ['lower', 'upper'])]
      = this.getAttribute('data-tick') * 10;
    renderArena(mo);
    updateLegends(mo, [item]);
  }

  document.querySelectorAll('.legend .min').forEach(function (label) {
    label.title = 'Toggle zero or minimum value';
    label.addEventListener('click', function () {
      const item = this.parentElement.getAttribute('data-item');
      view[item].zero = !view[item].zero;
      updateLegends(mo, [item]);
      renderArena(mo);
    });
  });

}


/**
 * Update display panel controls by data.
 * @function updateDisplayCtrl
 * @param {Object} data - data object
 * @param {Object} view - view object
 */
function updateDisplayCtrl(data, view) {
  const cols = data.cols,
        types = data.types;

  // display items to be updated
  const keys = ['x', 'y', 'size', 'opacity', 'color'];

  const n = cols.length;
  let sel, i, type, opt, idx, span, scale, btn;
  for (let key of keys) {
    sel = byId(key + '-field-sel');
    sel.innerHTML = '';

    // all but coordinates can be empty
    if (key !== 'x' && key !== 'y') {
      sel.add(document.createElement('option'));
    }

    // add fields to each list
    for (i = 0; i < n; i++) {
      type = types[i];
      if (type === 'id') continue;
      if (type === 'number' || (type === 'category' && key === 'color')) {

        // create an option
        opt = document.createElement('option');
        opt.value = i;
        opt.text = cols[i];
        sel.add(opt);

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
}


/**
 * Update legends.
 * @function updateLegends
 * @param {Object} mo - main object
 * @param {Array.<string>} [items] - display items to update
 * @todo other items
 */
function updateLegends(mo, items) {
  items = items || ['size', 'opacity', 'color'];
  let icol, isCat, scale, legend, grad, rect, step, poses, clip;

  for (let item of items) {
    icol = mo.view[item].i;
    if (!icol) continue;

    // discrete colors
    if (item === 'color') {
      isCat = (mo.data.types[icol] === 'category');
      byId('color-legend').classList.toggle('hidden', isCat);
      byId('color-legend-2').classList.toggle('hidden', !isCat);
      if (isCat) {
        updateColorTable(mo);
        continue;
      }
    }

    // continuous data
    scale = unscale(mo.view[item].scale);
    legend = byId(item + '-legend');
    grad = legend.querySelector('.gradient');
    if (grad === null) continue;
  
    // refresh labels
    ['min', 'max'].forEach(key => {
      const label = legend.querySelector('label.' + key);
      let value = scaleNum(mo.view[item][key], scale);
      value = formatValueLabel(value, icol, 3, false, mo);
      label.setAttribute('data-value', value);
      label.innerHTML = (key === 'min' && mo.view[item].zero) ? 0 : value;
    });

    // item-specific operations
    if (item === 'size') updateSizeGradient(mo);
    if (item === 'color') updateColorGradient(mo);

    // position ranges
    rect = grad.getBoundingClientRect();
    step = (rect.right - rect.left) / 10;
    poses = {};
    ['lower', 'upper'].forEach(key => {
      poses[key] = legend.querySelector('.range.' + key).getAttribute(
        'data-tick') * step;
      legend.querySelector('.range.' + key).style.left = Math.round(rect.left
        + poses[key]) + 'px';
    });
  
    // position clips
    clip = legend.querySelector('.clip.lower');
    clip.style.left = Math.round(rect.left) + 'px';
    clip.style.width = Math.floor(poses['lower']) + 'px';
    clip = legend.querySelector('.clip.upper');
    clip.style.left = Math.round(rect.left + poses['upper']) + 'px';
    clip.style.width = Math.ceil(rect.right - rect.left - poses['upper']) + 'px';
  }
}


/**
 * Update gradient in size legend.
 * @function updateSizeGradient
 * @param {Object} mo - main object
 * @description The ladder-shaped gradient is achieved by css borders, which,
 * cannot accept percentage, thus need to be adjusted specifically.
 */
function updateSizeGradient(mo) {
  const rbase = mo.view.rbase;
  const grad = byId('size-gradient');
  grad.style.height = rbase + 'px';
  grad.style.borderTopWidth = rbase + 'px';
  const rect = grad.getBoundingClientRect();
  grad.style.borderRightWidth = Math.floor(rect.right - rect.left) + 'px';
}


/**
 * Update gradient in continuous color legend.
 * @function updateColorGradient
 * @param {Object} mo - main object
 */
function updateColorGradient(mo) {
  const ci = mo.view.color.i;
  if (!ci) return;
  if (mo.data.types[ci] === 'category') return;
  byId('color-gradient').style.backgroundImage =
    'linear-gradient(to right, ' + PALETTES[mo.view.contpal].map(
    function (e) { return '#' + e; }).join(', ') + ')';
}


/**
 * Update table in discrete color legend.
 * @function updateColorTable
 * @param {Object} mo - main object
 */
function updateColorTable(mo) {
  const table = byId('color-table');
  table.innerHTML = '';
  const cmap = mo.view.color.discmap;
  let row, cell, div;

  // row for each category
  for (let cat in cmap) {
    row = table.insertRow(-1);
    cell = row.insertCell(-1);
    div = document.createElement('div');
    div.innerHTML = '&nbsp;';
    div.style.backgroundColor = '#' + cmap[cat];
    cell.appendChild(div);
    cell = row.insertCell(-1);
    cell.innerHTML = cat;
  }

  // row for others & n/a
  row = table.insertRow(-1);
  cell = row.insertCell(-1);
  div = document.createElement('div');
  div.innerHTML = '&nbsp;';
  div.style.backgroundColor = 'black';
  cell.appendChild(div);
  cell = row.insertCell(-1);
  cell.innerHTML = 'Others & N/A';
}


/**
 * Populate palette select box.
 * @function populatePaletteSelect
 */
function populatePaletteSelect() {
  const popup = byId('palette-select');
  popup.querySelectorAll('div').forEach(function (div) {
    const table = document.createElement('table');
    const pals = div.classList.contains('sequ') ? SEQUENTIAL_PALETTES
      : (div.classList.contains('dive') ? DIVERGING_PALETTES
      : QUALITATIVE_PALETTES);

    // create palette list
    pals.forEach(function (pal) {
      const row = table.insertRow(-1);
      let cell = row.insertCell(-1);
      cell.innerHTML = pal;
      cell = row.insertCell(-1);
      const box = document.createElement('div');

      // continuous color
      if (div.classList.contains('cont')) {
        box.innerHTML = '&nbsp;';
        box.style.backgroundImage = 'linear-gradient(to right, ' +
          PALETTES[pal].map(function (e) { return '#' + e; }).join(', ') + ')';
      }

      // discrete color
      else {
        let span;
        for (let i = 0; i < 8; i++) {
          span = document.createElement('span');
          span.innerHTML = '&nbsp;';
          span.style.backgroundColor = '#' + PALETTES[pal][i];
          box.appendChild(span);
        }
      }
      cell.appendChild(box);
    });
    div.appendChild(table);
  });
}


/**
 * Initiate display items based on the dataset.
 * @function initDisplayItems
 * @param {Object} data - data object
 * @param {Object} view - view object
 * @description Basically, it is a "guess" process.
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
  updateControls(mo.data, mo.view);
  buildInfoTable(mo.data, mo.view.spcols.len, mo.pick);
  buildDataTable(mo.data.cols, mo.data.types);
  fillDataTable(data, data.df.length);
  byId('bin-tbody').innerHTML = '';

  // reset view
  resetView(mo);
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
    updateLegends(mo, [item]);
  }
}
