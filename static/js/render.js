"use strict";

/**!
 * @module render
 * @file Rendering functions.
 * @description They may read the master object that is passed to them, but
 * they DO not modify its content. They do NOT directly access the "document"
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
 * @param {Object} mo - master object
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
  var coloring = Boolean(view.color.i && view.color.palette);

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
    cmap = view.color.map;

  // rendering parameters
  var paths = {};

  // determine appearance of contig
  for (var i = 0; i < data.df.length; i++) {
    if (masking && i in mo.mask) continue;
    var datum = data.df[i];

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
    if (coloring) {
      var val = datum[ci];
      if (val !== null) {
        var cat = val[0];
        if (cat in cmap) c = hexToRgb(cmap[cat]);
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
  }

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
 * @param {Object} mo - master object
 * @see renderArena
 */
function renderSelection(mo) {
  var data = mo.data;
  var view = mo.view;
  var oray = mo.oray;

  // get shadow color
  var color = getComputedStyle(document.getElementById('hilite-color')).color;

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
 * @param {Object} master - master object
 * @see renderArena
 */
function drawPolygon(mo) {
  var view = mo.view;
  var stat = mo.stat;
  var oray = mo.oray;
  var vertices = stat.polygon;
  var pi2 = Math.PI * 2;
  var radius = 3 / view.scale;
  var color = getComputedStyle(document.getElementById('polygon-color')).color;
  var ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);
  ctx.save();
  ctx.translate(view.pos.x, view.pos.y);
  ctx.scale(view.scale, view.scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (var i = 0; i < vertices.length; i++) {
    ctx.beginPath();
    ctx.arc(vertices[i].x, vertices[i].y, radius, 0, pi2, true);
    ctx.closePath();
    ctx.lineWidth = 1 / view.scale;
    ctx.moveTo(vertices[i].x, vertices[i].y);
    var j = i + 1;
    if (j == vertices.length) j = 0;
    ctx.lineTo(vertices[j].x, vertices[j].y);
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
