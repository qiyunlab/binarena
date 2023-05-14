"use strict";

/**!
 * @module render
 * @file Rendering engine for main scatter plot
 * @description It uses HTML5 canvas for rendering.
 */


/**
 * Render main plot given current data and view.
 * @function renderPlot
 * @param {Object}   mo - main object
 * @param {boolean} [redo=] - force redrawing instead of using cached image
 * @param {boolean} [wait=] - wait a bit before starting image caching task
 * @description This is the main rendering engine. It receives the position
 * and scale of the current viewport, then checks whether any of the cached
 * images cover this region, and uses it if so, or draw a new one otherwise.
 * Meanwhile, it attempts to cache new images around the viewport (position
 * and scale) if they are not already in the cache.
 */
function renderPlot(mo, redo, wait) {

  // quit if no data, no x- or no y-axis
  const view = mo.view;
  if (!mo.cache.nctg || !view.x.i || !view.y.i) {
    clearPlot(mo.plot);
    return;
  }

  const plot = mo.plot,
        stat = mo.stat,
        images = mo.images,
        work = mo.work.draw;
  const w = plot.main.width,
        h = plot.main.height;
  const posX = plot.posX,
        posY = plot.posY,
        scale = plot.scale;

  // to find a cahced image
  let img;

  // if forced redrawing, signal current caching tasks (if any) to stop,
  // then clear all cached images (if any), 
  if (redo) {
    stat.painting = 0;
    for (let i = 0; i < images.length; i++) {
      images[i].uid = 0;
      images[i].done = false;
    }
  }

  // check of any of the cached images can be used
  else img = checkImageCache(images, w, h, posX, posY, scale);

  // arguments to pass to drawing function
  const args = [w, h, posX, posY, scale, mo.trans, mo.masked, mo.picked,
    mo.highed, mo.theme.selection, HIGHLIGHT_PALETTE];

  // if no image matches, directly draw a new one on canvas, then start to
  // cache extra images in the background based on current viewport
  if (!img) {

    // directly draw on main plot canvas
    drawPlot(plot, ...args);

    // draw grid (optional)
    if (view.grid) drawGrid(w, h, plot, view);

    // start to cache extra images
    cacheImages(images, args, stat, wait, work, 4);
  }

  // if found, copy the proper region of the image to canvas
  else {

    // draw cached images to canvases
    for (const key of ['main', 'sele', 'high']) {
      let ctx = plot[key].getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img[key], img.posX - posX, img.posY - posY,
                    w, h, 0, 0, w, h);

      // to-do: skip if target image is empty
      // https://stackoverflow.com/questions/17386707/
    }
    if (view.grid) drawGrid(w, h, plot, view);

    // check cached images again; if current viewport is too close to the
    // edge of any cached image, start to cache extra images
    img = checkImageCache(
      images, w * 2, h * 2, posX + w / 2, posY + h / 2, scale);
    if (!img) cacheImages(images, args, stat, wait, work, 2);
  }
}


/**
 * Check if any of the cached images contains current view.
 * @function checkImageCache
 * @param {Array}  images - images
 * @param {number} w      - plot width
 * @param {number} h      - plot height
 * @param {number} posX   - offset x
 * @param {number} posY   - offset y
 * @param {number} scale  - scale factor
 * @returns {Object} - matched image if found
 */
function checkImageCache(images, w, h, posX, posY, scale) {
  let img, dists;

  // iterate in reverse order (most recent first)
  for (let i = images.length - 1; i >= 0; i--) {
    img = images[i];
    if (img.done && img.scale === scale) {
      dists = imageEdgeDist(
        img.w, img.h, img.posX, img.posY, w, h, posX, posY);
      if (Math.min(...dists) > 0) return img;
    }
  }
}


/**
 * Calculate distances between edges of source and target images.
 * @function imageEdgeDist
 * @param {number} sw - source image width
 * @param {number} sh - source image height
 * @param {number} sx - source image offset x
 * @param {number} sy - source image offset y
 * @param {number} tw - target image width
 * @param {number} th - target image height
 * @param {number} tx - target image offset x
 * @param {number} ty - target image offset y
 * @returns {[number, number, number, number]} - left, right, top and bottom
 * distances from source image to target image
 * @description This function helps to check whether source image contains
 * target image. If all four distances are positive or zero, then the result
 * is true.
 */
function imageEdgeDist(sw, sh, sx, sy, tw, th, tx, ty) {
  const left = sx - tx, right = sw - tw + tx - sx,
        top = sy - ty, bottom = sh - th + ty - sy;
  return [left, right, top, bottom];
}


