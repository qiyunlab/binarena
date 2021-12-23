"use strict";

/**!
 * @module render
 * @file Rendering functions.
 * @description They may read the main object that is passed to them, but
 * they do NOT modify its content. They do NOT directly access the "document"
 * object.
 */


/**
 * Calculate arena dimensions based on style and container.
 * @function calcArenaDimensions
 * @param {Object} rena - arena canvas DOM
 * @returns {[number, number]} - width and height of arena
 */
function calcArenaDimensions(rena) {
  const w = Math.max(parseInt(getComputedStyle(rena).minWidth),
    rena.parentElement.parentElement.offsetWidth);
  const h = Math.max(parseInt(getComputedStyle(rena).minHeight),
    rena.parentElement.parentElement.offsetHeight);
  return [w, h];
}


/**
 * Update canvas dimensions.
 * @function resizeArena
 * @param {Object} rena - arena canvas DOM
 * @param {Object} oray - overlay canvas DOM
 * @description For an HTML5 canvas, (plot) and style width are two things.
 * @see {@link https://stackoverflow.com/questions/4938346/}
 */
function resizeArena(rena, oray) {
  const [w, h] = calcArenaDimensions(rena);

  // update width
  if (rena.style.width !== w) rena.style.width = w;
  if (rena.width !== w) rena.width = w;
  if (oray.style.width !== w) oray.style.width = w;
  if (oray.width !== w) oray.width = w;

  // update height
  if (rena.style.height !== h) rena.style.height = h;
  if (rena.height !== h) rena.height = h;
  if (oray.style.height !== h) oray.style.height = h;
  if (oray.height !== h) oray.height = h;
}


/**
 * Render arena given current data and view.
 * @function renderArena
 * @param {Object} mo - main object
 * @description This is the main rendering engine of the program. It is also a
 * computationally expensive task. Several resorts have been adopted to improve
 * performance, including:
 * - Minimize fill style changes.
 * - Minimize number of paths.
 * - For small circles draw squares instead.
 * - Cache variables and references.
 * @todo {@link https://stackoverflow.com/questions/21089959/}
 * @todo rectangle-circle collision detection
 * @todo round floats into integers should improve performance, but may cause
 * problem when zoomin scale is large, needs further thought
 * @todo get rid of masked contigs prior to loop
 */
