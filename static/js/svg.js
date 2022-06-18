
/**
 * Generate and export an SVG image of the current view.
 * @function renderSVG
 * @param {Object} mo - main object
 * @param {string[]} legs - legends to plot
 * @description This is an independent rendering enginer that is in parallel
 * to the HTML5 canvas rendering engine. It aims at reproducing what the
 * latter is capturing.
 */
function renderSVG(mo, legs) {
  legs = legs || ['size', 'opacity', 'color'];

  // figure flavors
  const pmar = 10,    // plot margin
        xlabh = 30,   // horizontal space for x-axis ticks and labels
        ylabw = 40,   // vertical space for y-axis ticks and labels
        labfs = 14,   // axis and legend label font size (px)
        ticklen = 5,  // tick length
        tickgap = 50, // appr. gap between ticks
        tickfs = 12,  // tick label font size (px)
        minticks = 5, // minimum tick number
        legmar = 10,  // legend margin
        legpad = 10,  // legend padding
        legw = 180,   // legend width
        colr = 6,     // color marker radius
        colgap = 6,   // color row gap
        clabfs = 13;  // color label font size (px)

  // create SVG (array of lines)
  let svg = [];


  /** 
   * Determine plot dimension and transformation.
   */

  // canvas size
  const plot = mo.plot;
  const w = plot.width,
        h = plot.height;

  // image scale and offset
  const view = mo.view;
  const scale = view.scale;
  let scaleX = w * scale,
      scaleY = h * scale;
  let offsetX = view.posX,
      offsetY = view.posY;

  // get data range
  let xmin = view.x.min,
      xmax = view.x.max,
      ymin = view.y.min,
      ymax = view.y.max;
  let xran = xmax - xmin,
      yran = ymax - ymin;

  // get visible data range
  // note: this calculation is quite confusion; below is an illustration
  // to help thinking:

  // default:
  //     min                  max
  //   ---|--------------------|---  data
  //   ---0----------|---------w---  scale = 1, offset = 1/2 w
  //               offset
  
  // zoom in 2x:
  //     min                  max
  //   ---|--------------------|---  data
  //   --------0-----|-----w-------  scale = 2, offset = 1/2 w
  //          vmin        vmax
  
  // then move left 1/4 screen:
  //     min                  max
  //   ---|--------------------|---  data
  //   --------0--[-----|--w--]----  scale = 2, offset = 3/4 w
  //             vmin        vmax

  xmin += xran * (0.5 - offsetX / scaleX),
  xmax = xmin + xran / scale;
  ymax -= yran * (0.5 - offsetY / scaleY),
  ymin = ymax - yran / scale;

  // determine tick density
  const nxbin = Math.max(Math.ceil(w / tickgap), minticks),
        nybin = Math.max(Math.ceil(h / tickgap), minticks);

  // determine tick positions
  const xticks = getTicks(xmin, xmax, nxbin),
        yticks = getTicks(ymin, ymax, nybin);
  const nxtick = xticks.length,
        nytick = yticks.length;

  // determine data range in plot (from 1st tick to last tick)
  let xminp = xticks[0],
      xmaxp = xticks[nxtick - 1],
      yminp = yticks[0],
      ymaxp = yticks[nytick - 1];
  let xranp = xmaxp - xminp,
      yranp = ymaxp - yminp;

  // update offsets (moves from min to 1st tick)
  offsetX += (xmin - xminp) / xran * scaleX;
  offsetY += (ymaxp - ymax) / yran * scaleY;

  // determine plot area size
  const wp = scaleX * xranp / xran,
        hp = scaleY * yranp / yran;

  // determine tick label precision
  const xdigits = Math.max(0, Math.ceil(-Math.log10(xranp / (nxtick - 1)))),
        ydigits = Math.max(0, Math.ceil(-Math.log10(yranp / (nytick - 1))));

  // create figure
  svg.push('<svg version="1.1"' +
    ` width="${Math.round(wp + pmar * 2 + ylabw)}" ` +
    `height="${Math.round(hp + pmar * 2 + xlabh)}" ` +
    'xmlns="http://www.w3.org/2000/svg">');

  // specify font
  svg.push('<style>');
  svg.push('  line {');
  svg.push('    stroke: black;');
  svg.push('  }');
  svg.push('  text {');
  svg.push('    font-family: Arial, Helvetica, sans-serif;');
  svg.push('  }');
  svg.push('</style>');


  /** 
   * Draw plot area.
   */

  // create plot area
  const plotdim = `x="${(pmar + ylabw).toFixed(3)}" y="${pmar.toFixed(3)}" ` +
    `width="${wp.toFixed(3)}" height="${hp.toFixed(3)}"`;
  svg.push(`<rect id="plotbox" ${plotdim} fill="white" stroke="black" />`);

  // clip plot by the plot area
  svg.push('<defs>');
  svg.push('  <clipPath id="plotarea">');
  svg.push(`    <rect ${plotdim} />`);
  svg.push('  </clipPath>');
  svg.push('</defs>')


  /** 
   * Draw axis ticks and labels.
   */

  const names = mo.cols.names;

  // draw x-axis ticks and ticks labels
  svg.push(`<g id="x-axis" font-size="${tickfs}px" ` +
    'text-anchor="middle" dominant-baseline="hanging">');
  let xtick, xpos;
  for (let i = 0; i < nxtick; i++) {
    xtick = xticks[i];
    xpos = ((xtick - xminp) / xranp * wp + ylabw + pmar).toFixed(3);
    svg.push('  <line ' + 
      `x1="${xpos}" ` +
      `x2="${xpos}" ` +
      `y1="${(pmar + hp).toFixed(3)}" ` +
      `y2="${(pmar + hp + ticklen).toFixed(3)}" ` + '/>');
    svg.push(`  <text ` +
      `x="${xpos}" ` +
      `y="${(pmar + hp + ticklen + 1).toFixed(3)}">` +
      `${xtick.toFixed(xdigits)}` + '</text>');
  }
  svg.push('</g>');

  // draw x-axis label
  svg.push(`<text id="x-label" font-size="${labfs}px" ` +
    'text-anchor="middle" dominant-baseline="middle" ' +
    `x="${(pmar + ylabw + wp / 2).toFixed(3)}" ` +
    `y="${(pmar * 2 + hp + xlabh / 2).toFixed(3)}"` +
    `>${dispNameScale(view['x'], names)}</text>`);

  // draw y-axis ticks and ticks labels
  svg.push(`<g id="y-axis" font-size="${tickfs}px" ` +
    'text-anchor="end" dominant-baseline="middle">');
  let ytick, ypos;
  for (let i = 0; i < nytick; i++) {
    ytick = yticks[i];
    ypos = ((ymaxp - ytick) / yranp * hp + pmar).toFixed(3);
    svg.push('  <line ' +
      `x1="${(pmar + ylabw - ticklen).toFixed(3)}" ` +
      `x2="${(pmar + ylabw).toFixed(3)}" ` +
      `y1="${ypos}" y2="${ypos}" ` + '/>');
    svg.push('  <text ' +
      `x="${(pmar + ylabw - ticklen - 1).toFixed(3)}" y="${ypos}"` +
      `>${ytick.toFixed(ydigits)}</text>`);
  }
  svg.push('</g>');

  // draw y-axis label
  svg.push(`<text id="y-label" font-size="${labfs}px" transform=` +
    `"rotate(270,${(ylabw / 2).toFixed(3)},${(pmar + hp / 2).toFixed(3)})" ` +
    'text-anchor="middle" dominant-baseline="middle" ' +
    `x="${(ylabw / 2).toFixed(3)}" y="${(pmar + hp / 2).toFixed(3)}"` +
    `>${dispNameScale(view['y'], names)}</text>`);


  /** 
   * Data points.
   */

  // transformed contig data
  const trans = mo.trans;
  const X = trans.x,
        Y = trans.y,
        S = trans.size,
        C = trans.rgba;

  // mask and highlight
  const mask = mo.masked,
        high = mo.highed;

  // data point group
  // clipped by the plot area
  svg.push('<g id="plot" clip-path="url(#plotarea)">');

  // data points
  const scatter = [];

  // data points are grouped by highlight
  // group 0 means no highlight
  const nhigh = HIGHLIGHT_PALETTE.length;
  const highs = Array(nhigh).fill().map(() => Array());

  // intermediates
  let x, y, r, c, j, hi;

  // determine appearance of data points
  const n = mo.cache.nctg;
  for (let i = 0; i < n; i++) {
    if (mask[i]) continue;

    // determine radius (size)
    r = S[i] * scale;

    // determine x- and y-coordinates
    // and skip those outside plot area
    x = X[i] * scaleX + offsetX;
    if (x + r < 0 || x - r > wp) continue;
    y = Y[i] * scaleY + offsetY;
    if (y + r < 0 || y - r > hp) continue;

    // transform and round coordinates
    x = (x + pmar + ylabw).toFixed(3);
    y = (y + pmar).toFixed(3);

    // determine fill color and opacity
    c = C[i];
    j = c.lastIndexOf(',');

    // add circle and color to scatter plot
    scatter.push('    <circle ' +
      `cx="${x}" cy="${y}" r="${r.toFixed(3)}" ` +
      `fill="rgb(${c.substring(0, j)})" ` +
      `fill-opacity="${c.substring(j + 1)}"` + '/>');

    // add circle without color to highlight
    hi = high[i];
    if (hi) highs[hi - 1].push('      <circle ' +
      `cx="${x}" cy="${y}" r="${(r + 8).toFixed(3)}"` + '/>');
  }


  /**
   * Highlights.
   */

  // homogenize highlight opacity (even with overlaps)
  // see: https://stackoverflow.com/questions/14386642
  svg.push('  <defs>');
  svg.push('  <filter id="even-opacity">');
  svg.push('    <feComponentTransfer>');
  svg.push('      <feFuncA type="table" tableValues="0 .5 .5" />');
  svg.push('    </feComponentTransfer>');
  svg.push('  </filter>');
  svg.push('  </defs>');

  // also see: https://stackoverflow.com/questions/39193276, which works in a
  // different way and was not adopted

  // draw highlights
  let highx, nx;
  for (let i = 0; i < nhigh; i++) {
    highx = highs[i];
    nx = highx.length;
    if (nx === 0) continue;
    svg.push(`  <g id="high-${i}" fill="${HIGHLIGHT_PALETTE[i]}" ` +
      'filter="url(#even-opacity)">');
    if (nx > 120000) svg = svg.concat(highx);
    else svg.push(...highx);
    svg.push('  </g>');
  }


  /**
   * Main plot.
   */

  // draw scatter plot
  svg.push('  <g id="scatter">');

  // to avoid maximum call stack size limit (some ~125k for Chrome; ~500k for
  // Firefox), see:
  // https://stackoverflow.com/questions/1374126/
  // https://stackoverflow.com/questions/18308700/
  if (scatter.length > 120000) svg = svg.concat(scatter);
  else svg.push(...scatter);
  
  svg.push('  </g>');


  /**
   * Legends.
   */

  svg.push('  <g id="legend">');
  let legx = pmar + ylabw + legmar;
  let legy = pmar + legmar;
  let legh;
  let v, baseline;
  let base = mo.view.size.base;

  // helper for drawing legend box
  function drawLegBox() {
    svg.push('    <rect stroke="black" fill="white" ' +
      `x="${legx.toFixed(3)}" y="${legy.toFixed(3)}" ` +
      `width="${legw.toFixed(3)}" height="${legh.toFixed(3)}"  />`);
  }

  // helper for drawing legend title
  function drawLegTitle(v, scale) {
    let title = dispNameScale(v, names);
    if (scale && scale !== 1) title += ` (${formatNum(scale, 2)}x)`;
    svg.push(`    <text font-size="${labfs}px" ` +
      'text-anchor="middle" dominant-baseline="middle" ' +
      `x="${(legx + legw / 2).toFixed(3)}" ` +
      `y="${(legy + legpad + labfs / 2).toFixed(3)}"` +
      `>${title}</text>`);
  }

  // helper for formatting legend box and title
  function drawNumLegFrame(v, scale) {
    legh = legpad * 3 + labfs + base + tickfs;
    drawLegBox();
    drawLegTitle(v, scale);
    baseline = legy + legh - legpad - 9;
  }

  // helper for formatting min and max labels
  function drawNumLegMinMax(v) {
    const min = v.zero ? scaleNum(0, unscale(v.scale)) : v.min;
    const max = v.max;
    svg.push(`    <text font-size="${tickfs}px" ` +
      'text-anchor="start" dominant-baseline="hanging" ' +
      `x="${(legx + legpad).toFixed(3)}" ` +
      `y="${(baseline + 2).toFixed(3)}"` +
      `>${formatNum(min, 3)}</text>`);
    svg.push(`    <text font-size="${tickfs}px" ` +
      'text-anchor="end" dominant-baseline="hanging" ' +
      `x="${(legx + legw - legpad).toFixed(3)}" ` +
      `y="${(baseline + 2).toFixed(3)}"` +
      `>${formatNum(max, 3)}</text>`);
  }

  // size legend
  v = mo.view.size;
  if (legs.includes('size') && v.i) {
    drawNumLegFrame(v, view.scale);

    // min and max sizes
    let minr = base * v.lower / 100,
        maxr = base * v.upper / 100;

    // legend is a trapezoid plus two sectors
    svg.push('    <path d="' +
      `M ${(legx + legpad).toFixed(3)} ${baseline.toFixed(3)} ` +
      `H ${(legx + legw - legpad).toFixed(3)} ` +
      `A ${maxr.toFixed(3)} ${maxr.toFixed(3)} 0 0 0 ` + 
      `${(legx + legw - legpad - maxr).toFixed(3)} ` +
      `${(baseline - maxr).toFixed(3)} ` +
      `L ${(legx + legpad + minr).toFixed(3)} ` +
      `${(baseline - minr).toFixed(3)}` +
      `A ${minr.toFixed(3)} ${minr.toFixed(3)} 0 0 0 ` +
      `${(legx + legpad).toFixed(3)} ${baseline.toFixed(3)}` +
      '" fill="gray" />');

    drawNumLegMinMax(v);
    legy += legh + legmar;
  }
  base *= 0.8 // make subsequent legends narrower

  // opacity legend
  v = mo.view.opacity;
  if (legs.includes('opacity') && v.i) {

    // legend is filled with an alpha gradient
    svg.push('    <defs>');
    svg.push('      <linearGradient id="alpha-gradient" ' +
      'x1="0" x2="1" y1="0" y2="0">');
    svg.push('        <stop offset="0%" stop-color="black" ' +
      `stop-opacity="${v.lower / 100}"/>`);
    svg.push('        <stop offset="100%" stop-color="black" ' +
      `stop-opacity="${v.upper / 100}"/>`);
    svg.push('      </linearGradient>');
    svg.push('    </defs>');

    drawNumLegFrame(v);
    baseline = legy + legh - legpad - 9;
    svg.push('    <rect fill="url(#alpha-gradient)" ' +
      `x="${(legx + legpad).toFixed(3)}" ` +
      `y="${(baseline - base).toFixed(3)}" ` +
      `width="${(legw - legpad * 2).toFixed(3)}" ` +
      `height="${base.toFixed(3)}" />`);
    drawNumLegMinMax(v);
    legy += legh + legmar;
  }

  // color legend
  v = mo.view.color;
  if (legs.includes('color') && v.i) {

    // continuous colors
    if (mo.cols.types[v.i] === 'num') {

      // legend is filled with a color gradient
      svg.push('    <defs>');
      svg.push('      <linearGradient id="color-gradient" ' +
        'x1="0" x2="1" y1="0" y2="0">');
      const palette = PALETTES[mo.view.contpal].map(x => '#' + x);
      const ncolor = palette.length;
      const step = 100 / (ncolor - 1);
      const lower = v.lower;
      const ratio = 100 / (v.upper - lower);
      for (i = 0; i < ncolor; i++) {
        svg.push(`        <stop offset="${((step * i - lower) * ratio)
          .toFixed(1)}%" stop-color="${palette[i]}" />`);
      }
      svg.push('      </linearGradient>');
      svg.push('    </defs>');

      drawNumLegFrame(v);
      svg.push('    <rect fill="url(#color-gradient)" ' +
        `x="${(legx + legpad).toFixed(3)}" ` +
        `y="${(baseline - base).toFixed(3)}" ` +
        `width="${(legw - legpad * 2).toFixed(3)}" ` +
        `height="${base.toFixed(3)}" />`);
      drawNumLegMinMax(v);
      legy += legh + legmar;
    }

    // discrete colors
    else {
      const cmap = v.discmap;
      const ncat = Object.keys(cmap).length
      legh = legpad * 3 + labfs + colgap * ncat + colr * 2 * (ncat + 1);
      drawLegBox();
      drawLegTitle(v);

      // helper for drawing color box and label
      function drawCatCol(color, cat) {
        svg.push(`    <circle fill="${color}" ` +
          `cx="${(legx + legpad + colr).toFixed(3)}" ` +
          `cy="${(legy + colr).toFixed(3)}" ` +
          `r="${(colr).toFixed(3)}" ` + '/>');
        svg.push(`    <text font-size="${clabfs}px" ` +
          'text-anchor="start" dominant-baseline="middle" ' +
          `x="${(legx + legpad * 2 + colr * 2).toFixed(3)}" ` +
          `y="${(legy + colr).toFixed(3)}">` +
          `${cat}</text>`);
        legy += colr * 2 + colgap;
      }

      legy += legpad * 2 + labfs;
      for (const [cat, color] of Object.entries(cmap)) {
        drawCatCol(`#${color}`, cat);
      }
      drawCatCol(`black`, 'Others &amp; N/A');
    }
  }

  svg.push('  </g>');

  // finish SVG file
  svg.push('</g>');
  svg.push('</svg>');
  svg.push('');


  /**
   * Export SVG file.
   */
  downloadFile(svg.join('\n'), 'image.svg',
    'data:image/svg+xml;charset=utf-8');
}