/**
 * Draw extra images and store in cache for future use.
 * @function cacheImages
 * @param {Array}   images      - images
 * @param {Array}   args        - arguments to pass to drawer
 * @param {Object}  stat        - stat object
 * @param {boolean} wait        - wait a bit before caching
 * @param {Worker}  work        - web worker for rendering
 * @param {number}  [n=1]       - maximum image number
 * @param {number}  [mar=1]     - margin factor
 * @param {number}  [zoom=0.75] - zooming factor
 * 
 * @description `args` contains the following values:
 * w, h, posX, posY, scale, trans, masked, picked, highed, selcol, highpal
 * 
 * @description It has a priority list to decide which view of image is to
 * be cached first. Specifically:
 * 
 * 1. current scale, larger dimension (adding margin)
 * 2. larger scale (zooming in), but no more than 20x original scale
 *    (same below), same dimension as 1 (same below)
 * 3. smaller scale (zooming out), but no less than original scale
 *    (same below)
 * 4. even larger scale (zooming in twice)
 * 5. ever smaller scale (zooming out twice)
 * 
 * ...so on so forth, but:
 * - skip if another cached image is of the same scale and contains the
 *   view with 1/2 margin
 * - stop if maximum number is reached
 */
function cacheImages(images, args, stat, wait, work, n, mar, zoom) {
  n = n || 1;
  mar = mar || 1;
  zoom = zoom || 0.75;

  // set up a check point
  const uid = stat.painting = uniqId();

  // wait a bit before proceeding
  requestIdleCallback(async function() {

    // abort if there is a newer task
    // so as to prevent too many caching operations when user is
    // dragging and scrolling
    if (uid !== stat.painting) return;

    // further wait for 0.25 sec (same reason as above)
    if (wait) {
      await new Promise(r => setTimeout(r, 250));
      if (uid !== stat.painting) return;
    }

    // plot area width and height
    const [w, h, posX, posY, scale] = args.slice(0, 5);

    // add margin to image
    const marX = w * mar, marY = h * mar;
    const marXr = Math.round(marX), marYr = Math.round(marY);
    const posXNow = args[2] = posX + marXr,
          posYNow = args[3] = posY + marYr;
    const wNow = w + marXr * 2, hNow = h + marYr * 2;

    // dimensions for image overlap checking (1/2 margin)
    const w2 = w + marXr,
          h2 = h + marYr;
    const x2 = posX + Math.round(marX / 2),
          y2 = posY + Math.round(marY / 2);

    let cnt = 0;
    let numZoom = 0, zoomOut = false;

    // start caching a series of images...
    while (cnt < n) {

      // calculate current scale
      // use sequential multiplications instead of power in order to avoid
      // floating-point error
      let scaleNow = scale;
      if (numZoom) {
        const r = zoomOut ? zoom : 1 / zoom;
        for (let i = 0; i < numZoom; i++) scaleNow *= r;
      }

      // update status
      zoomOut = !zoomOut;
      numZoom += zoomOut & 1;

      // check if scale is too large or too small
      if (scaleNow < 1) continue;
      if (scaleNow > 20) break;

      // check if any cached image already contains the view
      if (checkImageCache(images, w2, h2, x2, y2, scaleNow)) continue;

      // create a new image in cache
      const [img, idx] = addImageToCache(images, work);

      // set image dimensions
      img.uid = uid;
      img.w = wNow;
      img.h = hNow;
      img.posX = posXNow;
      img.posY = posYNow;
      img.scale = scaleNow;

      // draw image in background
      args[4] = scaleNow;

      let res;

      // use a web worker (if applicable) to draw image
      if (work) res = await callDrawPlot(
        work, idx, img.iid, uid, wNow, hNow, args.slice(0, 5));

      // otherwise, draw image using main thread when it's idle
      else {
        resizeCanvases(img, wNow, hNow);
        res = await drawPlotBack(img, ...args, uid, stat);
      }

      // if timeout but task Id is still the same, clear it
      if (res === -1) { if (img.uid === uid) { img.uid = 0; } return; }

      // if another task did it (i.e., a conflict), mark image as not ready
      if (img.done) { img.done = false; return; }

      // if aborted, terminate the entire process
      if (res === 0) { img.uid = 0; return; }

      // if another task is doing it (conflict), mark not ready
      if (res !== img.uid) { img.uid = 0; return; }

      // if completed, mark image as ready
      img.done = true;
      img.uid = 0;

      // counter increases
      cnt++;
    }

    // reset task identifier (if not modified by another task)
    if (uid === stat.painting) stat.painting = 0;
  });
}