function renderArena(mo) {
  const data = mo.data,
        view = mo.view,
        rena = mo.rena;

  // prepare canvas context
  // note: origin (0, 0) is at the upper-left corner
  const ctx = rena.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, rena.width, rena.height);
  ctx.save();

  // move to current position
  ctx.translate(view.pos.x, view.pos.y);

  // scale canvas
  const scale = view.scale;
  ctx.scale(scale, scale);

  // alternative: css scale, which is theoretically faster, but it blurs when
  // zoom in
  // rena.style.transformOrigin = '0 0';
  // rena.style.transform = 'scale(' + view.scale + ')';

  const masking = (Object.keys(mo.mask).length > 0);

  // cache constants
  const pi2 = Math.PI * 2,
        pi1_2 = Math.sqrt(Math.PI),
        min1 = Math.sqrt(1 / Math.PI),
        min2 = Math.sqrt(4 / Math.PI);

  // cache parameters
  const w = rena.width,
        h = rena.height;
  // x-axis
  const xi = view.x.i,
        xscale = view.x.scale,
        xmin = view.x.min,
        xmax = view.x.max,
        dx = xmax - xmin;
  // y-axis
  const yi = view.y.i,
        yscale = view.y.scale,
        ymin = view.y.min,
        ymax = view.y.max,
        dy = ymax - ymin;
  // size
  const rbase = view.rbase;
  const si = view.size.i,
        sscale = view.size.scale,
        smin = view.size.zero ? 0 : view.size.min,
        slow = view.size.lower / 100,
        sfac = (view.size.upper / 100 - slow) / (view.size.max - smin);
  // opacity
  const oi = view.opacity.i,
        oscale = view.opacity.scale,
        omin = view.opacity.zero ? 0 : view.opacity.min,
        olow = view.opacity.lower / 100,
        ofac = (view.opacity.upper / 100 - olow) / (view.opacity.max - omin);
  // color
  const ci = view.color.i,
        discmap = view.color.discmap,
        contmap = view.color.contmap,
        ctype = ci ? data.types[ci] : null,
        cscale = view.color.scale,
        cmin = view.color.zero ? 0 : view.color.min,
        clow = view.color.lower,
        cfac = (view.color.upper - clow) / (view.color.max - cmin);

  // rendering parameters
  const paths = {};

  // intermediates
  let datum, radius, rviz, x, y, c, val, cat, alpha, fs;

  // determine appearance of contig
  const df = data.df;
  let n = df.length;
  for (let i = 0; i < n; i++) {
    if (masking && i in mo.mask) continue;
    datum = df[i];

    // determine radius (size)
    // radius = si ? scaleNum(datum[si], sscale) * rbase / smax : rbase;
    radius = si ? ((scaleNum(datum[si], sscale) - smin) * sfac + slow)
      * rbase : rbase;
    rviz = radius * scale;

    // if contig occupies less than one pixel on screen, skip
    if (rviz < min1) continue;

    // determine x- and y-coordinates
    x = Math.round(((scaleNum(datum[xi], xscale) - xmin) / dx - 0.5) * w);
    y = Math.round(((ymax - scaleNum(datum[yi], yscale)) / dy - 0.5) * h);

    // determine color
    c = '0,0,0';
    if (ci) {
      val = datum[ci];
      if (val !== null) {
        // discrete data
        if (ctype === 'category') {
          cat = val[0];
          if (cat in discmap) c = hexToRgb(discmap[cat]);
        }

        // continuous data
        else {
          c = contmap[Math.round((scaleNum(datum[ci], cscale) - cmin) * cfac
            + clow)];
        }
      }
    }

    // determine opacity
    // alpha = (scaleNum(datum[oi], oscale) / omax).toFixed(2);
    alpha = oi ? ((scaleNum(datum[oi], oscale) - omin) * ofac + olow)
      .toFixed(2) : 1.0;

    // generate fill style string
    fs = 'rgba(' + c + ',' + alpha + ')';
    if (!(fs in paths)) paths[fs] = { 'square': [], 'circle': [] };

    // if a contig occupies less than four pixels on screen, draw a square
    if (rviz < min2) {
      paths[fs]['square'].push([x, y, Math.round(radius * pi1_2)]);
    }

    // if bigger, draw a circle
    else {
      paths[fs]['circle'].push([x, y, Math.round(radius)]);
    }
  } // end for i

  // render contigs
  let squares, sq, circles, circ;
  for (let fs in paths) {
    ctx.fillStyle = fs;

    // draw squares
    squares = paths[fs]['square'];
    n = squares.length;
    for (let i = 0; i < n; i++) {
      sq = squares[i];
      ctx.fillRect(sq[0], sq[1], sq[2], sq[2]);
    }

    // draw circles
    circles = paths[fs]['circle'];
    n = circles.length;
    if (n === 0) continue;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      circ = circles[i];
      ctx.moveTo(circ[0], circ[1]);
      ctx.arc(circ[0], circ[1], circ[2], 0, pi2, true);
    }

    ctx.fill();
  } // end for fs

  // draw grid
  if (view.grid) drawGrid(rena, view);

  ctx.restore();
}


/**
 * Render shadows around selected contigs.
 * @function renderSelection
 * @param {Object} mo - main object
 * @see renderArena
 */
