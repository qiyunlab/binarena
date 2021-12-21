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
 */
function calcArenaDimensions(rena) {
  var w = Math.max(parseInt(getComputedStyle(rena).minWidth),
    rena.parentElement.parentElement.offsetWidth);
  var h = Math.max(parseInt(getComputedStyle(rena).minHeight),
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
  var dims = calcArenaDimensions(rena);
  var w = dims[0],
    h = dims[1];

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
 * @todo {@link https://stackoverflow.com/questions/21089959/}
 * @todo round floats into integers should improve performance, but may cause
 * problem when zoomin scale is large, needs further thought
 */
function renderArena(mo) {
  var data = mo.data;
  var view = mo.view;
  var rena = mo.rena;

  // prepare canvas context
  // note: origin (0, 0) is at the upper-left corner
  var ctx = rena.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, rena.width, rena.height);
  ctx.save();

  // move to current position
  ctx.translate(view.pos.x, view.pos.y);

  // scale canvas
  var scale = view.scale;
  ctx.scale(scale, scale);

  // alternative: css scale, which is theoretically faster, but it blurs when
  // zoom in
  // rena.style.transformOrigin = '0 0';
  // rena.style.transform = 'scale(' + view.scale + ')';

  var masking = (Object.keys(mo.mask).length > 0);

  // cache constants
  var pi2 = Math.PI * 2;
  var pi1_2 = Math.sqrt(Math.PI);
  var min1 = Math.sqrt(1 / Math.PI);
  var min2 = Math.sqrt(4 / Math.PI);

  // cache parameters
  var w = rena.width,
    h = rena.height;
  // x-coordinate
  var xi = view.x.i,
    xscale = view.x.scale,
    xmin = view.x.min,
    xmax = view.x.max,
    dx = xmax - xmin;
  // y-coordinate
  var yi = view.y.i,
    yscale = view.y.scale,
    ymin = view.y.min,
    ymax = view.y.max,
    dy = ymax - ymin;
  // size
  var rbase = view.rbase;
  var si = view.size.i,
    sscale = view.size.scale,
    smin = view.size.zero ? 0 : view.size.min,
    slow = view.size.lower / 100,
    sfac = (view.size.upper / 100 - slow) / (view.size.max - smin);
  // opacity
  var oi = view.opacity.i,
    oscale = view.opacity.scale,
    omin = view.opacity.zero ? 0 : view.opacity.min,
    olow = view.opacity.lower / 100,
    ofac = (view.opacity.upper / 100 - olow) / (view.opacity.max - omin);
  // color
  var ci = view.color.i,
    discmap = view.color.discmap,
    contmap = view.color.contmap,
    ctype = ci ? data.types[ci] : null,
    cscale = view.color.scale,
    cmin = view.color.zero ? 0 : view.color.min,
    clow = view.color.lower,
    cfac = (view.color.upper - clow) / (view.color.max - cmin);

  // rendering parameters
  var paths = {};

  // determine appearance of contig
  var df = data.df;
  var n = df.length;
  for (var i = 0; i < n; i++) {
    if (masking && i in mo.mask) continue;
    var datum = df[i];

    // determine radius (size)
    // var radius = si ? scaleNum(datum[si], sscale) * rbase / smax : rbase;
    var radius = si ? ((scaleNum(datum[si], sscale) - smin) * sfac + slow)
      * rbase : rbase;
    var rviz = radius * scale;

    // if contig occupies less than one pixel on screen, skip
    if (rviz < min1) continue;

    // determine x- and y-coordinates
    var x = Math.round(((scaleNum(datum[xi], xscale) - xmin) / dx - 0.5) * w);
    var y = Math.round(((ymax - scaleNum(datum[yi], yscale)) / dy - 0.5) * h);

    // determine color
    var c = '0,0,0';
    if (ci) {
      var val = datum[ci];
      if (val !== null) {
        // discrete data
        if (ctype === 'category') {
          var cat = val[0];
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
    // var alpha = (scaleNum(datum[oi], oscale) / omax).toFixed(2);
    var alpha = oi ? ((scaleNum(datum[oi], oscale) - omin) * ofac + olow)
      .toFixed(2) : 1.0;

    // generate fill style string
    var fs = 'rgba(' + c + ',' + alpha + ')';
    if (!(fs in paths)) paths[fs] = { 'square': [], 'circle': [] };

    // if contig occupies less than four pixels on screen, draw a square
    if (rviz < min2) {
      paths[fs]['square'].push([x, y, Math.round(radius * pi1_2)]);
    }

    // if bigger, draw a circle
    else {
      paths[fs]['circle'].push([x, y, Math.round(radius)]);
    }
  } // end for i

  // render contigs
  // note: minimizing changes of fill style can improve performance
  // note: minimizing numbers of paths can improve performance
  for (var fs in paths) {
    ctx.fillStyle = fs;
    for (var i = 0; i < paths[fs]['square'].length; i++) {
      var sq = paths[fs]['square'][i];
      ctx.fillRect(sq[0], sq[1], sq[2], sq[2]);
    }
    var n = paths[fs]['circle'].length;
    if (n === 0) continue;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var ci = paths[fs]['circle'][i];
      ctx.moveTo(ci[0], ci[1]);
      ctx.arc(ci[0], ci[1], ci[2], 0, pi2, true);
    }
    ctx.fill();
  }

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
  var data = mo.data;
  var view = mo.view;
  var oray = mo.oray;

  // get shadow color
  var color = mo.theme.selection;

  // clear canvas
  var ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);

  var indices = Object.keys(mo.pick);
  var n = indices.length;
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
  var pi2 = Math.PI * 2;

  // cache parameters
  var rbase = view.rbase;
  var w = oray.width,
    h = oray.height;
  var xi = view.x.i,
    xscale = view.x.scale,
    xmin = view.x.min,
    xmax = view.x.max,
    dx = xmax - xmin;
  var yi = view.y.i,
    yscale = view.y.scale,
    ymin = view.y.min,
    ymax = view.y.max,
    dy = ymax - ymin;
  var si = view.size.i,
    sscale = view.size.scale,
    smin = view.size.zero ? 0 : view.size.min,
    slow = view.size.lower / 100,
    sfac = (view.size.upper / 100 - slow) / (view.size.max - smin);

  // render shadows around selected contigs
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var datum = data.df[indices[i]];
    // var radius = Math.round(si ? scaleNum(datum[si], sscale) * sratio : rbase);
    var radius = Math.round(si ? ((scaleNum(datum[si], sscale) - smin)
      * sfac + slow) * rbase : rbase);
    var x = Math.round(((scaleNum(datum[xi], xscale) - xmin) / dx - 0.5) * w);
    var y = Math.round(((ymax - scaleNum(datum[yi], yscale)) / dy - 0.5) * h);
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
  var view = mo.view;
  var stat = mo.stat;
  var oray = mo.oray;
  var vertices = stat.polygon;
  var pi2 = Math.PI * 2;
  var radius = 3 / view.scale;
  var color = mo.theme.polygon;
  var ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);
  ctx.save();
  ctx.translate(view.pos.x, view.pos.y);
  ctx.scale(view.scale, view.scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  var n = vertices.length;
  var vertex;
  var j;
  for (var i = 0; i < n; i++) {
    vertex = vertices[i];
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, 0, pi2, true);
    ctx.closePath();
    ctx.lineWidth = 1 / view.scale;
    ctx.moveTo(vertex.x, vertex.y);
    j = i + 1;
    if (j == n) j = 0;
    vertex = vertices[j];
    ctx.lineTo(vertex.x, vertex.y);
    ctx.stroke();
  }
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
  var ctx = rena.getContext('2d');
  ctx.font = (1 / view.scale).toFixed(2) + 'em monospace';
  ctx.fillStyle = 'dimgray';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1 / view.scale;
  var ig = 5,
    gp = 10;
  for (var x = parseInt(view.x.min / ig) * ig; x <= parseInt(view.x.max /
      ig) * ig; x += ig) {
    var xx = ((x - view.x.min) / (view.x.max - view.x.min) - 0.5) *
      rena.width;
    ctx.moveTo(xx, -rena.height * 0.5);
    ctx.lineTo(xx, rena.height * 0.5);
    ctx.fillText(x.toString(), xx - gp / view.scale, (view.y.max /
      (view.y.max - view.y.min) - 0.5) * rena.height + gp / view.scale);
  }
  for (var y = parseInt(view.y.min / ig) * ig; y <= parseInt(view.y.max /
    ig) * ig; y += ig) {
    var yy = ((view.y.max - y) / (view.y.max - view.y.min) - 0.5) *
      rena.height;
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
  var canvas = mo.mini.canvas;
  var w = canvas.width,
      h = canvas.height;
  var ctx = canvas.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, w, h);

  // selected variable
  var col = mo.mini.field;
  if (!col) return;

  // selected contigs
  var rows = Object.keys(mo.pick).sort();
  var n = rows.length;
  if (n <= 1) return;

  // draw mouse range
  var x0 = mo.mini.drag;
  if (x0 !== null) drawMouseRange(ctx, x0, x1, w, h);

  // calculate histogram if not already
  var hist = mo.mini.hist;
  if (!keep || (hist === null)) {

    // variable values
    var df = mo.data.df;
    var data = Array(n).fill();
    for (var i = 0; i < n; i++) {
      data[i] = df[rows[i]][col];
    }

    // log transformation
    if (mo.mini.log) data = arrLog(data);

    // calculate 
    var edges;
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
  var high = [mo.mini.bin0, mo.mini.bin1];
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
  var beg = Math.max(Math.min(x0, x1), 5);
  var end = Math.min(Math.max(x0, x1), w - 5);
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
  var recol = 'lightgrey';  // regular color
  var hicol = 'royalblue'; // highlight color
  var n = hist.length;
  var scale = (h - 20) / Math.max.apply(null, hist); // yscale
  var hista = hist.map(function (e) { return e * scale; });
  var intvl = (w - 20) / n; // interval
  var barw = (intvl - 2) >> 0; // bar width
  ctx.fillStyle = recol;

  // no highlight
  if ((high === undefined) || (high[0] === null)) {
    for (var i = 0; i < n; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
  }

  // highlight a range of bars
  else {
    for (var i = 0; i < high[0]; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
    for (var i = high[1] + 1; i <= n; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
    ctx.fillStyle = hicol;
    for (var i = high[0]; i <= high[1]; i++) {
      ctx.fillRect(11 + intvl * i, h - 10 - hista[i], barw, hista[i]);
    }
  }
}
