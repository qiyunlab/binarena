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
 */
function renderArena(mo) {
  var data = mo.data;
  var view = mo.view;
  var rena = mo.rena;

  // prepare canvas context
  var ctx = rena.getContext('2d');
  ctx.clearRect(0, 0, rena.width, rena.height);
  ctx.save();
  ctx.translate(view.pos.x, view.pos.y);
  ctx.scale(view.scale, view.scale);

  var masking = (Object.keys(mo.mask).length > 0);
  var coloring = Boolean(view.color.i && view.color.palette);

  for (var i = 0; i < data.df.length; i++) {
    if (masking && i in mo.mask) continue;
    var datum = data.df[i];

    // determine x- and y-coordinates
    var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
      (view.x.max - view.x.min) - 0.5) * rena.width;
    var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
      (view.y.max - view.y.min) - 0.5) * rena.height;

    ctx.beginPath();

    // determine color
    var c = '0,0,0';
    if (coloring) {
      var val = datum[view.color.i];
      if (val !== null) {
        var cat = val[0];
        if (cat in view.color.map) {
          c = hexToRgb(view.color.map[cat]);
        }
      }
    }

    // determine opacity
    ctx.fillStyle = 'rgba(' + c + ',' + (scaleNum(datum[view.opacity.i],
      view.opacity.scale) / view.opacity.max).toFixed(2) + ')';

    // determine radius and draw circle
    ctx.arc(x, y, scaleNum(datum[view.size.i], view.size.scale) *
      view.size.base / view.size.max, 0, Math.PI * 2, true);

    ctx.closePath();
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
 */
function renderSelection(mo) {
  var data = mo.data;
  var view = mo.view;
  var oray = mo.oray;

  var color = getComputedStyle(document.getElementById('highlight-color'))
    .color;
  var ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);
  var indices = Object.keys(mo.pick);
  if (indices.length > 0) {
    ctx.save();
    ctx.translate(view.pos.x, view.pos.y);
    ctx.scale(view.scale, view.scale);
    indices.forEach(function (i) {
      var datum = data.df[i];
      var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
        (view.x.max - view.x.min) - 0.5) * oray.width;
      var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
        (view.y.max - view.y.min) - 0.5) * oray.height;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, scaleNum(datum[view.size.i], view.size.scale) *
        view.size.base / view.size.max, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fill();
    });
    ctx.restore();
  }
}


/**
 * Render polygon drawn by user.
 * @function drawPolygon
 * @param {Object} master - master object
 */
function drawPolygon(mo) {
  var view = mo.view;
  var stat = mo.stat;
  var oray = mo.oray;

  var color = getComputedStyle(document.getElementById('polygon-color')).color;
  var ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);
  ctx.save();
  ctx.translate(view.pos.x, view.pos.y);
  ctx.scale(view.scale, view.scale);
  for (var i = 0; i < stat.polygon.length; i++) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(stat.polygon[i].x, stat.polygon[i].y, 3 / view.scale, 0,
      Math.PI * 2, true);
    ctx.closePath();
    ctx.lineWidth = 1 / view.scale;
    ctx.moveTo(stat.polygon[i].x, stat.polygon[i].y);
    var j = i + 1;
    if (j == stat.polygon.length) j = 0;
    ctx.lineTo(stat.polygon[j].x, stat.polygon[j].y);
    ctx.strokeStyle = color;
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
