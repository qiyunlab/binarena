
/**
 * Generate and export an SVG image of the current view.
 * @function exportSVG
 * @param {Object} mo - main object
 * @description This is an independent rendering enginer that is in parallel
 * to the HTML5 canvas rendering engine. It aims at reproducing what the
 * latter is capturing.
 */
function exportSVG(mo) {

  // figure flavors
  const margin = 10,  // margin space
        xspace = 30,  // extra horizontal space for x-axis ticks and labels
        yspace = 40,  // extra vertical space for y-axis ticks and labels
        ticksize = 5, // tick length
        tickgap = 50, // tick density
        minticks = 5; // minimum tick number

  // create SVG (array of lines)
  let svg = [];


  /** 
   * Determine plot dimension and transformation.
   */

  // canvas size
  const rena = mo.rena;
  const w = rena.width,
        h = rena.height;

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
    ` width="${Math.round(wp + margin * 2 + yspace)}" ` +
    `height="${Math.round(hp + margin * 2 + xspace)}" ` +
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
  const plotdim = `x="${margin + yspace}" y="${margin}" width="${wp}" ` +
    `height="${hp}"`;
  svg.push(
    `<rect id="background" ${plotdim} fill="white" stroke="black" />`);

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
  svg.push('<g id="x-axis" ' +
    'text-anchor="middle" dominant-baseline="hanging" font-size="8pt">');
  let xtick, xpos;
  for (let i = 0; i < nxtick; i++) {
    xtick = xticks[i];
    xpos = (xtick - xminp) / xranp * wp + yspace + margin;
    svg.push('  <line ' + 
      `x1="${xpos}" ` +
      `x2="${xpos}" ` +
      `y1="${margin + hp}" ` +
      `y2="${margin + hp + ticksize}" ` + '/>');
    svg.push(`<text ` +
      `x="${xpos}" ` +
      `y="${margin + hp + ticksize}">` +
      `${xtick.toFixed(xdigits)}` + '</text>');
  }
  svg.push('</g>');

  // draw x-axis label
  let xlabel = names[view.x.i];
  if (view.x.scale !== 'none') xlabel += ` (${view.x.scale})`;
  svg.push('<text ' +
    'text-anchor="middle" dominant-baseline="middle" font-size="10pt" ' +
    `x="${margin + yspace + wp / 2}" y="${margin * 2 + hp + xspace / 2}"` +
    `>${xlabel}</text>`);

  // draw y-axis ticks and ticks labels
  svg.push('<g id="y-axis" ' +
    'text-anchor="end" dominant-baseline="middle" font-size="8pt">');
  let ytick, ypos;
  for (let i = 0; i < nytick; i++) {
    ytick = yticks[i];
    ypos = (ymaxp - ytick) / yranp * hp + margin;
    svg.push('  <line ' +
      `x1="${margin + yspace - ticksize}" ` +
      `x2="${margin + yspace}" ` +
      `y1="${ypos}" y2="${ypos}" ` + '/>');
    svg.push('  <text ' +
      `x="${margin + yspace - ticksize}" y="${ypos}"` +
      `>${ytick.toFixed(ydigits)}</text>`);
  }
  svg.push('</g>');

  // draw y-axis label
  let ylabel = names[view.y.i];
  if (view.y.scale !== 'none') ylabel += ` (${view.y.scale})`;
  svg.push('   <text ' +
    `transform="rotate(270,${yspace / 2},${margin + hp / 2})" ` +
    'text-anchor="middle" dominant-baseline="middle" font-size="10pt" ' +
    `x="${yspace / 2}" y="${margin + hp / 2}"` +
    `>${ylabel}</text>`);


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
    x = (x + margin + yspace).toFixed(3);
    y = (y + margin).toFixed(3);

    // determine fill color and opacity
    c = C[i];
    j = c.lastIndexOf(',');

    // add circle and color to scatter plot
    scatter.push('      <circle ' +
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

  // homogenize highlight opacity (even when they overlap)
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
  for (let i = 0; i < nhigh; i++) {
    if (highs[i].length === 0) continue;
    svg.push(`  <g id="high-${i}" fill="${HIGHLIGHT_PALETTE[i]}" ` +
      'filter="url(#even-opacity)">');
    svg.push(...highs[i]);
    svg.push('  </g>');
  }


  /**
   * Main plot.
   */

  // draw scatter plot
  svg.push('  <g id="scatter">');
  svg.push(...scatter);
  svg.push('  </g>');

  // finish SVG file
  svg.push('</g>');
  svg.push('</svg>');
  svg.push('');


  /**
   * Export SVG file.
   */

  const a = document.createElement('a');
  a.href = "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(svg.join('\n'));
  a.download = 'image.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
