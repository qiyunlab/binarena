"use strict";

/**!
 * @module worker
 * @file Web worker to execute expensive rendering tasks.
 * @description This is a workaround to enable web worker execution from the
 * local filesystem. The worker code is wrapped in a function, which will be
 * stringified into a URL and passed to the worker-creating code.
 * @see {@link https://stackoverflow.com/questions/21408510/}
 */


/**
 * Web worker body
 * @function renderWorker
 */
function renderWorker() {

  // task identifier
  let painting = 0;

  // offscreen canvases
  let canvases = [];

  // graphics settings
  let highpal; // highlight color palette
  let selcol;  // selection shadow color

  // graphics data
  let data = {};
  const items = ['x', 'y', 'size', 'fses', 'mask', 'pick', 'high'];

  // event listener
  onmessage = function(e) {
    const edat = e.data;
    const msg = edat.msg;

    // get graphics settings
    if (msg === 'init') {
      highpal = edat.highpal;
      selcol = edat.selcol;
    }

    // reset global variables
    else if (msg === 'reset') {
      painting = 0;
      data = {};
      canvases = [];
    }

    // receive transferred data
    else if (msg === 'data') {
      for (const item of items) {
        if (item in edat) data[item] = edat[item];
      }
    }

    // add offscreen canvas
    else if (msg === 'add') {
      canvases.push({
        main: edat.main,
        sele: edat.sele,
        high: edat.high,
      });
    }

    // render main plot on offscreen canvas
    else if (msg === 'plot') {
      const target = canvases[edat.idx];
      painting = edat.uid;
      resizeCanvases(target, edat.w, edat.h);

      // call drawing function (async)
      drawPlotWork(target, ...edat.args, plot_done);

      // callback when drawing function completes
      function plot_done() {

        // this `requestAnimationFrame` trick can wait for drawing to complete,
        // otherwise the main thread may load a blank image if drawing is still
        // ongoing (discovered accidentally)
        requestAnimationFrame(function() {
          if (painting === edat.uid) postMessage(painting);
          else postMessage(0);
        });
      }
    }

    // render selection shadows on offscreen canvas
    else if (msg === 'sele') {
      painting = edat.uid;
      const canvas = canvases[edat.idx].sele;
      drawSeleWork(canvas, ...edat.args, sele_done);
      function sele_done() {
        requestAnimationFrame(function() {
          if (painting === edat.uid) postMessage(painting);
          else postMessage(0);
        });
      }
    }
  }


  /**
   * Draw main scatter plot using web worker.
   * @function drawPlotWork
   * @see drawPlotBack
   * @param {function} callback - callback function
   * @description Copied from render.js, with modifications. Instead of
   * returning a Promise, it uses setTimeout to achieve async, and triggers
   * a callback function when done.
   */
  function drawPlotWork(target, pltW, pltH, offX, offY, scale, callback) {
    const uid = painting;
    let canvas = target.main;
    let ctx = canvas.getContext('2d');
    const w = canvas.width,
          h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const pi2 = Math.PI * 2,
          min1 = Math.sqrt(1 / Math.PI);

    // get data (global to worker)
    const X = data.x,
          Y = data.y,
          S = data.size,
          F = data.fses,
          mask = data.mask,
          pick = data.pick,
          high = data.high;

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
    setTimeout(chunk, 1);

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
      if (painting !== uid) return;
      if (idx < n) setTimeout(chunk, 1);
      else setTimeout(fill_sele, 1);
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
      if (painting !== uid) return;
      else setTimeout(fill_high, 1);
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
      if (painting !== uid) return;
      else setTimeout(callback, 1);
    }
  }


  /**
   * Draw selection shadows using web worker.
   * @function drawSeleWork
   * @see drawSele
   * @description Copied from render.js, with adjustments.
   */
  function drawSeleWork(canvas, pltW, pltH, offX, offY, scale, callback) {
    const uid = painting;
    const ctx = canvas.getContext('2d');
    const w = canvas.width,
          h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.fillStyle = selcol;
    ctx.shadowColor = selcol;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const X = data.x,
          Y = data.y,
          S = data.size,
          mask = data.mask,
          pick = data.pick;
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
      if (painting !== uid) return;
      if (idx < n) setTimeout(chunk, 1);
      else setTimeout(function() {
        ctx.fill();
        ctx.restore();
        setTimeout(function() {
          if (painting !== uid) return;
          else callback();
        }, 1);
      }, 1);
    }
    setTimeout(chunk, 1);
  }


  /**
   * Resize all three canvases to given width and height.
   * @function resizeCanvases
   * @description Copied from plot.js.
   */
  function resizeCanvases(obj, w, h) {
    for (const key of ['main', 'sele', 'high']) {
      const canvas = obj[key];
      if (canvas.width != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
    }
  }
}

if (window != self) renderWorker();
