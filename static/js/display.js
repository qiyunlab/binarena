"use strict";

/**!
 * @module display
 * @file Display functions.
 * @description This module regulates the five display items (x- and y-axis),
 * size, opacity, and color of the assembly plot.
 */


/**
 * Initialize display controls.
 * @function initDisplayCtrl
 * @param {Object} mo - main object
 */
function initDisplayCtrl(mo) {
  const view = mo.view;

  /**
   * Display panel controls
   */

  // show/hide legend
  for (let btn of document.querySelectorAll('.legend-btn')) {
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
  }

  // change display item
  for (let key of ['x', 'y', 'size', 'opacity', 'color']) {
    byId(key + '-field-sel').addEventListener('change', function () {
      byId(key + '-param-span').classList.toggle('hidden', !this.value);
      if (!this.value) {
        const div = byId(key + '-legend');
        if (div) div.parentElement.parentElement.classList.add('hidden');
      }
      displayItemChange(key, this.value, view[key].scale, mo);
    });
  }

  // swap x- and y-axes
  for (let btn of document.querySelectorAll('button.swap-btn')) {
    btn.addEventListener('click', function () {
      const xx = view.x,
            yy = view.y;
      for (let key of ['i', 'scale', 'min', 'max']) {
        xx[key] = [yy[key], yy[key] = xx[key]][0];
      }
      updateControls(mo);
      prepDataForDisplay(mo, ['x', 'y']);
      renderArena(mo);
      renderSelection(mo);
    });
  }

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
      const isNum = (mo.cols.types[val] === 'num');
      for (let div of lst.querySelectorAll('.disc')) {
        div.classList.toggle('hidden', isNum);
      }
      for (let div of lst.querySelectorAll('.cont')) {
        div.classList.toggle('hidden', !isNum);
      }
      const rect = this.getBoundingClientRect();
      lst.style.top = rect.bottom + 'px';
      lst.style.left = rect.left + 'px';
      lst.classList.remove('hidden');
    } else {
      lst.classList.add('hidden');
    }
  });

  // select palette
  for (let table of byId('palette-select').querySelectorAll('table')) {
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
        prepDataForDisplay(mo, ['color']);
        renderArena(mo);
        updateLegends(mo, ['color']);
      });
    }
  }

  // add/remove discrete color
  byId('add-color-btn').addEventListener('click', function () {
    view.ncolor += 1;
    updateColorMap(mo);
    prepDataForDisplay(mo, ['color']);
    renderArena(mo);
    updateLegends(mo, ['color']);
  });

  byId('remove-color-btn').addEventListener('click', function () {
    if (view.ncolor === 1) return;
    view.ncolor -= 1;
    updateColorMap(mo);
    prepDataForDisplay(mo, ['color']);
    renderArena(mo);
    updateLegends(mo, ['color']);
  });


  /**
   * Legends of display items.
   */

  for (let leg of document.querySelectorAll('.legend')) {

    leg.addEventListener('mouseenter', function () {
      for (let clip of this.querySelectorAll('.clip')) {
        clip.classList.add('hidden');
      }
    });

    leg.addEventListener('mouseleave', function () {
      this.setAttribute('data-ranging', 'none');
      for (let clip of this.querySelectorAll('.clip')) {
        clip.classList.remove('hidden');
      }
    });
  }

  for (let grad of document.querySelectorAll('.gradient')) {

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
          const diameter = Math.ceil(view.size.base * 2 * offset / width);
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
        prepDataForDisplay(mo, [item]);
        renderArena(mo);
        updateLegends(mo, [item]);
      }
    });
  }

  for (let range of document.querySelectorAll('.legend .range')) {
    range.title = 'Adjust ' + checkClassName(range, ['lower', 'upper']) +
      ' bound of ' + range.parentElement.getAttribute('data-item');
    range.addEventListener('mousedown', rangeMouseDown);
    range.addEventListener('mouseup', rangeMouseUp);
  }

  function rangeMouseDown(e) {
    e.preventDefault();
    this.parentElement.setAttribute('data-ranging',
      checkClassName(this, ['lower', 'upper']));
  }

  function rangeMouseUp(e) {
    e.preventDefault();
    this.parentElement.setAttribute('data-ranging', 'none');
    const item = this.parentElement.getAttribute('data-item');
    view[item][checkClassName(this, ['lower', 'upper'])] =
      this.getAttribute('data-tick') * 10;
    prepDataForDisplay(mo, [item]);
    renderArena(mo);
    updateLegends(mo, [item]);
  }

  for (let label of document.querySelectorAll('.legend .min')) {
    label.title = 'Toggle zero or minimum value';
    label.addEventListener('click', function () {
      const item = this.parentElement.getAttribute('data-item');
      view[item].zero = !view[item].zero;
      prepDataForDisplay(mo, [item]);
      renderArena(mo);
      updateLegends(mo, [item]);
    });
  }

}


