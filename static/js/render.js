"use strict";

/**!
 * @module render
 * @file Main assembly plot rendering functions.
 * @description The main plot is a scatter plot of contigs in an assembly.
 */


/**
 * Initialize canvas.
 * @function initCanvas
 * @param {Object} mo - main object
 */
function initCanvas(mo) {

  // initiate canvases
  mo.olay = byId('olay-canvas');
  mo.plot = byId('plot-canvas');
  mo.offs = document.createElement('canvas');

  // initiate highlight paths
  mo.paths.high = Array(HIGHLIGHT_PALETTE.length).fill(null);

  // off-screen canvas
  // const offs = plots.offs.transferControlToOffscreen();

  // create web worker
  // this way allows running a web worker in the local filesystem
  const blob = new Blob(['(' + renderWorker.toString() + ')()'],
                        {type: 'text/javascript'});
  mo.worker = new Worker(URL.createObjectURL(blob));

  // initiate offscreen canvas in worker
  // mo.worker.postMessage(
  //   {msg: 'init', 
  //    canvas: plots.offs,
  //    highpal: HIGHLIGHT_PALETTE,
  //    shadcol: mo.theme.selection},
  //   [plots.offs]);

  // render image when done
  mo.worker.onmessage = function(e) {
    if (e.data.msg === 'main') {
      plots.offs = e.data.bitmap;
      mo.view.mainoff = true;
      // mo.view.offX = e.data.offX;
      // mo.view.offY = e.data.offY;
      // setTimeout(function() {
      //   const rena = mo.rena;
      //   const ctx = rena.getContext('2d');
      //   const w = rena.width,
      //         h = rena.height;
      //   ctx.drawImage(rena.offs, w, h, w, h, 0, 0, w, h);
      // }, 50);
    }
    else if (e.data.msg === 'shad') {
      mo.view.shadoff = true;
    }
  }

  // events take place on overlay canvas
  const olay = mo.olay;

  // minimum dimensions of plot
  mo.view.minW = parseInt(getComputedStyle(olay).minWidth);
  mo.view.minH = parseInt(getComputedStyle(olay).minHeight);

  const view = mo.view,
        stat = mo.stat;

  resizePlot(mo);

  /** mouse events */
  olay.addEventListener('mousedown', function (e) {
    stat.mousedown = true;
    stat.dragX = e.clientX - view.posX;
    stat.dragY = e.clientY - view.posY;
  });

  olay.addEventListener('mouseup', function () {
    stat.mousedown = false;
  });

  olay.addEventListener('mouseover', function () {
    stat.mousedown = false;
  });

  olay.addEventListener('mouseout', function () {
    stat.mousedown = false;
    stat.mousemove = false;
  });

  olay.addEventListener('mousemove', function (e) {
    canvasMouseMove(e, mo);
  });

  olay.addEventListener('mousewheel', function (e) {
    canvasMouseZoom(e.wheelDelta > 0, mo, e.clientX, e.clientY);
  });

  olay.addEventListener('DOMMouseScroll', function (e) {
    canvasMouseZoom(e.detail < 0, mo, e.clientX, e.clientY);
  });

  olay.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    const menu = byId('context-menu');
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';
    menu.classList.remove('hidden');
  });

  olay.addEventListener('click', function (e) {
    canvasMouseClick(e, mo);
  });

  /** drag & drop file */
  olay.addEventListener('dragover', function (e) {
    e.preventDefault();
  });

  olay.addEventListener('dragenter', function (e) {
    e.preventDefault();
  });

  olay.addEventListener('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();
    uploadFile(e.dataTransfer.files[0], mo);
  });

  /** touch events */
  olay.addEventListener('touchstart', function (e) {
    const stat = mo.stat;
    const X = stat.touchX,
          Y = stat.touchY;
    X.length = 0;
    Y.length = 0;
    const t = e.touches;
    for (let i = 0; i < t.length; i++) {
      X.push(t[i].clientX);
      Y.push(t[i].clientY);
    }
  });

  olay.addEventListener('touchmove', function (e) {
    const t = e.touches;
    if (t.length !== mo.stat.touchX.length) return;

    // move (single touch)
    if (t.length === 1) {
      e.preventDefault();
      canvasTouchMove(mo, t);
    }

    // zoom (double touch)
    else if (t.length === 2) {
      e.preventDefault();
      canvasTouchZoom(mo, t);
    }
  });

  /** keyboard events */
  olay.addEventListener('keydown', function (e) {
    const t0 = performance.now();
    switch (e.key) {
      case 'Up':
      case 'ArrowUp':
        canvasKeyMove(0, mo);
        break;
      case 'Right':
      case 'ArrowRight':
        canvasKeyMove(1, mo);
        break;
      case 'Down':
      case 'ArrowDown':
        canvasKeyMove(2, mo);
        break;
      case 'Left':
      case 'ArrowLeft':
        canvasKeyMove(3, mo);
        break;
      case '-':
      case '_':
        canvasKeyZoom(false, mo);
        break;
      case '=':
      case '+':
        canvasKeyZoom(true, mo);
        break;
      case '0':
        byId('reset-btn').click();
        break;
      case 'Enter':
        polygonSelect(mo, e.shiftKey);
        break;
      case 'l':
      case 'L':
        byId('high-btn').click();
        break;
      case 'p':
      case 'P':
        byId('image-btn').click();
        break;
      case 'Delete':
      case 'Backspace':
        byId('mask-btn').click();
        break;
      case 'z':
      case 'Z':
        byId('undo-mask-btn').click();
        break;
      case 'f':
      case 'F':
        byId('focus-btn').click();
        break;
      case ' ':
        byId('as-new-bin-btn').click();
        break;
      case '.':
      case '>':
        byId('add-to-bin-btn').click();
        break;
      case ',':
      case '<':
        byId('remove-from-bin-btn').click();
        break;
      case '/':
      case '?':
        byId('update-bin-btn').click();
        e.preventDefault(); // otherwise it will open Firefox quick find bar
        break;
    }
    const t1 = performance.now();
    console.log(t1 - t0);
  });
} // end initializing controls


