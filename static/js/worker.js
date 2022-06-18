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
  // let rena;    // offscreen main plot
  let olay;    // offscreen overlay
  let highpal; // highlight color palette
  let shadcol; // selection shadow color

  onmessage = function(e) {

    // transfer canvas ownership
    if (e.data.msg === 'init') {
      rena = e.data.rena;
      olay = e.data.olay;
      highpal = e.data.highpal;
      shadcol = e.data.shadcol;
    }

    // render main plot on offscreen canvas
    else if (e.data.msg === 'main') {
      const [posX, posY, scale, w, h, trans, mask, high] = e.data.params;
      const canvas = new OffscreenCanvas(w * 3, h * 3);
      // if (rena.width !== w * 3) rena.width = w * 3;
      // if (rena.height !== h * 3) rena.height = h * 3;
      drawMain(canvas, posX, posY, scale, w, h, trans, mask, high, highpal);
      const bitmap = canvas.transferToImageBitmap();
      postMessage({msg: 'main', bitmap});
    }

    // render selection shadows on offscreen canvas
    else if (e.data.msg === 'shad') {
      const [posX, posY, scale, w, h, trans, pick] = e.data.params;
      if (olay.width !== w * 3) olay.width = w * 3;
      if (olay.height !== h * 3) olay.height = h * 3;
      drawShad(olay, posX, posY, scale, w, h, trans, pick, shadcol);
      postMessage({msg: 'shad'});
    }
  }

  // copied from render.js
  function drawMain(canvas, posX, posY, scale, offX, offY,
                    trans, mask, high, highpal) {

    const ctx = canvas.getContext('2d');
    const w = canvas.width,
          h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const pi2 = Math.PI * 2,
    min1 = Math.sqrt(1 / Math.PI);
    const X = trans.x,
          Y = trans.y,
          S = trans.size,
          C = trans.rgba;
    const x_times = (w - 2 * offX) * scale,
          y_times = (h - 2 * offY) * scale;
    const x_plus = posX + offX + 0.5,
          y_plus = posY + offY + 0.5;
    const paths = {};
    const nhigh = highpal.length;
    const highs = Array(nhigh).fill().map(() => Array());
    const hirad = 8;

    let r, x, y, fs, hi;
    const n = mask.length;
    for (let i = 0; i < n; i++) {
      if (mask[i]) continue;
      r = S[i] * scale + 0.5 << 0;
      if (r < min1) continue;
      x = X[i] * x_times + x_plus << 0;
      if (x + r < 0 || x - r > w) continue;
      y = Y[i] * y_times + y_plus << 0;
      if (y + r < 0 || y - r > h) continue;
      fs = `rgba(${C[i]})`;
      if (!(fs in paths)) paths[fs] = [];
      paths[fs].push([x, y, r]);
      hi = high[i];
      if (hi) highs[hi - 1].push([x, y, r + hirad]);
    }

    let j, hs, m, hl;
    for (let i = 0; i < nhigh; i++) {
      hs = highs[i];
      m = hs.length;
      if (!m) continue;
      ctx.fillStyle = highpal[i] + '66';
      ctx.beginPath();
      for (j = 0; j < m; j++) {
        hl = hs[j];
        ctx.moveTo(hl[0], hl[1]);
        ctx.arc(hl[0], hl[1], hl[2], 0, pi2, true);
      }
      ctx.fill();
    }

    let circs, circ;
    for (let fs in paths) {
      ctx.beginPath();
      circs = paths[fs];
      m = circs.length;
      for (let i = 0; i < m; i++) {
        circ = circs[i];
        ctx.moveTo(circ[0], circ[1]);
        ctx.arc(circ[0], circ[1], circ[2], 0, pi2, true);
      }
      ctx.fillStyle = fs;
      ctx.fill();
    }
  }

  // copied from render.js
  function drawShad(canvas, posX, posY, scale, offX, offY, trans,
                    pick, color) {
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
    const pi2 = Math.PI * 2;
    const x_times = (w - 2 * offX) * scale,
          y_times = (h - 2 * offY) * scale;
    const x_plus = posX + offX + 0.5,
          y_plus = posY + offY + 0.5;
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

}

if (window != self) renderWorker();
