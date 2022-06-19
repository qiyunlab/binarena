"use strict";

/**!
 * @module render
 * @file Rendering engine from main scatter plot
 * @description It uses HTML5 canvas for rendering.
 */


/**
 * Add a new image set to cache.
 * @function addImageCache
 * @param {Array} images - cached image sets
 * @returns {number} array index
 * @description This function limits the maximum number of image sets.
 */
function addImageCache(images) {
  const maxlen = 5;
  if (images.length === maxlen) images.shift();
  const img = {
    'main': document.createElement('canvas'),
    'sele': document.createElement('canvas'),
    'high': document.createElement('canvas'),
    posX: 0, posY: 0, scale: 1, done: false
  }
  images.push(img);
  return img;
}


/**
 * Render arena given current data and view.
 * @function renderPlot
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
function renderPlot(mo, redo) {

  // cannot render if no data, no x- or no y-axis
  const view = mo.view;
  if (!mo.cache.nctg || !view.x.i || !view.y.i) {
    clearPlot(mo);
    return;
  }

  // will render something
  const plot = mo.plot,
        stat = mo.stat,
        images = mo.images;
  const w = plot.main.width,
        h = plot.main.height;
  const posX = plot.posX,
        posY = plot.posY,
        scale = plot.scale;

  // check of any of the cached image sets can be used
  let i, img, found = false;
  if (!redo) {
    for (i = images.length - 1; i >= 0; i--) {
      img = images[i];
      if (img.done && img.scale === scale &&
          img.posX >= posX && img.posX + w <= posX + img.main.width &&
          img.posY >= posY && img.posY + h <= posY + img.main.height) {
        found = true;
        break;
      }
    }
  }

  // if found, copy the proper region of the image set to canvases
  if (found) {

    // draw cached images to canvases
    for (const key of ['main', 'sele', 'high']) {
      let ctx = plot[key].getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img[key], img.posX - posX, img.posY - posY,
        w, h, 0, 0, w, h);
    }

    // draw grid (optional)
    if (view.grid) drawGrid(w, h, plot, view);
  }

  // if no cached image set matches, directly draw a new one on canvases,
  // then add a larger one to the cache in the background
  else {

    // directly draw on main plot canvas
    drawMain(plot, w, h, posX, posY, scale, mo.trans, mo.masked, mo.picked,
             mo.highed, mo.theme.selection, HIGHLIGHT_PALETTE);
    if (view.grid) drawGrid(w, h, plot, view);

    // a callback to update image cache
    function save_cache() {
      img.done = true;
      img.posX = posX + w;
      img.posY = posY + h;
      img.scale = scale;
      console.log('cached');
    }

    // set up a check point
    const uid = stat.painting = Date.now();

    // wait a bit before proceeding
    setTimeout(function() {

      // abort if there is a newer task
      // (so as to prevent too many caching operations when user is
      // dragging and scrolling)
      if (uid !== stat.painting) return;

      // start caching
      console.log('caching...');
      img = addImageCache(images);

      // cached image is 3x dimensions of plot area
      resizeCanvases(img, w * 3, h * 3);
      drawMainBg(img, w, h, posX + w, posY + h, scale, mo.trans, mo.masked,
                 mo.picked, mo.highed, mo.theme.selection, HIGHLIGHT_PALETTE,
                 stat, save_cache);
    }, 50);
  }
}


/**
 * Draw main scatter plot.
 * @function drawMain
 * @param {Object} target  - plot object
 * @param {number} pltW    - plot area width
 * @param {number} pltH    - plot area height
 * @param {number} offX    - x-axis offset
 * @param {number} offY    - y-axis offset
 * @param {number} scale   - scale factor
 * @param {Object} trans   - transformed data
 * @param {Array}  mask    - masked contigs
 * @param {Array}  pick    - selected contigs
 * @param {Array}  high    - highlighted contigs
 * @param {Array}  highpal - highlight palette
 * @param {string} selcol  - selection color
 */
 function drawMain(target, pltW, pltH, offX, offY, scale, trans, mask, pick,
  high, selcol, highpal) {

  // get main canvas context
  let canvas = target.main;
  let ctx = canvas.getContext('2d');

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
  const x_times = pltW * scale,
        y_times = pltH * scale;

  // cache offset
  const x_plus = offX + 0.5,
        y_plus = offY + 0.5;

  // selection
  const picks = [];

  // highlight
  const nhigh = highpal.length;
  const highs = Array(nhigh).fill().map(() => Array());

  // render contigs
  let i, j, m, I, x, y, r, hi;
  for (const f in F) {
    I = F[f];
    m = I.length;
    if (!m) continue;

    // iterate over indices
    ctx.beginPath();
    for (j = 0; j < m; j++) {
      i = I[j];

      // skip if masked
      if (mask[i]) continue;

      // determine radius (size; round to integer)
      r = S[i] * scale + 0.5 << 0;

      // skip if circle occupies less than one pixel on screen
      if (r < min1) continue;

      // determine x- and y-coordinates
      // skip contigs outside visible region
      x = X[i] * x_times + x_plus << 0;
      if (x + r < 0 || x - r > w) continue;
      y = Y[i] * y_times + y_plus << 0;
      if (y + r < 0 || y - r > h) continue;

      // draw circle
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, 0, pi2, true);

      // add to selection
      if (pick[i]) picks.push([x, y, r]);

      // add to highlight
      if (hi = high[i]) highs[hi - 1].push([x, y, r]);
    }

    // fill circles of current style
    ctx.fillStyle = f;
    ctx.fill();

  } // end for f

  // render selection shadows
  canvas = target.sele;
  ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  m = picks.length;
  if (m) {

    // define shadow style
    ctx.save();
    ctx.fillStyle = selcol;
    ctx.shadowColor = selcol;
    ctx.shadowBlur = 10; // note: canvas shadow blur is expensive
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // paint shadows around selected
    ctx.beginPath();
    let c;
    for (let i = 0; i < m; i++) {
      c = picks[i];
      ctx.moveTo(c[0], c[1]);
      ctx.arc(c[0], c[1], c[2], 0, pi2, true);
    }
    ctx.fill();
    ctx.restore();
  }

  // render highlight borders
  canvas = target.high;
  ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  let hs, c;
  r = 8 // highlight border width
  for (let i = 0; i < nhigh; i++) {
    hs = highs[i];
    m = hs.length;
    if (!m) continue;
    ctx.fillStyle = highpal[i] + '66'; // alpha = 0.4
    ctx.beginPath();
    for (j = 0; j < m; j++) {
      c = hs[j];
      ctx.moveTo(c[0], c[1]);
      ctx.arc(c[0], c[1], c[2] + r, 0, pi2, true);
    }
    ctx.fill();
  }

}