/**
 * Update display panel controls by data.
 * @function updateDisplayCtrl
 * @param {Object} cols - cols object
 * @param {Object} view - view object
 */
function updateDisplayCtrl(cols, view) {
  const names = cols.names,
        types = cols.types;

  // display items to be updated
  const keys = ['x', 'y', 'size', 'opacity', 'color'];

  const n = names.length;
  let sel, i, type, opt, idx, span, scale, btn;
  for (let key of keys) {
    sel = byId(`${key}-field-sel`);
    sel.innerHTML = '';

    // all but coordinates can be empty
    if (key !== 'x' && key !== 'y') {
      sel.add(document.createElement('option'));
    }

    // add fields to each list
    for (i = 0; i < n; i++) {
      type = types[i];
      if (type === 'num' || (type === 'cat' && key === 'color')) {

        // create an option
        opt = document.createElement('option');
        opt.value = i;
        opt.text = names[i];
        sel.add(opt);

        // pre-defined index
        idx = view[key].i;
        if (idx) sel.value = idx;
        span = byId(`${key}-param-span`);
        if (idx) span.classList.remove('hidden');
        else span.classList.add('hidden');

        // pre-defined scale
        scale = view[key].scale;
        btn = byId(`${key}-scale-btn`);
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
  const view = mo.view;
  const types = mo.cols.types;
  items = items || ['size', 'opacity', 'color'];
  let v, icol, isCat, scale, legend, grad, rect, step, poses, clip;

  for (let item of items) {
    v = view[item];
    icol = v.i;
    if (!icol) continue;

    // discrete colors
    if (item === 'color') {
      isCat = (types[icol] === 'cat');
      byId('color-legend').classList.toggle('hidden', isCat);
      byId('color-legend-2').classList.toggle('hidden', !isCat);
      if (isCat) {
        updateColorTable(mo);
        continue;
      }
    }

    // continuous data
    scale = unscale(v.scale);
    legend = byId(item + '-legend');
    grad = legend.querySelector('.gradient');
    if (grad === null) continue;

    // refresh labels
    for (let key of ['min', 'max']) {
      const label = legend.querySelector(`label.${key}`);
      let value = scaleNum(v[key], scale);
      value = formatValueLabel(value, icol, 3, false, mo);
      label.setAttribute('data-value', value);
      label.innerHTML = (key === 'min' && v.zero) ? 0 : value;
    }

    // item-specific operations
    if (item === 'size') updateSizeGradient(mo);
    if (item === 'color') updateColorGradient(mo);

    // position ranges
    rect = grad.getBoundingClientRect();
    step = (rect.right - rect.left) / 10;
    poses = {};
    for (let key of ['lower', 'upper']) {
      poses[key] = legend.querySelector(`.range.${key}`).getAttribute(
        'data-tick') * step;
      legend.querySelector(`.range.${key}`).style.left = Math.round(
        rect.left + poses[key]) + 'px';
    }

    // position clips
    clip = legend.querySelector('.clip.lower');
    clip.style.left = Math.round(rect.left) + 'px';
    clip.style.width = Math.floor(poses.lower) + 'px';
    clip = legend.querySelector('.clip.upper');
    clip.style.left = Math.round(rect.left + poses.upper) + 'px';
    clip.style.width = Math.ceil(rect.right - rect.left - poses.upper) + 'px';
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
  const base = mo.view.size.base;
  const grad = byId('size-gradient');
  grad.style.height = base + 'px';
  grad.style.borderTopWidth = base + 'px';
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
  if (mo.cols.types[ci] === 'cat') return;
  byId('color-gradient').style.backgroundImage =
    'linear-gradient(to right, ' + PALETTES[mo.view.contpal].map(
     x => '#' + x).join(', ') + ')';
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
  for (let div of popup.querySelectorAll('div')) {
    const table = document.createElement('table');
    const pals = div.classList.contains('sequ') ? SEQUENTIAL_PALETTES
      : (div.classList.contains('dive') ? DIVERGING_PALETTES
      : QUALITATIVE_PALETTES);

    // create palette list
    for (let pal of pals) {
      const row = table.insertRow(-1);
      let cell = row.insertCell(-1);
      cell.innerHTML = pal;
      cell = row.insertCell(-1);
      const box = document.createElement('div');

      // continuous color
      if (div.classList.contains('cont')) {
        box.innerHTML = '&nbsp;';
        box.style.backgroundImage = 'linear-gradient(to right, ' +
          PALETTES[pal].map(e => '#' + e).join(', ') + ')';
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
    }

    div.appendChild(table);
  }
}


/**
 * Initiate display items based on the dataset.
 * @function initDisplayItems
 * @param {Object} mo - main object
 * @description Basically, it is a "guess" process.
 */
function initDisplayItems(mo) {
  const view = mo.view;
  const items = ['x', 'y', 'size', 'opacity', 'color'];
  const fields = guessDisplayFields(mo);
  for (let item of items) view[item].i = fields[item];
  const scales = guessDisplayScales(mo);
  for (let item of items) view[item].scale = scales[item];
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
  if (mo.cols.types[icol] !== 'cat') return;

  // get categories and their frequencies
  let cats = {};
  const C = mo.data[icol];
  const n = C.length;
  let val;
  for (let i = 0; i < n; i++) {
    val = C[i];
    if (!val) continue;
    cats[val] = (cats[val] || 0) + 1;
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
  const res = {};
  for (let i = 0; i < ncolor; i++) {
    res[cats[i][0]] = palette[i % m];
  }
  mo.view.color.discmap = res;
}


/**
 * Update view given current view parameters.
 * @function updateView
 * @param {Object} mo - main object
 */
function updateView(mo) {
  renderArena(mo);
  renderSelection(mo);
  if (mo.stat.drawing) drawPolygon(mo);
  mo.rena.focus();
}


/**
 * Reset workspace when dataset is open or closed.
 * @function resetWorkspace
 * @param {Object} mo - main object
 * @description Singling out cache is for performance consideration.
 */
function resetWorkspace(mo) {
  resetControls();

  // change document title
  let title = 'BinaRena';
  let fname = mo.impo.fname;
  if (fname) {
    const idx = fname.lastIndexOf('.');
    if (idx > 0) fname = fname.substring(0, idx);
    title += ` - ${fname}`;
  }
  document.title = title;

  // check whether there is data
  const data = mo.data,
        cache = mo.cache;
  if (data.length === 0) cache.nctg = 0;
  else cache.nctg = data[0].length;
  const n = cache.nctg;

  // reset working progress
  mo.picked = Array(n).fill(false);
  mo.masked = Array(n).fill(false);
  mo.blured = Array(n).fill(false);
  mo.highed = Array(n).fill(0);
  mo.binned = Array(n).fill('');
  mo.tabled = n ? [...data[0].keys()] : [];
  
  // reset binning plan
  byId('bin-tbody').innerHTML = '';

  // reset transformed data
  const trans = mo.trans;
  for (let item of ['x', 'y', 'size', 'opacity', 'color', 'rgb', 'rgba']) {
    trans[item] = Array(n);
  }

  // clear cache
  cache.abund = 0;
  cache.freqs = {};
  cache.npick = 0;
  cache.nmask = 0;
  cache.maskh = [];
  cache.binns.clear();
  cache.pdist = [];

  // new data is open
  if (n) {
    resetGUINewData(mo);
    cacheFrequencies(mo);
    cacheTotAbundance(mo);
  }

  // no data is open
  else {
    resetGUINoData(mo);
    cache.splen = 0;
    cache.spcov = 0;
  }

  // reset display items
  initDisplayItems(mo);
  updateWorkspace(mo);

  // reset view
  resetView(mo);
}


/**
 * Update workspace when there is new data.
 * @function updateWorkspace
 * @param {Object} mo - main object
 */
function updateWorkspace(mo) {
  updateColorMap(mo);
  updateControls(mo);
  buildInfoTable(mo);
  buildDataTable(mo);
}


/**
 * Reset GUI when no data is open.
 * @function resetGUINoData
 * @param {Object} mo - main object
 */
function resetGUINoData(mo) {
  byId('hide-side-btn').click();
  byId('show-side-btn').disabled = true;
  byId('drop-sign').classList.remove('hidden');
  const btn = byId('dash-btn');
  if (btn.classList.contains('active')) btn.click();
  byId('dash-panel').classList.add('hidden');
  mo.view.grid = false;
  byId('nav-panel').classList.add('hidden');
  for (let div of byId('widget-frame').querySelectorAll('div.freq')) {
    div.classList.add('hidden');
  }
}


/**
 * Reset GUI when new data is open.
 * @function resetGUINewData
 * @param {Object} mo - main object
 */
function resetGUINewData(mo) {
  byId('show-side-btn').disabled = false;
  byId('show-side-btn').click();
  byId('drop-sign').classList.add('hidden');
  const btn = byId('dash-btn');
  if (!btn.classList.contains('active')) btn.click();
  mo.view.grid = byId('grid-chk').checked;
  if (byId('nav-chk').checked) byId('nav-panel').classList.remove('hidden');
  if (byId('freq-chk').checked) {
    for (let div of byId('widget-frame').querySelectorAll('div.freq')) {
      div.classList.remove('hidden');
    }
  }
}


/**
 * Calculate category and feature frequencies.
 * @function cacheFrequencies
 * @param {Object} mo - main object
 * @param {boolean} append - whether in append mode
 */
function cacheFrequencies(mo, append) {
  const data = mo.data,
        types = mo.cols.types,
        freqs = mo.cache.freqs;
  for (let i = 0; i < types.length; i++) {
    if (i in freqs && append) continue;
    switch (types[i]) {
      case 'cat':
        freqs[i] = listCats(data[i]);
        break;
      case 'fea':
        freqs[i] = listFeas(data[i]);
        break;  
    }
  }
}


/**
 * Calculate total abundance of contigs.
 * @function cacheTotAbundance
 * @param {Object} mo - main object
 * @description Total abundance = sum of length x contig
 */
function cacheTotAbundance(mo) {
  const data = mo.data,
        cache = mo.cache;
  if (cache.splen && cache.spcov) {
    const L = data[cache.splen],
          C = data[cache.spcov];
    const m = L.length;
    for (let i = 0; i < m; i++) {
      cache.abund += L[i] * C[i];
    }
  } else cache.abund = 0;
}


/**
 * Initiate or restore default view given data.
 * @function resetView
 * @param {Object} mo - main object
 */
function resetView(mo) {

  // center view
  const view = mo.view;
  view.scale = 1.0;
  const rena = mo.rena;
  view.posX = rena.width / 2;
  view.posY = rena.height / 2;

  // transforme data for display
  prepDataForDisplay(mo);
  updateLegends(mo);

  // render plots
  resizeArena(mo);
}


/**
 * Prepare data for visualization.
 * @function prepDataForDisplay
 * @param {Object} mo - main object
 * @param {string[]} [items] - display item(s) to prepare
 */
function prepDataForDisplay(mo, items) {
  items = items || ['x', 'y', 'size', 'opacity', 'color'];
  const n = mo.cache.nctg;
  if (!n) return;
  const view = mo.view,
        data = mo.data,
        cols = mo.cols,
        mask = mo.masked,
        trans = mo.trans;

  // transform data for each display item
  for (let item of items) {
    const v = view[item];
    const idx = v.i,
          scale = v.scale;

    // no data, fill default and skip
    if (!idx) {
      if (item === 'size' || item === 'opacity') {
        trans[item].fill(v.base);
      } else if (item === 'color') {
        trans[item].fill(NaN);
        trans.rgb.fill(v.base);
      } else {
        trans[item].fill(NaN);
      }
      continue;
    }

    // numeric data
    const type = cols.types[idx];
    if (type === 'num') {

      // transform data using given scale
      const scaled = scaleArr(data[idx], scale);

      // gather valid data (not masked, is a number and is finite)
      const valid = [],
            index = [],
            inval = [];
      let val;
      for (let i = 0; i < n; i++) {
        if (!mask[i]) {
          val = scaled[i];
          if (isFinite(val)) {
            index.push(i);
            valid.push(val);
          } else inval.push(i);
        }
      }

      // calculate min / max
      let [min, max] = arrMinMax(valid);
      v.min = min;
      v.max = max;

      // do maximum scaling instead of min-max scaling
      if (v.zero) min = 0;

      // calculate range (to normalize againt)
      const range = max - min;

      // perform min-max scaling while applying item-specific protocols
      const target = trans[item];
      let low, frac;

      const n_ = index.length;
      let i_;

      switch (item) {

        // x- and y-axes
        // note that the formulae for x-axis and y-axis are different
        // that's because the y-axis in an HTML5 canvas starts from top rather
        // than bottom
        case 'x':
          for (let i = 0; i < n_; i++) {
            i_ = index[i];
            target[i_] = (scaled[i_] - min) / range - 0.5;
          }
          break;
        case 'y':
          for (let i = 0; i < n_; i++) {
            i_ = index[i];
            target[i_] = (max - scaled[i_]) / range - 0.5;
          }
          break;

        // radius of marker
        case 'size':
          const base = v.base;
          low = v.lower / 100;
          frac = (v.upper / 100 - low) / range;
          for (let i = 0; i < n_; i++) {
            i_ = index[i];
            target[i_] = ((scaled[i_] - min) * frac + low) * base;
          }
          break;

        // alpha value of fill color
        case 'opacity':
          low = v.lower / 100;
          frac = (v.upper / 100 - low) / range;
          for (let i = 0; i < n_; i++) {
            i_ = index[i];
            target[i_] = (scaled[i_] - min) * frac + low;
          }
          break;

        // fill color
        case 'color':
          low = v.lower;
          frac = (v.upper - low) / range;
          for (let i = 0; i < n_; i++) {
            i_ = index[i];
            target[i_] = (scaled[i_] - min) * frac + low;
          }
          break;
      }

      // fill invalid values with defaults
      const ni = inval.length;
      if (ni > 0) {
        let nanval;
        if (['size', 'opacity'].includes(item)) nanval = v.base;
        else nanval = NaN;
        for (let i = 0; i < ni; i++) {
          target[inval[i]] = nanval;
        }
      }

      // for color, get RGB value
      if (item === 'color') {
        const rgb = trans.rgb;
        const cmap = v.contmap;
        const base = v.base;
        for (let i = 0; i < n_; i++) {
          i_ = index[i];
          rgb[i_] = cmap[Math.round(target[i_])] || base;
        }
        if (ni > 0) {
          let nanval = v.base;
          for (let i = 0; i < ni; i++) {
            rgb[inval[i]] = nanval;
          } 
        }
      }
    }

    // categorical data (color only)
    else if (type === 'cat' && item === 'color') {
      const carr = trans.color,
            rarr = trans.rgb;
      carr.fill('');
      rarr.fill(view.color.base);
      const source = data[idx];
      const cmap = v.discmap;
      let val;
      for (let i = 0; i < n; i++) {
        val = source[i];
        if (val in cmap) {
          carr[i] = val;
          rarr[i] = hexToRgb(cmap[val]);
        }
      }
    }
  }

  // for opacity and color, combine into RGBA
  if (items.includes('opacity') || items.includes('color')) {
    const opacity = trans.opacity,
          rgb = trans.rgb,
          rgba = trans.rgba;
    for (let i = 0; i < n; i++) {
      rgba[i] = rgb[i] + ',' + opacity[i].toFixed(2);
    }
  }
}


/**
 * When user changes display item.
 * @function displayItemChange
 * @param {Object} item - display item
 * @param {Object} i - new field index
 * @param {Object} scale - new scaling factor
 * @param {Object} mo - main object
 */
function displayItemChange(item, i, scale, mo) {
  mo.view[item].i = parseInt(i);
  mo.view[item].scale = scale;

  // if x- or y-coordinates change, reset view
  if (item === 'x' || item === 'y') {
    resetView(mo);
    return;
  }

  // otherwise, keep current viewport
  const isCat = (item === 'color' && mo.cols.types[i] === 'cat');
  if (isCat) updateColorMap(mo);
  prepDataForDisplay(mo, [item]);
  renderArena(mo);
  renderSelection(mo);
  updateLegends(mo, [item]);
}


/**
 * Close current dataset.
 * @function closeData
 * @param {Object} mo - main object
 */
function closeData(mo) {
  mo.data.length = 0; // clear an array in place
  mo.cols.names.length = 0;
  mo.cols.types.length = 0;
  mo.mems = {};
}
