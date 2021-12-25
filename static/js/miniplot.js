"use strict";

/**!
 * @module miniplot
 * @file Mini plot functions.
 * @description The mini plot panel is located at the bottom of the dash panel.
 * It displays a histogram of a certain numeric field of selected contigs. It
 * allows the user to observe and further subset based on this field.
 * Data, behaviors and status of the mini plot are stored in `mo.mini`.
 */


/**
 * Initialize mini plot controls.
 * @function initMiniPlotCtrl
 * @params {Object} mo - main object
 */
function initMiniPlotCtrl(mo) {

  // mini plot aspect: 16:9
  let cav = byId('mini-canvas');
  cav.height = cav.width * 0.5625;

  // store in main object
  mo.mini.canvas = cav;

  // mouse down event
  // identify and store position of mouse in plot
  cav.addEventListener('mousedown', function (e) {
    const rect = this.getBoundingClientRect();
    mo.mini.drag = (e.clientX - rect.left) / (rect.right - rect.left) *
      cav.width;
  });

  // mouse move event
  cav.addEventListener('mousemove', function (e) {
    miniPlotMouseMove(e, mo);
  });

  // mouse up event
  // trigger selection if mouse was dragging
  cav.addEventListener('mouseup', function () {
    byId('legend-tip').classList.add('hidden');
    if (mo.mini.drag !== null) miniPlotSelect(mo);
  });

  // mouse leave event
  cav.addEventListener('mouseleave', function () {
    if (mo.mini.bin0 !== null) {
      mo.mini.bin0 = null;
      mo.mini.bin1 = null;
      updateMiniPlot(mo);
      byId('legend-tip').classList.add('hidden');
    }
  });

  // plot selected variable
  byId('mini-field-sel').addEventListener('change', function () {
    mo.mini.field = (this.value === '') ? null : this.value;
    updateMiniPlot(mo);
  });

  // log-transform variable
  byId('mini-log-btn').addEventListener('click', function () {
    this.classList.toggle('pressed');
    mo.mini.log = this.classList.contains('pressed');
    updateMiniPlot(mo);
  });

  // increase resolution
  byId('mini-plus-btn').addEventListener('click', function () {
    if (mo.mini.nbin < 50) {
      mo.mini.nbin++;
      updateMiniPlot(mo);
    }
  });

  // decrease resolution
  byId('mini-minus-btn').addEventListener('click', function () {
    if (mo.mini.nbin > 0) {
      mo.mini.nbin--;
      updateMiniPlot(mo);
    }
  });
}


/**
 * Update mini plot controls by data columns.
 * @function updateMiniPlotCtrl
 * @params {Object} cols - cols object
 */
function updateMiniPlotCtrl(cols) {
  const names = cols.names,
        types = cols.types;
  const sel = byId('mini-field-sel');
  sel.innerHTML = '';

  // create an empty option
  sel.add(document.createElement('option'));

  // create an option for each column
  const n = names.length;
  let opt;
  for (let i = 0; i < n; i++) {
    if (types[i] !== 'num') continue;    
    opt = document.createElement('option');
    opt.value = i;
    opt.text = names[i];
    sel.add(opt);
  }
}


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
    const skip = ((bin0 === mo.mini.bin0) && (bin1 === mo.mini.bin1)) ?
      true : false;

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
  byId('legend-value').innerHTML = `${n}<br><small>${left} to 
    ${right}</small>`;

  // determine tooltip position
  tip.style.left = Math.round((10 + ((bin0 + bin1) / 2 + 0.5) * (w - 20) /
    nbin) / w * (rect.right - rect.left) + rect.left) + 'px';
  tip.style.top = Math.round(rect.bottom - 5) + 'px';
  
  // display bin size and range in tooltip
  byId('legend-circle').classList.add('hidden');
  tip.classList.remove('hidden');
}


/**
 * Select a range of data in the mini plot.
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
  const max = (mo.mini.bin1 === mo.mini.nbin - 1) ?
    null : mo.mini.edges[mo.mini.bin1 + 1];

  // reset histogram status
  mo.mini.hist = null;
  mo.mini.edges = null;
  mo.mini.bin0 = null;
  mo.mini.bin1 = null;
  mo.mini.drag = null;

  const res = [];
  const mask = mo.mask;
  const hasMask = (Object.keys(mask).length > 0);
  const arr = mo.data[col];

  // selection will take place within the already selected contigs
  const picked = Object.keys(mo.pick);
  const n = picked.length;
  let idx, val;

  // find within selected contigs which ones are within the range
  for (let i = 0; i < n; i++) {
    idx = picked[i];
    if (hasMask && idx in mask) continue;
    val = arr[idx];

    // lower bound: inclusive; upper bound: exclusive
    if (val !== null && val >= min && (max === null || val < max)) {
      res.push(idx);
    }
  }
  treatSelection(res, mo.stat.selmode, mo.stat.masking, mo);
}


/**
 * Draw a mini plot.
 * @function updateMiniPlot
 * @param {Object} mo - main object
 * @param {boolean} keep - use pre-calculated histogram if available
 * @param {number} x1 - draw selection range from the start position (defined
 * by mo.mini.drag) to this position
 * @description It (re-)draws the entire mini plot. Three things are performed:
 * 1. Draw a histogram of a designated numeric field of selection contigs.
 * 2. Highlight one or multiple bins (bars) in the histogram.
 * 3. Draw a selection range, if the user is holding and moving the mouse.
 */