/**
 * Canvas moving.
 * @function canvasKeyMove
 * @param {number} d - move direction
 * @param {Object} mo - main object
 * @description Direction: 0 (top), 1 (right), 2 (bottom), 3 (left), the same
 * as JavaScript margins.
 */
function canvasKeyMove(d, mo) {
  const step = 15;
  if (d & 1) mo.view.posX += d >> 1 ? -step : step;
  else mo.view.posY += d >> 1 ? step : -step;
  updateView(mo);
}


/**
 * Canvas moving by touch.
 * @function canvasTouchMove
 * @param {Object} mo - main object
 * @param {number} t - touches
 */
function canvasTouchMove(mo, t) {
  const view = mo.view,
        stat = mo.stat;
  const X = stat.touchX,
        Y = stat.touchY;
  const dx = X[0] - t[0].clientX,
        dy = Y[0] - t[0].clientY;
  X[0] = t[0].clientX;
  Y[0] = t[0].clientY;
  view.posX -= dx;
  view.posY -= dy;
  updateView(mo);
}


/**
 * Canvas zooming by keys.
 * @function canvasKeyZoom
 * @param {boolean} isin - zoom in (true) or out (false)
 * @param {Object} mo - main object
 * @description It zooms from the plot center.
 */
function canvasKeyZoom(isin, mo) {
  let ratio = 0.75;
  if (isin) ratio = 1 / ratio;
  const view = mo.view;
  const plot = mo.plot;
  const w2 = plot.width / 2,
        h2 = plot.height / 2;
  view.scale *= ratio;
  view.posX = (view.posX - w2) * ratio + w2;
  view.posY = (view.posY - h2) * ratio + h2;
  updateView(mo, true);
}


/**
 * Canvas zooming by mouse.
 * @function canvasMouseZoom
 * @param {boolean} isin - zoom in (true) or out (false)
 * @param {Object} mo - main object
 * @param {number} x - x-coordinate of mouse pointer
 * @param {number} y - y-coordinate of mouse pointer
 * @description It zooms from the mouse position.
 */
function canvasMouseZoom(isin, mo, x, y) {
  let ratio = 0.75;
  if (isin) ratio = 1 / ratio;
  const view = mo.view;
  view.scale *= ratio;
  view.posX = x - (x - view.posX) * ratio;
  view.posY = y - (y - view.posY) * ratio;
  updateView(mo, true);
}


/**
 * Canvas zooming by touch.
 * @function canvasTouchZoom
 * @param {Object} mo - main object
 * @param {number} t - touches
 * @description It zooms from the midpoint between two fingers.
 */
function canvasTouchZoom(mo, t) {
  const view = mo.view,
        stat = mo.stat,
        plot = mo.plot;
  const w = plot.width,
        h = plot.height;
  const X = stat.touchX,
        Y = stat.touchY;

  // current xy coordinates of touches
  const newX = [t[0].clientX, t[1].clientX],
        newY = [t[0].clientY, t[1].clientY];

  // find midpoint of current touches
  const newMid = [(newX[0] + newX[1]) / 2, (newY[0] + newY[1]) / 2];

  // ratio of distances between old and new coordinates
  const dist = Math.sqrt(((X[0] - X[1]) / w) ** 2 + (
    (Y[0] - Y[1]) / h) ** 2);
  const newDist = Math.sqrt(((newX[0] - newX[1]) / w) ** 2 + ((
    newY[0] - newY[1]) / h) ** 2);
  const ratio = newDist / dist;

  // set old coordinates to be new coordinates
  X.splice(0, 2, ...newX);
  Y.splice(0, 2, ...newY);

  // updating view
  view.scale *= ratio;
  view.posX = newMid[0] - (newMid[0] - view.posX) * ratio;
  view.posY = newMid[1] - (newMid[1] - view.posY) * ratio;
  updateView(mo, true);
}