/**
 * Draw main scatter plot in background.
 * @function drawMainBg
 * @see drawMain
 * @param {object} stat - stat object
 * @param {function} callback - callback function
 */
function drawMainBg(target, pltW, pltH, offX, offY, scale, trans, mask, pick,
                    high, selcol, highpal, stat, callback) {
  const uid = stat.painting;
  let canvas = target.main;
  let ctx = canvas.getContext('2d');
  const w = canvas.width,
        h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const pi2 = Math.PI * 2,
        min1 = Math.sqrt(1 / Math.PI);
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        F = trans.fses;
  const x_times = pltW * scale,
        y_times = pltH * scale;
  const x_plus = offX + 0.5,
        y_plus = offY + 0.5;
  const picks = [];
  const nhigh = highpal.length;
  const highs = Array(nhigh).fill().map(() => Array());
  const fs = Object.keys(F);
  const n = fs.length;
  let f, i, j, m, I, x, y, r, hi;

  let idx = 0;
  requestIdleCallback(chunk);

  function chunk() {
    let cnt = 25; // chunk size (empirically determined)
    while (cnt-- && idx < n) {
      f = fs[idx];
      I = F[f];
      m = I.length;
      if (m) {
        ctx.beginPath();
        for (j = 0; j < m; j++) {
          i = I[j];
          if (mask[i]) continue;
          r = S[i] * scale + 0.5 << 0;
          if (r < min1) continue;
          x = X[i] * x_times + x_plus << 0;
          if (x + r < 0 || x - r > w) continue;
          y = Y[i] * y_times + y_plus << 0;
          if (y + r < 0 || y - r > h) continue;
          ctx.moveTo(x, y);
          ctx.arc(x, y, r, 0, pi2, true);
          if (pick[i]) picks.push([x, y, r]);
          if (hi = high[i]) highs[hi - 1].push([x, y, r]);
        }
        ctx.fillStyle = f;
        ctx.fill();
      }
      ++idx;
    } // end while

    // abort or move to next step
    if (stat.painting !== uid) return;
    if (idx < n) requestIdleCallback(chunk);
    else requestIdleCallback(fill_sele);
  } // end chunk

  // callback to fill selection shadows
  function fill_sele() {
    canvas = target.sele;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    m = picks.length;
    if (m) {
      ctx.save();
      ctx.fillStyle = selcol;
      ctx.shadowColor = selcol;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.beginPath();
      let c;
      for (let i = 0; i < m; i++) {
        c = picks[i];
        ctx.moveTo(c[0], c[1]);
        ctx.arc(c[0], c[1], c[2], 0, pi2, true);
      }
      ctx.fill();
      ctx.restore();
    }

    // abort or move to next step
    if (stat.painting !== uid) return;
    else requestIdleCallback(fill_high);
  }

  // callback to fill highlight borders
  function fill_high() {
    canvas = target.high;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    let hs, c;
    r = 8;
    for (let i = 0; i < nhigh; i++) {
      hs = highs[i];
      m = hs.length;
      if (m) {
        ctx.fillStyle = highpal[i] + '66';
        ctx.beginPath();
        for (j = 0; j < m; j++) {
          c = hs[j];
          ctx.moveTo(c[0], c[1]);
          ctx.arc(c[0], c[1], c[2] + r, 0, pi2, true);
        }
        ctx.fill();
      }
    }

    // abort or move to next step
    if (stat.painting !== uid) return;
    else requestIdleCallback(callback);
  }
}