function renderSelection(mo) {
  const data = mo.data,
        view = mo.view,
        oray = mo.oray;

  // get shadow color
  const color = mo.theme.selection;

  // clear canvas
  const ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);

  const ctgs = Object.keys(mo.pick);
  const n = ctgs.length;
  if (n === 0) return;

  // prepare canvas
  ctx.save();
  ctx.translate(view.pos.x, view.pos.y);
  ctx.scale(view.scale, view.scale);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10; // note: canvas shadow blur is expensive
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // cache constant
  const pi2 = Math.PI * 2;

  // cache parameters
  const rbase = view.rbase;
  const w = oray.width,
        h = oray.height;
  const xi = view.x.i,
        xscale = view.x.scale,
        xmin = view.x.min,
        xmax = view.x.max,
        dx = xmax - xmin;
  const yi = view.y.i,
        yscale = view.y.scale,
        ymin = view.y.min,
        ymax = view.y.max,
        dy = ymax - ymin;
  const si = view.size.i,
        sscale = view.size.scale,
        smin = view.size.zero ? 0 : view.size.min,
        slow = view.size.lower / 100,
        sfac = (view.size.upper / 100 - slow) / (view.size.max - smin);

  // render shadows around selected contigs
  const df = data.df;
  let datum, radius, x, y;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    datum = df[ctgs[i]];
    // radius = Math.round(si ? scaleNum(datum[si], sscale) * sratio : rbase);
    radius = Math.round(si ? ((scaleNum(datum[si], sscale) - smin)
      * sfac + slow) * rbase : rbase);
    x = Math.round(((scaleNum(datum[xi], xscale) - xmin) / dx - 0.5) * w);
    y = Math.round(((ymax - scaleNum(datum[yi], yscale)) / dy - 0.5) * h);
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, 0, pi2, true);
  }
  ctx.fill();
  ctx.restore();
}


/**
 * Render polygon drawn by user.
 * @function drawPolygon
 * @param {Object} mo - main object
 * @see renderArena
 */
function drawPolygon(mo) {
  const view = mo.view,
        stat = mo.stat,
        oray = mo.oray;
  const vertices = stat.polygon;
  const pi2 = Math.PI * 2;
  const radius = 3 / view.scale;
  const color = mo.theme.polygon;
  const ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);
  ctx.save();
  ctx.translate(view.pos.x, view.pos.y);
  ctx.scale(view.scale, view.scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const n = vertices.length;
  let vertex, j;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    vertex = vertices[i];
    ctx.arc(vertex.x, vertex.y, radius, 0, pi2, true);
    ctx.lineWidth = 1 / view.scale;
    ctx.moveTo(vertex.x, vertex.y);
    j = i + 1;
    if (j == n) j = 0;
    vertex = vertices[j];
    ctx.lineTo(vertex.x, vertex.y);
  }
  ctx.stroke();
  ctx.restore();
}


/**
 * Render graph grid.
 * @function drawGrid
 * @param {Object} rena - arena canvas DOM
 * @param {Object} view - view object
 * @todo needs further work
 */
function drawGrid(rena, view) {
  const ctx = rena.getContext('2d');
  ctx.font = (1 / view.scale).toFixed(2) + 'em monospace';
  ctx.fillStyle = 'dimgray';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1 / view.scale;
  const ig = 5, gp = 10;
  let xx, yy;
  for (let x = parseInt(view.x.min / ig) * ig; x <= parseInt(view.x.max /
    ig) * ig; x += ig) {
    xx = ((x - view.x.min) / (view.x.max - view.x.min) - 0.5) * rena.width;
    ctx.moveTo(xx, -rena.height * 0.5);
    ctx.lineTo(xx, rena.height * 0.5);
    ctx.fillText(x.toString(), xx - gp / view.scale, (view.y.max /
      (view.y.max - view.y.min) - 0.5) * rena.height + gp / view.scale);
  }
  for (let y = parseInt(view.y.min / ig) * ig; y <= parseInt(view.y.max /
    ig) * ig; y += ig) {
    yy = ((view.y.max - y) / (view.y.max - view.y.min) - 0.5) * rena.height;
    ctx.moveTo(-rena.width * 0.5, yy);
    ctx.lineTo(rena.width * 0.5, yy);
    ctx.fillText(y.toString(), (view.x.min / (view.x.min - view.x.max) -
      0.5) * rena.width - gp / view.scale, yy + gp / view.scale);
  }
  ctx.strokeStyle = 'lightgray';
  ctx.stroke();
}


/**
 * @summary Mini plot
 */

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
    const df = mo.data.df;
    let data = Array(n).fill();
    for (let i = 0; i < n; i++) {
      data[i] = df[ctgs[i]][col];
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
 * Draw mouse selection range
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
 * Draw a frame of plot
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
 * Draw a histogram of data
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