/**
 * Canvas mouse move event.
 * @function canvasMouseMove
 * @param {Object} e - event object
 * @param {Object} mo - main object
 */
function canvasMouseMove(e, mo) {
  const view = mo.view,
        stat = mo.stat,
        plot = mo.plot;

  // drag to move the canvas
  if (stat.mousedown) {
    const posX = e.clientX - stat.dragX,
          posY = e.clientY - stat.dragY;

    // won't move if offset is within a pixel
    // this is to prevent accidential tiny moves while clicking
    if (Math.abs(posX - view.posX) > 1 || Math.abs(posY - view.posY) > 1) {
      stat.mousemove = true;
      view.posX = posX;
      view.posY = posY;
      updateView(mo);
    }
  }

  // show current coordinates
  else if (mo.view.grid) {
    const x = ((e.offsetX - view.posX) / view.scale / plot.width + 0.5) *
      (view.x.max - view.x.min) + view.x.min;
    const y = view.y.max - ((e.offsetY - view.posY) / view.scale /
      plot.height + 0.5) * (view.y.max - view.y.min);
    byId('coords-label').innerHTML = x.toFixed(3) + ',' + y.toFixed(3);
  }
}


/**
 * Canvas mouse click event.
 * @function canvasMouseClick
 * @param {Object} e - event object
 * @param {Object} mo - main object
 */
function canvasMouseClick(e, mo) {
  const view = mo.view,
        stat = mo.stat,
        plot = mo.plot;

  // mouse up after dragging
  if (stat.mousemove) {
    stat.mousemove = false;
  }

  // keep drawing polygon
  else if (stat.drawing) {
    stat.polygon.push({
      x: (e.offsetX - view.posX) / view.scale,
      y: (e.offsetY - view.posY) / view.scale,
    });
    drawPolygon(mo);
  }

  // determine which contigs are clicked
  else {
    const n = mo.cache.nctg;
    if (!n) return;
    const pick = mo.picked,
          mask = mo.masked;

    // clear current selection
    if (!e.shiftKey) {
      pick.fill(false);
      mo.cache.npick = 0;
    }

    // get canvas size
    const w = plot.width,
          h = plot.height;

    // get mouse position    
    const x0 = (e.offsetX - view.posX) / view.scale,
          y0 = (e.offsetY - view.posY) / view.scale;

    // transformed data
    const trans = mo.trans;
    const X = trans.x,
          Y = trans.y,
          S = trans.size;

    const arr = [];
    let x2y2;
    for (let i = 0; i < n; i++) {
      if (mask[i]) continue;

      // calculate distance to center
      x2y2 = (X[i] * w - x0) ** 2 + (Y[i] * h - y0) ** 2;

      // if mouse is within contig area, consider as a click
      if (x2y2 < S[i] ** 2) arr.push([i, x2y2]);
    }

    // if one or more contigs are clicked
    if (arr.length > 0) {

      // sort clicked contigs by proximity from center to mouse position
      // no need to square root because it is monotonic
      arr.sort((a, b) => a[1] - b[1]);
      let ctg = arr[0][0];

      // if already selected, unselect; else, select
      if (pick[ctg]) {
        pick[ctg] = false;
        mo.cache.npick -= 1;
      } else {
        pick[ctg] = true;
        mo.cache.npick += 1;
      }
    }
    updateSelection(mo);
  }
}


/**
 * Calculate plot dimensions based on style and container.
 * @function calcPlotDims
 * @param {Object} mo - main object
 * @returns {[number, number]} - width and height of arena
 */
function calcPlotDims(mo) {
  const frame = byId('main-frame');
  const w = Math.max(mo.view.minW, frame.offsetWidth);
  const h = Math.max(mo.view.minH, frame.offsetHeight);
  return [w, h];
}


/**
 * Update canvas dimensions.
 * @function resizePlot
 * @param {Object} mo - main object
 */
function resizePlot(mo) {
  const plot = mo.plot;
  const [w, h] = calcPlotDims(mo);
  if (plot.width !== w) mo.olay.width = plot.width = w;
  if (plot.height !== h) mo.olay.height = plot.height = h;
  updateView(mo, true);
}