/**
 * Render selection shadows only.
 * @function renderSelection
 * @param {Object} mo - main object
 * @see renderPlot
 */
function renderSelection(mo) {

  // mark cached images unusable
  const images = mo.images;
  for (const img of images) img.done = false;

  // no (selected) contigs
  if (!mo.cache.nctg || (mo.cache.npick === 0)) {
    clearPlot(mo, ['sele']);
    return;
  }

  const plot = mo.plot,
        stat = mo.stat;
  const posX = plot.posX,
        posY = plot.posY,
        scale = plot.scale;
  const canvas = plot.sele;
  const w = canvas.width,
        h = canvas.height;

  // directly draw on selection canvas
  drawSelection(canvas, w, h, posX, posY, scale, mo.trans, mo.masked,
                mo.picked, mo.theme.selection);

  // then modify cached images
  const uid = stat.painting = Date.now();
  setTimeout(function() {
    if (uid !== stat.painting) return;
    console.log('sele caching...');
    let img;
    for (let i = images.length - 1; i >= 0; i--) {
      img = images[i];
      function save_cache() {
        img.done = true;
        console.log(`sele cached ${i}`);
      }
      drawSelectionBg(img.sele, w, h, img.posX, img.posY, img.scale,
                      mo.trans, mo.masked, mo.picked, mo.theme.selection,
                      stat, save_cache);
    }
  }, 50);

}


