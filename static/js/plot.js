"use strict";

/**!
 * @module plot
 * @file Main scatter plot controls.
 * @description The main plot is a scatter plot of contigs in an assembly.
 */


/**
 * Initialize main plot controls.
 * @function initPlotCtrl
 * @param {Object} mo - main object
 */
function initPlotCtrl(mo) {

  // initiate canvases
  const plot = mo.plot,
        view = mo.view,
        stat = mo.stat;
  plot.main = byId('main-canvas');
  plot.sele = byId('sele-canvas');
  plot.high = byId('high-canvas');
  plot.offs = document.createElement('canvas');

  // setting up plot events
  const canvas = plot.main;

  // minimum dimensions of plot
  view.minW = parseInt(getComputedStyle(canvas).minWidth);
  view.minH = parseInt(getComputedStyle(canvas).minHeight);

  // set plot dimensions
  resizePlot(mo);

  /** mouse events */
  canvas.addEventListener('mousedown', function (e) {
    stat.mousedown = true;
    stat.dragX = e.clientX - view.posX;
    stat.dragY = e.clientY - view.posY;
  });

  canvas.addEventListener('mouseup', function () {
    stat.mousedown = false;
  });

  canvas.addEventListener('mouseover', function () {
    stat.mousedown = false;
  });

  canvas.addEventListener('mouseout', function () {
    stat.mousedown = false;
    stat.mousemove = false;
  });

  canvas.addEventListener('mousemove', function (e) {
    canvasMouseMove(e, mo);
  });

  canvas.addEventListener('mousewheel', function (e) {
    canvasMouseZoom(e.wheelDelta > 0, mo, e.clientX, e.clientY);
  });

  canvas.addEventListener('DOMMouseScroll', function (e) {
    canvasMouseZoom(e.detail < 0, mo, e.clientX, e.clientY);
  });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    const menu = byId('context-menu');
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';
    menu.classList.remove('hidden');
  });

  canvas.addEventListener('click', function (e) {
    canvasMouseClick(e, mo);
  });

  /** drag & drop file */
  canvas.addEventListener('dragover', function (e) {
    e.preventDefault();
  });

  canvas.addEventListener('dragenter', function (e) {
    e.preventDefault();
  });

  canvas.addEventListener('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();
    uploadFile(e.dataTransfer.files[0], mo);
  });

  /** touch events */
  canvas.addEventListener('touchstart', function (e) {
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

  canvas.addEventListener('touchmove', function (e) {
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
  canvas.addEventListener('keydown', function (e) {
    // const t0 = performance.now();
    switch (e.key) {

      // move
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

      // zoom
      case '-':
      case '_':
        canvasKeyZoom(false, mo);
        break;
      case '=':
      case '+':
        canvasKeyZoom(true, mo);
        break;

      // reset
      case '0':
        byId('reset-btn').click();
        break;

      // polygon select
      case 'Enter':
        polygonSelect(mo, e.shiftKey);
        break;

      // highlight
      case 'l':
      case 'L':
        byId('high-btn').click();
        break;

      // screenshot
      case 'p':
      case 'P':
        byId('image-btn').click();
        break;

      // mask
      case 'Delete':
      case 'Backspace':
        byId('mask-btn').click();
        break;
      case 'z':
      case 'Z':
        byId('undo-mask-btn').click();
        break;

      // focus
      case 'f':
      case 'F':
        byId('focus-btn').click();
        break;

      // binning
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
    // const t1 = performance.now();
    // console.log(t1 - t0);
  });

  // web worker for drawing on offscreen canvas
  const work = mo.work.draw;
  if (!work) return;

  // initiate offscreen canvas in worker
  work.postMessage({
    msg: 'init', 
    highpal: HIGHLIGHT_PALETTE,
    selcol: mo.theme.selection
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
  updateView(mo, false, true);
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
  updateView(mo, false, true);
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
  const canvas = mo.plot.main;
  const w2 = canvas.width / 2,
        h2 = canvas.height / 2;
  const view = mo.view;
  view.scale *= ratio;
  view.posX = (view.posX - w2) * ratio + w2;
  view.posY = (view.posY - h2) * ratio + h2;
  updateView(mo, false, true);
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
  updateView(mo, false, true);
}


/**
 * Canvas zooming by touch.
 * @function canvasTouchZoom
 * @param {Object} mo - main object
 * @param {number} t - touches
 * @description It zooms from the midpoint between two fingers.
 * @todo Let it use cached images.
 */
function canvasTouchZoom(mo, t) {
  const view = mo.view,
        stat = mo.stat;
  const canvas = mo.plot.main;
  const w = canvas.width,
        h = canvas.height;
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
  updateView(mo, false, true);
}


/**
 * Canvas mouse move event.
 * @function canvasMouseMove
 * @param {Object} e - event object
 * @param {Object} mo - main object
 */
function canvasMouseMove(e, mo) {
  const view = mo.view,
        stat = mo.stat;

  // drag to move the canvas
  if (stat.mousedown) {
    const posX = e.clientX - stat.dragX,
          posY = e.clientY - stat.dragY;

    // won't move if offset is within a pixel
    // this is to prevent accidental tiny moves while clicking
    if (Math.abs(posX - view.posX) > 1 || Math.abs(posY - view.posY) > 1) {
      stat.mousemove = true;
      view.posX = posX;
      view.posY = posY;
      updateView(mo, false, true);
    }
  }

  // show current coordinates
  else if (view.grid) {
    const canvas = mo.plot.main;
    const x = ((e.offsetX - view.posX) / view.scale / canvas.width +
      0.5) * (view.x.max - view.x.min) + view.x.min;
    const y = view.y.max - ((e.offsetY - view.posY) / view.scale /
      canvas.height + 0.5) * (view.y.max - view.y.min);
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
  const stat = mo.stat,
        plot = mo.plot,
        view = mo.view,
        cache = mo.cache;

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
    const n = cache.nctg;
    if (!n) return;
    const pick = mo.picked,
          mask = mo.masked;

    // selected before clicking
    const npick0 = cache.npick;

    // clear current selection
    if (!e.shiftKey) {
      pick.fill(false);
      cache.npick = 0;
    }

    // get canvas size
    const canvas = plot.main;
    const w = canvas.width,
          h = canvas.height;

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
        cache.npick -= 1;
      } else {
        pick[ctg] = true;
        cache.npick += 1;
      }
    }

    // if selection changed, update plot
    if (npick0 !== 0 || cache.npick !== 0) {
      updateSelection(mo);
    }
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
 * Update canvas dimensions according to current setting.
 * @function resizePlot
 * @param {Object} mo - main object
 */
function resizePlot(mo) {
  const [w, h] = calcPlotDims(mo);
  resizeCanvases(mo.plot, w, h);
  updateView(mo, true);
}


/**
 * Resize all three canvases to given width and height.
 * @function resizeCanvases
 * @param {Object} mo - main object
 */
function resizeCanvases(obj, w, h) {
  for (const key of ['main', 'sele', 'high']) {
    const canvas = obj[key];
    if (canvas.width != w) canvas.width = w;
    if (canvas.height != h) canvas.height = h;
  }
}


/**
 * Clear main plot.
 * @param {Object} obj - plot object
 * @param {Array.<string>} [keys=] - canvas keys to clear
 */
function clearPlot(obj, keys) {
  keys = keys || ['main', 'sele', 'high'];
  for (const key of keys) {
    const canvas = obj[key];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