/**
 * Render arena given current data and view.
 * @function renderArena
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
function renderArena(mo, redo) {
  const view = mo.view,
        plot = mo.plot,
        stat = mo.stat,
        paths = mo.paths;
  const w = plot.width,
        h = plot.height;
  const posX = view.posX,
        posY = view.posY,
        scale = view.scale;

  // cannot render if no data, or no x- or y-axis
  if (!mo.cache.nctg || !view.x.i || !view.y.i) {
    const ctx = plot.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    return;
  }

  // a callback to paint cached paths, to be called by background tracer
  function painter() {
    pathToPlot(mo.offs, w * 2, h * 2, paths.main, paths.high,
      -w / 2, -h / 2, 1, HIGHLIGHT_PALETTE);
    mo.images = [mo.offs, null, posX + w / 2, posY + h / 2, scale];
  }

  // check cached image
  // if no cached image matches, draw a new one
  let img = mo.images;
  if (redo || img === null || img[4] !== scale ||
      img[2] - posX < 0 || img[2] - posX + w > img[0].width ||
      img[3] - posY < 0 || img[3] - posY + h > img[0].height) {

    let posXp = paths.posX,
        posYp = paths.posY;

    // relative scale (from paths to image)
    let rs = scale / paths.scale;

    // check cached paths
    // if paths don't match, trace new paths
    // because tracing is expensive, it will be executed in the background,
    // while the plot is directly and independently rendered to canvas
    if (redo || paths.main === null ||
        posX > posXp * rs || (w - posX) > (w * 3 - posXp) * rs ||
        posY > posYp * rs || (h - posY) > (h * 3 - posYp) * rs) {

      // directly render main canvas
      drawMain(plot, posX, posY, scale, 0, 0, mo.trans, mo.masked,
        mo.highed, HIGHLIGHT_PALETTE);
      if (view.grid) drawGrid(ctx, w, h, view);

      // trace paths in background (3x dimension)
      console.log('tracing...');
      stat.tracing = Date.now();
      traceMainBg(w, h, posX, posY, scale, 1, mo.trans, mo.masked, paths, stat,
                  painter);
      return;
    }

    // paint off-screen canvas (2x dimension)
    console.log('painting...');
    pathToPlot(mo.offs, w * 2, h * 2, paths.main, paths.high,
              posX + w / 2 - posXp * rs, posY + h / 2 - posYp * rs,
              rs, HIGHLIGHT_PALETTE);

    // update image cache
    // data structure: [main plot image, overlay image, posx, posy, scale]
    img = mo.images = [mo.offs, null, posX + w / 2, posY + h / 2, scale];
  }

  // draw image to canvas
  const ctx = plot.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img[0], img[2] - posX, img[3] - posY, w, h, 0, 0, w, h);

  // draw grid (optional)
  if (view.grid) drawGrid(ctx, w, h, view);
}


/**
 * Render arena given current data and view.
 * @function renderArena
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
// function renderArenaY(mo, redo) {
//   const view = mo.view,
//         plot = mo.plot,
//         paths = mo.paths;
//   const w = plot.width,
//         h = plot.height;
//   const posX = view.posX,
//         posY = view.posY,
//         scale = view.scale;

//   // cannot render if no data, or no x- or y-axis
//   if (!mo.cache.nctg || !view.x.i || !view.y.i) {
//     const ctx = plot.getContext('2d');
//     ctx.clearRect(0, 0, w, h);
//     return;
//   }

//   // check cached image
//   let img = mo.images;
//   if (redo || img === null || img[4] !== scale ||
//       img[2] - posX < 0 || img[2] - posX + w > img[0].width ||
//       img[3] - posY < 0 || img[3] - posY + h > img[0].height) {

//     let posXp = paths.posX,
//         posYp = paths.posY;

//     // relative scale (from paths to image)
//     let rs = scale / paths.scale;

//     // check cached paths
//     if (redo || paths.main === null ||
//         posX > posXp * rs || (w * 2 - posX) > (w * 3 - posXp) * rs ||
//         posY > posYp * rs || (h * 2 - posY) > (h * 3 - posYp) * rs) {

//       // trace paths (3x dimension)
//       console.log('tracing...');
//       paths.main = traceMain(w, h, posX, posY, scale, 1, mo.trans, mo.masked);

//       // update paths cache
//       posXp = paths.posX = posX + w;
//       posYp = paths.posY = posY + h;
//       paths.scale = scale;
//       rs = 1;
//     }

//     // paint off-screen canvas (2x dimension)
//     console.log('painting...');
//     pathToPlot(mo.offs, w * 2, h * 2, paths.main, paths.high,
//                posX + w / 2 - posXp * rs, posY + h / 2 - posYp * rs,
//                rs, HIGHLIGHT_PALETTE);

//     // update image cache
//     // data structure: [main plot image, overlay image, posx, posy, scale]
//     img = mo.images = [mo.offs, null, posX + w / 2, posY + h / 2, scale];
//   }

//   // draw image to canvas
//   const ctx = plot.getContext('2d');
//   ctx.clearRect(0, 0, w, h);
//   ctx.drawImage(img[0], img[2] - posX, img[3] - posY, w, h, 0, 0, w, h);

//   // draw grid (optional)
//   if (view.grid) drawGrid(ctx, w, h, view);
// }


/**
 * Fill cached paths (main and high) in target canvas.
 * @function pathToPlot
 * @param {Object} canvas - canvas DOM
 * @param {number} w      - canvas width
 * @param {number} h      - canvas height
 * @param {Object} mpaths - main plot paths
 * @param {Object} hpaths - highlight paths
 * @param {number} x      - x-positon
 * @param {number} y      - y-positon
 * @param {number} s      - scale
 * @param {Array}  hcols  - highlight colors
 */
