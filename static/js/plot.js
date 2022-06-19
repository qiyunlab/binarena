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
  const plot = mo.plot;
  plot.main = byId('main-canvas');
  plot.sele = byId('sele-canvas');
  plot.high = byId('high-canvas');

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
  const canvas = plot.main;

  // minimum dimensions of plot
  mo.view.minW = parseInt(getComputedStyle(canvas).minWidth);
  mo.view.minH = parseInt(getComputedStyle(canvas).minHeight);

  const stat = mo.stat;

  resizePlot(mo);

  /** mouse events */
  canvas.addEventListener('mousedown', function (e) {
    stat.mousedown = true;
    stat.dragX = e.clientX - plot.posX;
    stat.dragY = e.clientY - plot.posY;
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
  if (d & 1) mo.plot.posX += d >> 1 ? -step : step;
  else mo.plot.posY += d >> 1 ? step : -step;
  updateView(mo);
}


/**
 * Canvas moving by touch.
 * @function canvasTouchMove
 * @param {Object} mo - main object
 * @param {number} t - touches
 */
function canvasTouchMove(mo, t) {
  const plot = mo.plot,
        stat = mo.stat;
  const X = stat.touchX,
        Y = stat.touchY;
  const dx = X[0] - t[0].clientX,
        dy = Y[0] - t[0].clientY;
  X[0] = t[0].clientX;
  Y[0] = t[0].clientY;
  plot.posX -= dx;
  plot.posY -= dy;
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
  const plot = mo.plot;
  const canvas = plot.main;
  const w2 = canvas.width / 2,
        h2 = canvas.height / 2;
  plot.scale *= ratio;
  plot.posX = (plot.posX - w2) * ratio + w2;
  plot.posY = (plot.posY - h2) * ratio + h2;
  updateView(mo);
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
  const plot = mo.plot;
  plot.scale *= ratio;
  plot.posX = x - (x - plot.posX) * ratio;
  plot.posY = y - (y - plot.posY) * ratio;
  updateView(mo);
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
  const plot = mo.plot,
        stat = mo.stat;
  const canvas = plot.main;
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
  plot.scale *= ratio;
  plot.posX = newMid[0] - (newMid[0] - plot.posX) * ratio;
  plot.posY = newMid[1] - (newMid[1] - plot.posY) * ratio;
  updateView(mo, true);
}


/**
 * Canvas mouse move event.
 * @function canvasMouseMove
 * @param {Object} e - event object
 * @param {Object} mo - main object
 */
function canvasMouseMove(e, mo) {
  const plot = mo.plot,
        view = mo.view,
        stat = mo.stat;

  // drag to move the canvas
  if (stat.mousedown) {
    const posX = e.clientX - stat.dragX,
          posY = e.clientY - stat.dragY;

    // won't move if offset is within a pixel
    // this is to prevent accidential tiny moves while clicking
    if (Math.abs(posX - plot.posX) > 1 || Math.abs(posY - plot.posY) > 1) {
      stat.mousemove = true;
      plot.posX = posX;
      plot.posY = posY;
      updateView(mo);
    }
  }

  // show current coordinates
  else if (mo.view.grid) {
    const canvas = plot.main;
    const x = ((e.offsetX - plot.posX) / plot.scale / canvas.width +
      0.5) * (view.x.max - view.x.min) + view.x.min;
    const y = view.y.max - ((e.offsetY - plot.posY) / plot.scale /
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
        plot = mo.plot;

  // mouse up after dragging
  if (stat.mousemove) {
    stat.mousemove = false;
  }

  // keep drawing polygon
  else if (stat.drawing) {
    stat.polygon.push({
      x: (e.offsetX - plot.posX) / plot.scale,
      y: (e.offsetY - plot.posY) / plot.scale,
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
    const canvas = plot.main;
    const w = canvas.width,
          h = canvas.height;

    // get mouse position    
    const x0 = (e.offsetX - plot.posX) / plot.scale,
          y0 = (e.offsetY - plot.posY) / plot.scale;

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
 * @param {Object} mo - main object
 * @param {Array.<string>} [keys=] - canvas keys to clear
 */
function clearPlot(mo, keys) {
  keys = keys || ['main', 'sele', 'high'];
  const plot = mo.plot;
  for (const key of keys) {
    const canvas = plot[key];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}


/**
 * Take a screenshot and export as a PNG image.
 * @function exportPNG
 * @param {Object} mo - main object
 */
function exportPNG(mo) {
  const canvas = mo.plot.main;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