/**
 * Draw selection shadows.
 * @function drawSelection
 * @param {Object} canvas - selection canvas
 * @param {number} pltW   - plot area width
 * @param {number} pltH   - plot area height
 * @param {number} offX   - x-axis offset
 * @param {number} offY   - y-axis offset
 * @param {number} scale  - scale factor
 * @param {Object} trans  - transformed data
 * @param {Array}  mask   - masked contigs
 * @param {Array}  pick   - selected contigs
 * @param {string} color  - shadow color
 * @description This function only draws selection shadows, therefore the
 * process is faster than drawing everything, and the algorithm is optimized
 * accordingly (iterating over all data instead of grouped data).
 * @see drawMain
 */
function drawSelection(canvas, pltW, pltH, offX, offY, scale,
                       trans, mask, pick, color) {
  const ctx = canvas.getContext('2d');
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
  const x_times = pltW * scale,
        y_times = pltH * scale;
  const x_plus = offX + 0.5,
        y_plus = offY + 0.5;
  const pi2 = Math.PI * 2;

  // render shadows around selected contigs
  let r, x, y;
  ctx.beginPath();
  const n = pick.length;
  for (let i = 0; i < n; i++) {
    if (!pick[i]) continue;
    if (mask[i]) continue;
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
 * Draw selection shadows in background.
 * @function drawSelectionBg
 * @see drawSelection 
 * @param {object} stat - stat object
 * @param {function} callback - callback function
 */
function drawSelectionBg(canvas, pltW, pltH, offX, offY, scale,
                         trans, mask, pick, color, stat, callback) {
  const uid = stat.painting;
  const ctx = canvas.getContext('2d');
  const w = canvas.width,
        h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const X = trans.x,
        Y = trans.y,
        S = trans.size;
  const x_times = pltW * scale,
        y_times = pltH * scale;
  const x_plus = offX + 0.5,
        y_plus = offY + 0.5;
  const pi2 = Math.PI * 2;
  let i, r, x, y;
  ctx.beginPath();
  const n = pick.length;
  let idx = 0;
  function chunk() {
    let cnt = 1000;
    while (cnt-- && idx < n) {
      i = idx++;
      if (!pick[i]) continue;
      if (mask[i]) continue;
      r = S[i] * scale + 0.5 << 0;
      x = X[i] * x_times + x_plus << 0;
      if (x + r < 0 || x - r > w) continue;
      y = Y[i] * y_times + y_plus << 0;
      if (y + r < 0 || y - r > h) continue;
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, 0, pi2, true);
    }
    if (stat.painting !== uid) return;
    if (idx < n) requestIdleCallback(chunk);
    else requestIdleCallback(function() {
      ctx.fill();
      ctx.restore();
      requestIdleCallback(callback);
    });
  }
  requestIdleCallback(chunk);
}


/**
 * Render arena given current data and view.
 * @function renderPlot
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
// function renderPlot(mo, redo) {
//   const view = mo.view,
//         plot = mo.plot,
//         stat = mo.stat;
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

//   // a callback to paint cached paths, to be called by background tracer
//   function painter() {
//     pathToPlot(mo.offs, w * 2, h * 2, paths.main, paths.high,
//       -w / 2, -h / 2, 1, HIGHLIGHT_PALETTE);
//     mo.images = [mo.offs, null, posX + w / 2, posY + h / 2, scale];
//   }

//   // check cached image
//   // if no cached image matches, draw a new one
//   let img = mo.images;
//   if (redo || img === null || img[4] !== scale ||
//       img[2] - posX < 0 || img[2] - posX + w > img[0].width ||
//       img[3] - posY < 0 || img[3] - posY + h > img[0].height) {

//     let posXp = paths.posX,
//         posYp = paths.posY;

//     // relative scale (from paths to image)
//     let rs = scale / paths.scale;

//     // check cached paths
//     // if paths don't match, trace new paths
//     // because painting is expensive, it will be executed in the background,
//     // while the plot is directly and independently rendered to canvas
//     if (redo || paths.main === null ||
//         posX > posXp * rs || (w - posX) > (w * 3 - posXp) * rs ||
//         posY > posYp * rs || (h - posY) > (h * 3 - posYp) * rs) {

//       // directly render main canvas
//       drawMain(plot, posX, posY, scale, 0, 0, mo.trans, mo.masked,
//         mo.highed, HIGHLIGHT_PALETTE);
//       if (view.grid) drawGrid(ctx, w, h, view);

//       // trace paths in background (3x dimension)
//       console.log('painting...');
//       stat.painting = Date.now();
//       traceMainBg(w, h, posX, posY, scale, 1, mo.trans, mo.masked, paths, stat,
//                   painter);
//       return;
//     }

//     // paint off-screen canvas (2x dimension)
//     console.log('painting...');
//     pathToPlot(mo.offs, w * 2, h * 2, paths.main, paths.high,
//               posX + w / 2 - posXp * rs, posY + h / 2 - posYp * rs,
//               rs, HIGHLIGHT_PALETTE);

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
 * Render arena given current data and view.
 * @function renderPlot
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
// function renderPlotY(mo, redo) {
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
//       console.log('painting...');
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
 * Render arena given current data and view.
 * @function renderPlot
 * @param {Object} mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 */
// function renderPlotX(mo, redo) {
//   const view = mo.view,
//         rena = mo.rena;

//   // get canvas context
//   const ctx = rena.getContext('2d');

//   // cannot render if no data, or no x- or y-axis
//   const w = rena.width,
//         h = rena.height;
//   if (!mo.cache.nctg || !view.x.i || !view.y.i) {
//     ctx.clearRect(0, 0, w, h);
//     return;
//   }

//   // determine position of canvas
//   const posX = view.posX,
//         posY = view.posY,
//         offX = view.offX,
//         offY = view.offY,
//         scale = view.scale;
//   if (redo || !view.mainoff ||
//       posX < offX - w || posX > offX + w ||
//       posY < offY - h || posY > offY + h) {
//     view.mainoff = false;

//     // directly render main arena
//     drawMain(rena, posX, posY, scale, 0, 0, mo.trans, mo.masked,
//              mo.highed, HIGHLIGHT_PALETTE);

//     // then cache a larger region in an offscreen canvas
//     // view.offX = posX;
//     // view.offY = posY;
//     // mo.worker.postMessage({msg: 'main', params: [
//     //   posX, posY, scale, w, h, mo.trans, mo.masked, mo.highed]});
//   }

//   // otherwise, directly transfer cached image
//   else {
//     ctx.clearRect(0, 0, w, h);
//     ctx.drawImage(rena.offs, offX - posX + w, offY - posY + h,
//       w, h, 0, 0, w, h);
//   }

//   // (optional) draw grid
//   if (view.grid) drawGrid(ctx, w, h, view);
// }


/**
 * Render polygon drawn by user.
 * @function drawPolygon
 * @param {Object} mo - main object
 * @see renderPlot
 */
function drawPolygon(mo) {
  const plot = mo.plot,
        stat = mo.stat;
  const canvas = plot.sele;
  const vertices = stat.polygon;
  const pi2 = Math.PI * 2;
  const radius = 5;
  const color = mo.theme.polygon;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const posX = plot.posX,
        posY = plot.posY,
        scale = plot.scale;
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
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 * @param {Object} plot - plot object
 * @param {Object} view - view object
 */
function drawGrid(w, h, plot, view) {
  const ctx = plot.main.getContext('2d');
  const posX = plot.posX,
        posY = plot.posY,
        scale = plot.scale;
  const ww = w * scale,
        hh = h * scale;
  const xmin = view.x.min,
        xmax = view.x.max,
        xran = xmax - xmin;
  const ymin = view.y.min,
        ymax = view.y.max,
        yran = ymax - ymin;

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
  const stat = mo.stat;
  const canvas = mo.plot.sele;

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
    const w = canvas.width,
          h = canvas.height;
    canvas.getContext('2d').clearRect(0, 0, w, h);

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