function pathToPlot(canvas, w, h, mpaths, hpaths, x, y, s, hcols) {
  if (canvas.width != w) canvas.width = w;
  if (canvas.height != h) canvas.height = h;

  // prepare drawing area
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // clip to visible region
  // (doesn't change performance...)
  ctx.rect(0, 0, w, h);
  ctx.clip();

  // transform canvas
  ctx.translate(x, y);
  if (s != 1) ctx.scale(s, s);

  // fill highlight
  const n = hpaths.length;
  for (let i = 0; i < n; i++) {
    if (hpaths[i] !== null) {
      ctx.fillStyle = hcols[i];
      ctx.fill(hpaths[i]);
    }
  }

  // fill main plot
  for (const f in mpaths) {
    ctx.fillStyle = f;
    ctx.fill(mpaths[f]);
  }
  ctx.restore();
}


/**
 * Fill cached paths (main and high) in target canvas.
 * @function pathToPlotX
 * @param {Object} canvas - canvas DOM
 * @param {number} w      - canvas width
 * @param {number} h      - canvas height
 * @param {Object} mpaths - main plot paths
 * @param {Object} hpaths - highlight paths
 * @param {number} x      - x-positon
 * @param {number} y      - y-positon
 * @param {number} s      - scale
 * @param {Array}  hcols  - highlight colors
 */
function pathToPlotX(canvas, w, h, mpaths, hpaths, x, y, s, hcols, stat) {
  if (canvas.width != w) canvas.width = w;
  if (canvas.height != h) canvas.height = h;

  // prepare drawing area
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // clip to visible region
  // (doesn't change performance...)
  ctx.rect(0, 0, w, h);
  ctx.clip();

  // transform canvas
  ctx.translate(x, y);
  if (s != 1) ctx.scale(s, s);

  // fill highlight
  const n = hpaths.length;
  for (let i = 0; i < n; i++) {
    if (hpaths[i] !== null) {
      ctx.fillStyle = hcols[i];
      ctx.fill(hpaths[i]);
    }
  }

  // fill main plot
  for (const f in mpaths) {
    ctx.fillStyle = f;
    ctx.fill(mpaths[f]);
  }
  ctx.restore();
}


/**
 * Render arena given current data and view.
 * @function renderArena
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
function renderArenaX(mo, redo) {
  const view = mo.view,
        rena = mo.rena;

  // get canvas context
  const ctx = rena.getContext('2d');

  // cannot render if no data, or no x- or y-axis
  const w = rena.width,
        h = rena.height;
  if (!mo.cache.nctg || !view.x.i || !view.y.i) {
    ctx.clearRect(0, 0, w, h);
    return;
  }

  // determine position of canvas
  const posX = view.posX,
        posY = view.posY,
        offX = view.offX,
        offY = view.offY,
        scale = view.scale;
  if (redo || !view.mainoff ||
      posX < offX - w || posX > offX + w ||
      posY < offY - h || posY > offY + h) {
    view.mainoff = false;

    // directly render main arena
    drawMain(rena, posX, posY, scale, 0, 0, mo.trans, mo.masked,
             mo.highed, HIGHLIGHT_PALETTE);

    // then cache a larger region in an offscreen canvas
    // view.offX = posX;
    // view.offY = posY;
    // mo.worker.postMessage({msg: 'main', params: [
    //   posX, posY, scale, w, h, mo.trans, mo.masked, mo.highed]});
  }

  // otherwise, directly transfer cached image
  else {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(rena.offs, offX - posX + w, offY - posY + h,
      w, h, 0, 0, w, h);
  }

  // (optional) draw grid
  if (view.grid) drawGrid(ctx, w, h, view);
}


function traceMainBg(w, h, posX, posY, scale, margin, trans, mask, paths, stat,
                     callback) {
  const uid = stat.tracing;
  paths.main = null;
  const P = {};
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        F = trans.fses;
  const x_lim = w + w * margin * 2,
        y_lim = h + h * margin * 2;
  const x_times = w * scale,
        y_times = h * scale;
  const x_plus = posX + w * margin + 0.5,
        y_plus = posY + h * margin + 0.5;
  const pi2 = Math.PI * 2;
  const fs = Object.keys(F);
  const n = fs.length;
  let f, i, j, m, I, x, y, r, p;
  let idx = 0;
  function chunk() {
    let cnt = 25; // chunk size (empirically determined)
    while (cnt-- && idx < n) {
      f = fs[idx];
      p = P[f] = new Path2D();
      I = F[f];
      m = I.length;
      for (j = 0; j < m; j++) {
        i = I[j];
        if (mask[i]) continue;  
        r = S[i] * scale + 0.5 << 0;
        x = X[i] * x_times + x_plus << 0;
        if (x + r < 0 || x - r > x_lim) continue;
        y = Y[i] * y_times + y_plus << 0;
        if (y + r < 0 || y - r > y_lim) continue;
        p.moveTo(x, y);
        p.arc(x, y, r, 0, pi2, true);
      }
      ++idx;
    }
    if (stat.tracing !== uid) return;
    if (idx < n) requestIdleCallback(chunk);
    else {
      paths.main = P;
      paths.posX = posX + w;
      paths.posY = posY + h;
      paths.scale = scale;
      console.log('traced');
      requestIdleCallback(callback);
    };
  }
  requestIdleCallback(chunk);
}


/**
 * Generate 2D paths of main plot.
 * @function traceMain
 * @param {number} w      - canvas width
 * @param {number} h      - canvas height
 * @param {number} posX   - x-positon
 * @param {number} posY   - y-positon
 * @param {number} scale  - scale factor
 * @param {number} margin - margin factor
 * @param {Object} trans  - transformed data
 * @param {Array}  mask   - masking
 * @returns {Object} - main plot paths
 * @description Coordinates are based on top left corner (incl. margin).
 */