function updateMiniPlot(mo, keep, x1) {
  const canvas = mo.mini.canvas;
  const w = canvas.width,
        h = canvas.height;
  const ctx = canvas.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, w, h);

  // selected variable
  const col = mo.mini.field;
  if (!col) return;

  // selected contigs
  const ctgs = Object.keys(mo.pick).sort();
  const n = ctgs.length;
  if (n <= 1) return;

  // draw mouse range
  const x0 = mo.mini.drag;
  if (x0 !== null) drawMouseRange(ctx, x0, x1, w, h);

  // calculate histogram if not already
  let hist = mo.mini.hist;
  if (!keep || (hist === null)) {

    // variable values
    const arr = mo.data[col];
    let data = Array(n).fill();
    for (let i = 0; i < n; i++) {
      data[i] = arr[ctgs[i]];
    }

    // log transformation
    if (mo.mini.log) data = arrLog(data);

    // calculate 
    let edges;
    [hist, edges] = histogram(data, mo.mini.nbin);

    // save (and reverse transform) result
    mo.mini.hist = hist;
    if (mo.mini.log) edges = edges.map(Math.exp);
    mo.mini.edges = edges;
  }

  // draw frame
  ctx.strokeStyle = 'grey';
  drawFrame(ctx, w, h);

  // draw histogram
  const high = [mo.mini.bin0, mo.mini.bin1];
  drawHistogram(ctx, hist, w, h, high);
}


/**
 * Draw mouse selection range.
 * @function drawMouseRange
 * @param {Object} ctx - canvas context
 * @param {number} x0 - begin position
 * @param {number} x1 - end position
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 */
function drawMouseRange(ctx, x0, x1, w, h) {
  w = w || ctx.canvas.width;
  h = h || ctx.canvas.height;

  // determine begin and end positions
  const beg = Math.max(Math.min(x0, x1), 5),
        end = Math.min(Math.max(x0, x1), w - 5);
  if (beg === end) return;

  // drawing style
  ctx.save();
  ctx.strokeStyle = 'dodgerblue';
  ctx.fillStyle = 'lightcyan';
  ctx.lineWidth = 2;
  
  // draw begin line
  ctx.beginPath();
  ctx.moveTo(beg, 5);
  ctx.lineTo(beg, h - 5);
  ctx.stroke();

  // draw end line
  ctx.beginPath();
  ctx.moveTo(end, 5);
  ctx.lineTo(end, h - 5);
  ctx.stroke();

  // fill range
  ctx.fillRect(beg, 5, end - beg, h - 10);
  ctx.restore();
}


/**
 * Draw a frame of plot.
 * @function drawFrame
 * @param {Object} ctx - canvas context
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 */
function drawFrame(ctx, w, h) {
  w = w || ctx.canvas.width;
  h = h || ctx.canvas.height;
  ctx.beginPath();
  ctx.rect(5.5, 5.5, w - 10, h - 10);
  ctx.stroke();
}


/**
 * Draw a histogram of data.
 * @function drawHistogram
 * @param {Object} ctx - canvas context
 * @param {number[]} hist - binned data
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 * @param {number[]} high - bins to highlight
 */
function drawHistogram(ctx, hist, w, h, high) {
  w = w || ctx.canvas.width;
  h = h || ctx.canvas.height;
  const recol = 'lightgrey', // regular color
        hicol = 'royalblue'; // highlight color
  const n = hist.length;
  const scale = (h - 20) / Math.max.apply(null, hist); // yscale
  const hista = hist.map(function (e) { return e * scale; });
  const intvl = (w - 20) / n; // interval
  const barw = (intvl - 2) >> 0; // bar width
  ctx.fillStyle = recol;

  // no highlight
  if ((high === undefined) || (high[0] === null)) {
    for (let i = 0; i < n; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
  }

  // highlight a range of bars
  else {
    for (let i = 0; i < high[0]; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
    for (let i = high[1] + 1; i <= n; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
    ctx.fillStyle = hicol;
    for (let i = high[0]; i <= high[1]; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
  }
}