/**
 * Generate a unique-enough identifier.
 * @function uniqId
 * @returns {string} unique identifier
 * @see {@link: https://stackoverflow.com/questions/8012002/}
 */
function uniqId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
};


/**
 * Add a new image to cache.
 * @function addImageToCache
 * @param {Array} images - cached images
 * @returns {[Object, number]} added image and its array index
 * @description This function limits the maximum number of images.
 */
function addImageToCache(images, work) {
  const maxlen = 10; // store up to 10 images
  let iid, img;

  const n = images.length;
  let maxIid = 0, minIid = 0
  let maxI, minI;

  // find largest (newest) and smallest (oldest) Ids
  if (n) {
    maxIid = minIid = images[0].iid;
    maxI = minI = 0;
    for (let i = 1; i < n; i++) {
      iid = images[i].iid;
      if (iid > maxIid) {
        maxIid = iid;
        maxI = i
      }
      if (iid < minIid) {
        minIid = iid;
        minI = i
      }
    }
  }

  // if array not full yet, create new image
  if (n < maxlen) {

    // initiate new image (increment index by 1)
    img = {
      iid: maxIid + 1, uid: 0, done: false,
      main: document.createElement('canvas'),
      sele: document.createElement('canvas'),
      high: document.createElement('canvas'),
      w: 0, h: 0, posX: 0, posY: 0, scale: 1
    }

    // transfer control to offscreen (if applicable)
    if (work) {
      img.main.offs = img.main.transferControlToOffscreen();
      img.sele.offs = img.sele.transferControlToOffscreen();
      img.high.offs = img.high.transferControlToOffscreen();
      work.postMessage({
        msg: 'add',
        main: img.main.offs,
        sele: img.sele.offs,
        high: img.high.offs,
      }, [img.main.offs, img.sele.offs, img.high.offs]);
    }

    // append to image array
    images.push(img);
    return [img, n];
  }

  // otherwise, use the oldest slot
  else {
    img = images[minI];
    img.iid = maxIid + 1;
    img.uid = 0;
    img.done = false;
    return [img, minI];
  }
}


/**
 * Call web worker to draw plot.
 * @function callDrawPlot
 * @param {Worker} work - web worker
 * @param {number} idx - target image index
 * @param {number} iid - target image identifier
 * @param {number} uid - unique task identifier
 * @param {Array} args - plot parameters
 * @returns {Promise} completed (uid) or aborted (0) or timeout (-1)
 * @description It triggers the drawing task in the worker, then wait for the
 * worker to complete (or abort).
 * @see {@link: https://stackoverflow.com/questions/41423905/}
 * @description It waits for 10 sec for the task to complete, otherwise stop
 * @see {@link: https://advancedweb.hu/how-to-add-timeout-to-a-promise-in-
 * javascript/}
 */
function callDrawPlot(work, idx, iid, uid, w, h, args) {
  let timer;
  return Promise.race([
    new Promise(resolve => {
      work.postMessage({
        msg: 'plot',
        idx: idx,
        iid: iid,
        uid: uid,
        w: w,
        h: h,
        args: args
      });
      work.onmessage = e => resolve(e.data);
      work.onerror = () => resolve(0);
    }),
    new Promise(r => timer = setTimeout(() => r(-1), 10000))
  ]).finally(() => clearTimeout(timer));
}


/**
 * Draw main scatter plot.
 * @function drawPlot
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
 * @param {string} selcol  - selection color 
 * @param {Array}  highpal - highlight palette
 * @description This is the main function for drawing the plot. It parses
 * pre-transformed data and draws on three canvases: main scatter plot,
 * selection shadows, and highlight borders. The process has been optimized
 * to maximize efficient. This function has several variants (see below).
 */