function traceMain(w, h, posX, posY, scale, margin, trans, mask) {
  const paths = {};
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        F = trans.fses;
  const x_lim = w + w * margin * 2,
        y_lim = h + h * margin * 2;
  const x_times = w * scale,
        y_times = h * scale;
  const x_plus = posX + w * margin + 0.5,
        y_plus = posY + h * margin + 0.5;
  const pi2 = Math.PI * 2;
  let i, j, m, I, x, y, r, p;
  for (const f in F) {
    p = paths[f] = new Path2D();
    I = F[f];
    m = I.length;
    for (j = 0; j < m; j++) {
      i = I[j];
      if (mask[i]) continue;  
      r = S[i] * scale + 0.5 << 0;
      x = X[i] * x_times + x_plus << 0;
      if (x + r < 0 || x - r > x_lim) continue;
      y = Y[i] * y_times + y_plus << 0;
      if (y + r < 0 || y - r > y_lim) continue;
      p.moveTo(x, y);
      p.arc(x, y, r, 0, pi2, true);
    }
  }
  return paths;
}


/**
 * Generate 2D paths of main plot, without checking.
 * @function traceJustMain
 * @param {number} w     - canvas width
 * @param {number} h     - canvas height
 * @param {Object} trans - transformed data
 * @returns {Object} - main plot paths
 * @description For the first screen of a workspace.
 */
function traceJustMain(w, h, trans) {
  const paths = {};
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        F = trans.fses;
  const pi2 = Math.PI * 2;
  let i, j, m, I, x, y, r, p;
  for (const f in F) {
    p = paths[f] = new Path2D();
    I = F[f];
    m = I.length;
    for (j = 0; j < m; j++) {
      i = I[j];
      r = S[i] + 0.5 << 0;
      x = X[i] * w + 0.5 << 0;
      y = Y[i] * h + 0.5 << 0;
      p.moveTo(x, y);
      p.arc(x, y, r, 0, pi2, true);
    }
  }
  return paths;
}


/**
 * Render main plot.
 * @function cachePaths
 */
function cachePaths(w, h, trans, mask, high, highpal) {
  const paths = {};
  const pi2 = Math.PI * 2;
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        F = trans.fses;
  const nhigh = highpal.length;
  const highs = Array(nhigh).fill().map(() => Array());
  const hirad = 8;
  let i, j, m, I, x, y, r, hi, p;
  for (const f in F) {
    p = paths[f] = new Path2D();
    I = F[f];
    m = I.length;
    for (j = 0; j < m; j++) {
      i = I[j];
      if (mask[i]) continue;  
      r = S[i] + 0.5 << 0;
      x = X[i] * w + 0.5 << 0;
      y = Y[i] * h + 0.5 << 0;
      hi = high[i];
      if (hi) highs[hi - 1].push([x, y, r + hirad]);
      p.moveTo(x, y);
      p.arc(x, y, r, 0, pi2, true);
    }
  }
  let hs, hl;
  for (let i = 0; i < nhigh; i++) {
    hs = highs[i];
    m = hs.length;
    if (!m) continue;
    p = paths[highpal[i] + '66'] = new Path2D();
    for (j = 0; j < m; j++) {
      hl = hs[j];
      p.moveTo(hl[0], hl[1]);
      p.arc(hl[0], hl[1], hl[2], 0, pi2, true);
    }
  }
  return paths;
}


/**
 * Render main plot.
 * @function drawMain
 * @param {Object} canvas - canvas DOM
 * @param {number} posX - x-positon
 * @param {number} posY - y-positon
 * @param {number} scale - scale
 * @param {number} offX - x-offset
 * @param {number} offY - y-offset
 * @param {Object} trans - transformed data
 * @param {Array} mask - masking
 * @param {Array} high - highlighting
 * @param {Array} highpal - highlight palette
 */
