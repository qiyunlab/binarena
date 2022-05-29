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

  // the two main canvases that render the assembly plot
  mo.rena = byId('arena-canvas');
  mo.oray = byId('overlay-canvas');
  mo.view.minW = parseInt(getComputedStyle(mo.rena).minWidth);
  mo.view.minH = parseInt(getComputedStyle(mo.rena).minHeight);

  const view = mo.view,
        stat = mo.stat,
        rena = mo.rena;

  resizeArena(mo);

  /** mouse events */
  rena.addEventListener('mousedown', function (e) {
    stat.mousedown = true;
    stat.dragX = e.clientX - view.posX;
    stat.dragY = e.clientY - view.posY;
  });

  rena.addEventListener('mouseup', function () {
    stat.mousedown = false;
  });

  rena.addEventListener('mouseover', function () {
    stat.mousedown = false;
  });

  rena.addEventListener('mouseout', function () {
    stat.mousedown = false;
    stat.mousemove = false;
  });

  rena.addEventListener('mousemove', function (e) {
    canvasMouseMove(e, mo);
  });

  rena.addEventListener('mousewheel', function (e) {
    canvasMouseZoom(e.wheelDelta > 0, mo, e.clientX, e.clientY);
  });

  rena.addEventListener('DOMMouseScroll', function (e) {
    canvasMouseZoom(e.detail < 0, mo, e.clientX, e.clientY);
  });

  rena.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    const menu = byId('context-menu');
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';
    menu.classList.remove('hidden');
  });

  rena.addEventListener('click', function (e) {
    canvasMouseClick(e, mo);
  });

  /** drag & drop file */
  rena.addEventListener('dragover', function (e) {
    e.preventDefault();
  });

  rena.addEventListener('dragenter', function (e) {
    e.preventDefault();
  });

  rena.addEventListener('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();
    uploadFile(e.dataTransfer.files[0], mo);
  });

  /** touch events */
  rena.addEventListener('touchstart', function (e) {
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

  rena.addEventListener('touchmove', function (e) {
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
  rena.addEventListener('keydown', function (e) {
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
 */
function canvasKeyZoom(isin, mo) {
  let ratio = 0.75;
  if (isin) ratio = 1 / ratio;
  const view = mo.view;
  const rena = mo.rena;
  const w2 = rena.width / 2,
        h2 = rena.height / 2;
  view.scale *= ratio;
  view.posX = (view.posX - w2) * ratio + w2;
  view.posY = (view.posY - h2) * ratio + h2;
  updateView(mo);
}


/**
 * Canvas zooming by mouse.
 * @function canvasMouseZoom
 * @param {boolean} isin - zoom in (true) or out (false)
 * @param {Object} mo - main object
 * @param {number} x - x-coordinate of mouse pointer
 * @param {number} y - y-coordinate of mouse pointer
 */
function canvasMouseZoom(isin, mo, x, y) {
  let ratio = 0.75;
  if (isin) ratio = 1 / ratio;
  const view = mo.view;
  view.scale *= ratio;
  view.posX = x - (x - view.posX) * ratio;
  view.posY = y - (y - view.posY) * ratio;
  updateView(mo);
}


/**
 * Canvas zooming by touch.
 * @function canvasTouchZoom
 * @param {Object} mo - main object
 * @param {number} t - touches
 */
function canvasTouchZoom(mo, t) {
  const view = mo.view,
        stat = mo.stat,
        rena = mo.rena;
  const X = stat.touchX,
        Y = stat.touchY;

  // current xy coordinates of touches
  const newX = [t[0].clientX, t[1].clientX],
        newY = [t[0].clientY, t[1].clientY];

  // find midpoint of current touches
  const newMid = [(newX[0] + newX[1]) / 2, (newY[0] + newY[1]) / 2];

  // ratio of distances between old and new coordinates
  const dist = Math.sqrt(((X[0] - X[1]) / rena.width) ** 2 + ((
    Y[0] - Y[1]) / rena.height) ** 2);
  const newDist = Math.sqrt(((newX[0] - newX[1]) / rena.width) ** 2 + ((
    newY[0] - newY[1]) / rena.height) ** 2);
  const ratio = newDist / dist;

  // set old coordinates to be new coordinates
  X.splice(0, 2, ...newX);
  Y.splice(0, 2, ...newY);

  // updating view
  view.scale *= ratio;
  view.posX = newMid[0] - (newMid[0] - view.posX) * ratio;
  view.posY = newMid[1] - (newMid[1] - view.posY) * ratio;
  updateView(mo);
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
        rena = mo.rena;

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
    const x = ((e.offsetX - view.posX) / view.scale / rena.width + 0.5) *
      (view.x.max - view.x.min) + view.x.min;
    const y = view.y.max - ((e.offsetY - view.posY) / view.scale /
      rena.height + 0.5) * (view.y.max - view.y.min);
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
        rena = mo.rena;

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
    const w = rena.width,
          h = rena.height;

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
 * Calculate arena dimensions based on style and container.
 * @function calcArenaDimensions
 * @param {Object} mo - main object
 * @returns {[number, number]} - width and height of arena
 */
function calcArenaDimensions(mo) {
  const frame = byId('main-frame');
  const w = Math.max(mo.view.minW, frame.offsetWidth);
  const h = Math.max(mo.view.minH, frame.offsetHeight);
  return [w, h];
}



/**
 * Update canvas dimensions.
 * @function resizeArena
 * @param {Object} mo - main object
 * @description For an HTML5 canvas, (plot) and style width are two things.
 * @see {@link https://stackoverflow.com/questions/4938346/}
 */
function resizeArena(mo) {
  const rena = mo.rena,
        oray = mo.oray;
  const [w, h] = calcArenaDimensions(mo);

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

  // re-draw plots
  updateView(mo);
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
 * - Round numbers to integers.
 * - For small circles draw squares instead.
 * - Skip contigs outside the visible region.
 * 
 * @todo {@link https://stackoverflow.com/questions/21089959/}
 * 
 * @todo Rounding floats into integers improves performance. There are more
 * performant methods than the built-in `Math.round` function. Examples are
 * bitwise operations like `~~ (0.5 + num)`. However they don't work well
 * with negative numbers. In this case, x- and y-axis can be negative numbers.
 * 
 * A solution may be changing the way the canvas is positioned to make all
 * coordinates positive.
 * 
 * @todo Skipping contigs outside the visible region results in significant
 * performance gain when zooming in. However it voids another potential
 * optimization: draw the entire image (no matter how large it is) in an
 * off-screen canvas and draw part of it as needed to the main canvas using
 * `drawImage`. Needs further thinking.`
 */
function renderArena(mo) {
  const view = mo.view,
        rena = mo.rena,
        mask = mo.masked,
        high = mo.highed;
  let n = mo.cache.nctg;

  // prepare canvas context
  // note: origin (0, 0) is at the upper-left corner
  const ctx = rena.getContext('2d');

  // clear canvas
  const w = rena.width,
        h = rena.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // move to current position
  ctx.translate(view.posX, view.posY);

  // scale canvas
  const scale = view.scale;
  ctx.scale(scale, scale);

  // cannot render if there is no data, or no x- or y-axis
  if (!n || !view.x.i || !view.y.i) {
    ctx.restore();
    return;
  }

  // alternative: css scale, which is theoretically faster, but it blurs when
  // zoom in
  // rena.style.transformOrigin = '0 0';
  // rena.style.transform = 'scale(' + view.scale + ')';

  // cache constants
  const pi2 = Math.PI * 2,
        pi1_2 = Math.sqrt(Math.PI),
        min1 = Math.sqrt(1 / Math.PI),
        min2 = Math.sqrt(4 / Math.PI);

  // transformed data
  const trans = mo.trans;
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        C = trans.rgba;

  // calculate edges of visible region
  const vleft = -view.posX / scale,
        vright = (w - view.posX) / scale,
        vtop = -view.posY / scale,
        vbottom = (h - view.posY) / scale;

  // elements to be rendered, grouped by fill style, then by circle or square
  const paths = {};

  // intermediates
  let rad, vrad, x, y, fs, hi;

  // highlights
  const nhigh = HIGHLIGHT_PALETTE.length;
  const highs = Array(nhigh).fill().map(() => Array());
  const hirad = 8 / scale;

  // determine appearance of contigs
  for (let i = 0; i < n; i++) {
    if (mask[i]) continue;

    // determine radius (size)
    rad = S[i];
    vrad = rad * scale;

    // if contig occupies less than one pixel on screen, skip
    if (vrad < min1) continue;

    // determine x- and y-coordinates
    // skip contigs outside visible region
    // x = Math.round(X[i] * w);
    x = X[i] * w;
    x = x + (x > 0 ? 0.5 : -0.5) << 0;
    if (x + rad < vleft || x - rad > vright) continue;
    // y = Math.round(Y[i] * h);
    y = Y[i] * h;
    y = y + (y > 0 ? 0.5 : -0.5) << 0;
    if (y + rad < vtop || y - rad > vbottom) continue;

    // determine fill style (color and opacity)
    fs = `rgba(${C[i]})`;
    if (!(fs in paths)) paths[fs] = { 'square': [], 'circle': [] };

    // if a contig occupies less than four pixels on screen, draw a square
    if (vrad < min2) {
      // paths[fs].square.push([x, y, Math.round(rad * pi1_2)]);
      paths[fs].square.push([x, y, rad * pi1_2 + 0.5 << 0]);
    }

    // if bigger, draw a circle
    else {
      // paths[fs].circle.push([x, y, Math.round(rad)]);
      paths[fs].circle.push([x, y, rad + 0.5 << 0]);
    }

    // highlight circle
    hi = high[i];
    if (hi) {
      // highs[hi - 1].push([x, y, Math.round(rad + hirad)]);
      highs[hi - 1].push([x, y, rad + hirad + 0.5 << 0]);
    }
  } // end for i

  // render highlights
  let j, hs, m, hl;
  for (let i = 0; i < nhigh; i++) {
    hs = highs[i];
    m = hs.length;
    if (!m) continue;
    ctx.fillStyle = HIGHLIGHT_PALETTE[i] + '66'; // alpha = 0.4
    ctx.beginPath();
    for (j = 0; j < m; j++) {
      hl = hs[j];
      ctx.moveTo(hl[0], hl[1]);
      ctx.arc(hl[0], hl[1], hl[2], 0, pi2, true);
    }
    ctx.fill();
  }

  // render contigs
  let squares, sq, circles, circ;
  for (let fs in paths) {
    ctx.beginPath();

    // draw squares
    squares = paths[fs].square;
    n = squares.length;
    for (let i = 0; i < n; i++) {
      sq = squares[i];
      ctx.rect(sq[0], sq[1], sq[2], sq[2]);
    }

    // draw circles
    circles = paths[fs].circle;
    n = circles.length;
    for (let i = 0; i < n; i++) {
      circ = circles[i];
      ctx.moveTo(circ[0], circ[1]);
      ctx.arc(circ[0], circ[1], circ[2], 0, pi2, true);
    }

    // fill markers
    ctx.fillStyle = fs;
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
  const view = mo.view,
        oray = mo.oray,
        pick = mo.picked;
  const w = oray.width,
        h = oray.height;

  // clear overlay canvas
  const ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (mo.cache.npick === 0) return;
  const n = mo.cache.nctg;
  if (!n) return;

  // prepare canvas
  ctx.save();
  ctx.translate(view.posX, view.posY);
  ctx.scale(view.scale, view.scale);

  // define shadow style
  const color = mo.theme.selection;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10; // note: canvas shadow blur is expensive
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // cache data
  const trans = mo.trans;
  const X = trans.x,
        Y = trans.y,
        S = trans.size;
  const pi2 = Math.PI * 2;

  // render shadows around selected contigs
  let r, x, y;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (!pick[i]) continue;
    // r = Math.round(S[i]);
    r = S[i] + 0.5 << 0
    // x = Math.round(X[i] * w);
    x = X[i] * w;
    x = x + (x > 0 ? 0.5 : -0.5) << 0;
    // y = Math.round(Y[i] * h);
    y = Y[i] * h;
    y = y + (y > 0 ? 0.5 : -0.5) << 0;
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
        oray = mo.oray;
  const vertices = stat.polygon;
  const pi2 = Math.PI * 2;
  const radius = 5 / view.scale;
  const color = mo.theme.polygon;
  const ctx = oray.getContext('2d');
  ctx.clearRect(0, 0, oray.width, oray.height);
  ctx.save();
  ctx.translate(view.posX, view.posY);
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
 */
function drawGrid(rena, view) {
  const w = rena.width,
        h = rena.height;
  const scale = view.scale;
  const xmin = view.x.min,
        xmax = view.x.max,
        xran = xmax - xmin;
  const ymin = view.y.min,
        ymax = view.y.max,
        yran = ymax - ymin;

  // get viewport edges
  const vleft = -view.posX / scale,
        vright = (w - view.posX) / scale,
        vtop = -view.posY / scale,
        vbottom = (h - view.posY) / scale;

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

  // calculate best precisions
  const xdigits = Math.max(0, Math.ceil(-Math.log10((xticks[nxtick - 1] -
          xticks[0]) / (nxtick - 1)))),
        ydigits = Math.max(0, Math.ceil(-Math.log10((yticks[nytick - 1] -
          yticks[0]) / (nytick - 1))));

  // render vertical lines
  const ctx = rena.getContext('2d');
  ctx.strokeStyle = 'lightgray';
  ctx.lineWidth = 1 / scale;
  const xposes = [], xtickz = [];
  let xtick, xpos;
  for (let i = 0; i < nxtick; i++) {
    xtick = xticks[i];
    xpos = ((xtick - xmin) / xran - 0.5) * w;
    if (xpos < vleft) continue;
    if (xpos > vright) break;
    xposes.push(xpos);
    xtickz.push(xtick);
    ctx.moveTo(xpos, -h * 0.5);
    ctx.lineTo(xpos, h * 0.5);
  }

  // render horizontal lines
  const yposes = [], ytickz = [];
  let ytick, ypos;
  for (let i = 0; i < nytick; i++) {
    ytick = yticks[i];
    ypos = ((ymax - ytick) / yran - 0.5) * h;
    if (ypos > vbottom) continue;
    if (ypos < vtop) break;
    ctx.moveTo(-w * 0.5, ypos);
    ctx.lineTo(w * 0.5, ypos);
    yposes.push(ypos);
    ytickz.push(ytick);
  }
  ctx.stroke();

  // determine text label positions
  // i.e., the line closest to the middle of screen
  const xlabpos = xposes[Math.round(xposes.length / 2 - 1)],
        ylabpos = yposes[Math.round(yposes.length / 2 - 1)];

  // render text labels
  ctx.font = (1 / scale).toFixed(5) + 'em monospace';
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
        oray = mo.oray;

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
    const w = oray.width,
          h = oray.height;
    oray.getContext('2d').clearRect(0, 0, w, h);

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