function drawPlot(target, pltW, pltH, offX, offY, scale, trans,
                  mask, pick, high, selcol, highpal) {

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
  // `x + 0.5 << 0` is a faster way to round a positive number to integer
  // compared with `Math.round`;
  const x_plus = offX + 0.5,
        y_plus = offY + 0.5;

  // selection
  const picks = [];

  // highlight
  const nhigh = highpal.length;
  const highs = Array(nhigh).fill().map(() => Array());

  // render data points grouped by fill style (RGBA)
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
      // skip if circle is outside visible region
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
 * Draw main scatter plot in the background.
 * @function drawPlotBack
 * @see drawPlot
 * @param {number} uid - unique task identifier
 * @param {Object} stat - stat object
 * @returns {Promise} completed (uid) or aborted (0)
 */
function drawPlotBack(target, pltW, pltH, offX, offY, scale, trans, mask,
                      pick, high, selcol, highpal, uid, stat) {
  return new Promise(resolve => {
    if (stat.painting !== uid) resolve(0);
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

    // perform rendering by chunk
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
      if (stat.painting !== uid) resolve(0);
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
      if (stat.painting !== uid) resolve(0);
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

      // abort or complete task
      if (stat.painting !== uid) resolve(0);
      else resolve(uid);
    }
  });
}


/**
 * Render selection shadows only.
 * @function renderSele
 * @param {Object} mo - main object
 * @see renderPlot
 * @description This function should be called only when selection changes
 * but others stay the same.
 */
function renderSele(mo) {

  // iterate over cached images, record ones that are ready, as they will be
  // updated below, meanwhile mark them not ready
  const images = mo.images;
  const ready = new Set();
  let img;
  for (let i = images.length - 1; i >= 0; i--) {
    img = images[i];
    if (img.done) {
      ready.add(i);
      img.done = false;
    }
    if (img.uid) img.uid = 0;
  }

  // start to render selection
  const plot = mo.plot,
        stat = mo.stat;
  const posX = plot.posX,
        posY = plot.posY,
        scale = plot.scale;
  const canvas = plot.sele;
  const w = canvas.width,
        h = canvas.height;
  const args = [w, h, posX, posY, scale, mo.trans, mo.masked, mo.picked,
                mo.theme.selection];

  // directly draw on selection canvas
  drawSele(canvas, ...args);

  // then modify cached images
  const uid = stat.painting = uniqId();
  requestIdleCallback(async function() {
    if (uid !== stat.painting) return;
    const work = mo.work.draw;
    for (let i = images.length - 1; i >= 0; i--) {
      if (!ready.has(i)) continue;
      img = images[i];
      img.uid = uid;
      args[2] = img.posX;
      args[3] = img.posY;
      args[4] = img.scale;
      let res;
      if (work) res = await new Promise(resolve => {
        work.postMessage({
          msg: 'sele', uid: uid, idx: i, args: args.slice(0, 5)});
        work.onmessage = e => resolve(e.data);
        work.onerror = () => resolve(0);
      });
      else res = await drawSeleBack(img.sele, ...args, uid, stat);
      if (res === -1) { if (img.uid === uid) { img.uid = 0; } return; }
      if (img.done) { img.done = false; return; }
      if (res === 0) { img.uid = 0; return; }
      if (res !== img.uid) { img.uid = 0; return; }
      img.uid = 0;
      img.done = true;
    }
  });
}


/**
 * Draw selection shadows.
 * @function drawSele
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
 * @see drawPlot
 */
function drawSele(canvas, pltW, pltH, offX, offY, scale,
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
 * @function drawSeleBack
 * @see drawSele
 * @param {number} uid - unique task identifier
 * @param {Object} stat - stat object
 * @returns {Promise} completed (uid) or aborted (0) or timeout (-1)
 */
function drawSeleBack(canvas, pltW, pltH, offX, offY, scale, trans,
                      mask, pick, color, uid, stat) {
  let timer;
  return Promise.race([new Promise(resolve => {
    if (stat.painting !== uid) resolve(0);
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
      let cnt = 10000; // chunk size: 10k
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
      if (stat.painting !== uid) resolve(0);
      if (idx < n) requestIdleCallback(chunk);
      else requestIdleCallback(function() {
        ctx.fill();
        ctx.restore();
        requestIdleCallback(function() {
          if (stat.painting !== uid) resolve(0);
          else resolve(uid);
        });
      });
    }
    requestIdleCallback(chunk);
  }), new Promise(r => timer = setTimeout(() => r(-1), 10000))
    ]).finally(() => clearTimeout(timer));
}


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


/**
 * Take a screenshot and export as a PNG image.
 * @function exportPNG
 * @param {Object} mo - main object
 * @description It stacks all three canvases before exporting.
 */
function exportPNG(mo) {
  const plot = mo.plot;
  const canvas = plot.offs;
  const w = plot.main.width,
        h = plot.main.height;
  if (canvas.width != w) canvas.width = w;
  if (canvas.height != h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(plot.high, 0, 0);
  ctx.drawImage(plot.sele, 0, 0);
  ctx.drawImage(plot.main, 0, 0);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