function drawMain(canvas, posX, posY, scale, offX, offY, trans, mask, high,
                  highpal) {
  // get canvas context
  const ctx = canvas.getContext('2d');

  // clear canvas
  const w = canvas.width,
        h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // cache constants
  const pi2 = Math.PI * 2,
        min1 = Math.sqrt(1 / Math.PI);

  // transformed data
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        F = trans.fses;

  // cache scale
  const x_times = (w - 2 * offX) * scale,
        y_times = (h - 2 * offY) * scale;

  // cache offset
  const x_plus = posX + offX + 0.5,
        y_plus = posY + offY + 0.5;

  // highlights
  const nhigh = highpal.length;
  const highs = Array(nhigh).fill().map(() => Array());
  const hirad = 8;

  // path per fill style
  const paths = {};

  // render contigs
  let i, j, m, I, x, y, r, hi, p;
  for (const f in F) {
    p = paths[f] = new Path2D();

    // iterate over indices
    I = F[f];
    m = I.length;
    for (j = 0; j < m; j++) {
      i = I[j];

      // skip if masked
      if (mask[i]) continue;  

      // determine radius (size; round to integer)
      r = S[i] * scale + 0.5 << 0;

      // if contig occupies less than one pixel on screen, skip
      if (r < min1) continue;

      // determine x- and y-coordinates
      // skip contigs outside visible region
      x = X[i] * x_times + x_plus << 0;
      if (x + r < 0 || x - r > w) continue;
      y = Y[i] * y_times + y_plus << 0;
      if (y + r < 0 || y - r > h) continue;

      // highlight circle
      hi = high[i];
      if (hi) highs[hi - 1].push([x, y, r + hirad]);

      // draw circle
      p.moveTo(x, y);
      p.arc(x, y, r, 0, pi2, true);
    }
  } // end for f

  // render highlights
  let hs, hl;
  for (let i = 0; i < nhigh; i++) {
    hs = highs[i];
    m = hs.length;
    if (!m) continue;
    ctx.fillStyle = highpal[i] + '66'; // alpha = 0.4
    ctx.beginPath();
    for (j = 0; j < m; j++) {
      hl = hs[j];
      ctx.moveTo(hl[0], hl[1]);
      ctx.arc(hl[0], hl[1], hl[2], 0, pi2, true);
    }
    ctx.fill();
  }

  // fill circles
  for (const f in paths) {
    ctx.fillStyle = f;
    ctx.fill(paths[f]);
  }

}


/**
 * Render shadows around selected contigs.
 * @function renderSelect
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force re-rendering
 * @see renderArena
 */
function renderSelect(mo, redo) {
  const view = mo.view,
        olay = mo.olay;
  const ctx = olay.getContext('2d');
  const w = olay.width,
        h = olay.height;

  // no (selected) contigs
  if (!mo.cache.nctg || (mo.cache.npick === 0)) {
    ctx.clearRect(0, 0, w, h);
    return;
  }

  // determine position of canvas
  const posX = view.posX,
        posY = view.posY,
        offX = view.offX,
        offY = view.offY,
        scale = view.scale;

  // if needed, cache image in off-screen canvas
  // this canvas has the sam position and dimensions as the main plot's
  // off-screen canvas
  if (redo || !view.shadoff ||
      posX < offX - w || posX > offX + w ||
      posY < offY - h || posY > offY + h) {
    view.shadoff = false;

    // directly render selection shadows
    drawShad(olay, posX, posY, scale, 0, 0, mo.trans, mo.picked,
             mo.theme.selection);

    // then cache a larger region in an offscreen canvas    
    mo.worker.postMessage({msg: 'shad', params: [
      posX, posY, scale, w, h, mo.trans, mo.picked]});
  }

  // or load cached image from offscreen canvas
  else {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(olay.offs, offX - posX + w, offY - posY + h,
      w, h, 0, 0, w, h);
  }
}


/**
 * Render selection shadows in an off-screen canvas.
 * @function drawShad
 * @param {Object} mo - main object
 * @see drawMain
 */
function drawShad(canvas, posX, posY, scale, offX, offY, trans, pick, color) {
  const ctx = canvas.getContext('2d');

  // clear canvas
  const w = canvas.width,
        h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // define shadow style
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10; // note: canvas shadow blur is expensive
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // cache data
  const X = trans.x,
        Y = trans.y,
        S = trans.size;
  const pi2 = Math.PI * 2;

  // cache scale and offset
  const x_times = (w - 2 * offX) * scale,
        y_times = (h - 2 * offY) * scale;
  const x_plus = posX + offX + 0.5,
        y_plus = posY + offY + 0.5;

  // render shadows around selected contigs
  let r, x, y;
  ctx.beginPath();
  const n = pick.length;
  for (let i = 0; i < n; i++) {
    if (!pick[i]) continue;
    r = S[i] * scale + 0.5 << 0;
    x = X[i] * x_times + x_plus << 0;
    if (x + r < 0 || x - r > w) continue;
    y = Y[i] * y_times + y_plus << 0;
    if (y + r < 0 || y - r > h) continue;
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, 0, pi2, true);
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
        olay = mo.olay;
  const vertices = stat.polygon;
  const pi2 = Math.PI * 2;
  const radius = 5;
  const color = mo.theme.polygon;
  const ctx = olay.getContext('2d');
  ctx.clearRect(0, 0, olay.width, olay.height);
  const posX = view.posX,
        posY = view.posY;
  const scale = view.scale;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const n = vertices.length;
  let vertex, x, y, j;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    vertex = vertices[i];
    x = Math.round(vertex.x * scale + posX);
    y = Math.round(vertex.y * scale + posY);
    ctx.arc(x, y, radius, 0, pi2, true);
    ctx.moveTo(x, y);
    j = i + 1;
    if (j == n) j = 0;
    vertex = vertices[j];
    x = Math.round(vertex.x * scale + posX);
    y = Math.round(vertex.y * scale + posY);
    ctx.lineTo(x, y);
  }
  ctx.lineWidth = 1;
  ctx.stroke();
}


/**
 * Render plot grid.
 * @function drawGrid
 * @param {Object} ctx - canvas context
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 * @param {Object} view - view object
 */
function drawGrid(ctx, w, h, view) {
  const scale = view.scale;
  const ww = w * scale,
        hh = h * scale;
  const xmin = view.x.min,
        xmax = view.x.max,
        xran = xmax - xmin;
  const ymin = view.y.min,
        ymax = view.y.max,
        yran = ymax - ymin;
  const posX = view.posX,
        posY = view.posY;

  // calculate grid density (number of steps)
  // note: grid density increases when zooming in, and descreases to at least
  // 5 when zooming out
  const nbin = Math.max(Math.round(10 * scale), 5);

  // calculate best ticks
  // note: these ticks are constant as long as data and zooming are unchanged,
  // regardless of canvas position
  const xticks = getTicks(xmin, xmax, nbin).slice(1, -1),
        yticks = getTicks(ymin, ymax, nbin).slice(1, -1);
  const nxtick = xticks.length,
        nytick = yticks.length;

  // render vertical lines
  ctx.save();
  ctx.beginPath();
  const xposes = [], xtickz = [];
  let xtick, xpos;
  for (let i = 0; i < nxtick; i++) {
    xtick = xticks[i];
    xpos = Math.round(((xtick - xmin) / xran - 0.5) * ww + posX);
    if (xpos < 0) continue;
    if (xpos > w) break;
    xposes.push(xpos);
    xtickz.push(xtick);
    ctx.moveTo(xpos, 0);
    ctx.lineTo(xpos, h);
  }

  // render horizontal lines
  const yposes = [], ytickz = [];
  let ytick, ypos;
  for (let i = 0; i < nytick; i++) {
    ytick = yticks[i];
    ypos = Math.round(((ymax - ytick) / yran - 0.5) * hh + posY);
    if (ypos > h) continue;
    if (ypos < 0) break;
    ctx.moveTo(0, ypos);
    ctx.lineTo(w, ypos);
    yposes.push(ypos);
    ytickz.push(ytick);
  }

  ctx.strokeStyle = 'lightgray';
  ctx.lineWidth = 1;
  ctx.stroke();

  // determine text label positions
  // i.e., the line closest to the middle of screen
  const xlabpos = xposes[Math.round(xposes.length / 2 - 1)],
        ylabpos = yposes[Math.round(yposes.length / 2 - 1)];

  // calculate best precisions
  const xdigits = Math.max(0, Math.ceil(-Math.log10((xticks[nxtick - 1] -
          xticks[0]) / (nxtick - 1)))),
        ydigits = Math.max(0, Math.ceil(-Math.log10((yticks[nytick - 1] -
          yticks[0]) / (nytick - 1))));

  // render text labels
  ctx.font = '1em monospace';
  ctx.fillStyle = 'dimgray';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nxpos = xposes.length;
  for (let i = 0; i < nxpos; i++) {
    ctx.fillText(xtickz[i].toFixed(xdigits), xposes[i], ylabpos);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const nypos = yposes.length;
  for (let i = 0; i < nypos; i++) {
    ctx.fillText(ytickz[i].toFixed(ydigits), xlabpos, yposes[i]);
  }
  ctx.restore();
}


/**
 * Let user draw polygon to select a region of contigs.
 * @function polygonSelect
 * @param {Object} mo - main object
 * @param {boolean} shift - whether Shift key is processed
 */
function polygonSelect(mo, shift) {
  let n = mo.cache.nctg;
  if (!n) return;
  const stat = mo.stat,
        olay = mo.olay;

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
    const w = olay.width,
          h = olay.height;
    olay.getContext('2d').clearRect(0, 0, w, h);

    // find contigs within polygon
    const X = mo.trans.x,
          Y = mo.trans.y;
    const mask = mo.masked;
    const ctgs = [];
    for (let i = 0; i < n; i++) {
      if (!mask[i]) {
        if (pnpoly(X[i] * w, Y[i] * h, stat.polygon)) ctgs.push(i);
      }
    }
    stat.polygon = [];
    stat.drawing = false;

    // treat selected contigs
    treatSelection(ctgs, mo, shift);
  }
}


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
