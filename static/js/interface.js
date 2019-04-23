"use strict";

/**!
 * @module interface
 * @file Interface functions. They add event listeners to DOMs that are
 * predefined in the HTML file (rather than dynamically generated DOMs), and
 * enable pure interface-related actions (not relevant to the content).
 * @description They may directly access the "document" object. They may access
 * the master object that is passed to them.
 */


/**
 * Initialize controls.
 * @function initControls
 * @params {Object} mo - master object
 * @description This is a very long function. It adds event listeners to DOMs
 * except for canvases.
 */
function initControls(mo) {
  var view = mo.view;
  var stat = mo.stat;

  /**
   * @summary Window
   */

  // window resize event
  window.addEventListener('resize', function () {
    resizeWindow(mo);
  });

  // main frame resize event
  // IE 10 incompatible
  var observer = new MutationObserver(function(mutations) {
    var mutation = mutations[0];
    if (mutation.attributeName !== 'style') return;
    var mf = mutation.target;
    if (mf.id !== 'main-frame') return;
    var w = mf.style.width;
    if (w !== '100%') {
      var w0 = mf.getAttribute('data-width');
      if (!(w0) || w !== w0) {
        mf.setAttribute('data-width', w);
        resizeWindow(mo);
      }
    }
  });
  observer.observe(document.getElementById('main-frame'),
    { attributes: true });

  // window click event
  // hide popup elements (context menu, dropdown selection, etc.)
  window.addEventListener('click', function (e) {
    if (e.button == 0) {
      // main context menu
      if (!(document.getElementById('menu-btn').contains(e.target))) {
        document.getElementById('context-menu').classList.add('hidden');
      }
      // hide dropdown divs if event target is not marked as "dropdown"
      var hideDropdown = true;
      var dds = document.getElementsByClassName('dropdown');
      for (var i = 0; i < dds.length; i++) {
        if (dds[i].contains(e.target)) {
          hideDropdown = false;
          break;
        }
      }
      if (hideDropdown) {
        document.getElementById('list-select').classList.add('hidden');
        document.getElementById('scale-select').classList.add('hidden');
      }
    }
  });


  /**
   * @summary Context menu
   */

  document.getElementById('dash-btn').addEventListener('click', function () {
    this.classList.toggle('active');
    document.getElementById('dash-panel').classList.toggle('hidden');
    dashFrameToggleActive();
  });

  document.querySelectorAll('button.dash-head').forEach(function(btn) {
    btn.addEventListener('click', function() {
      this.nextElementSibling.classList.toggle('hidden');
      dashFrameToggleActive();
    });
  });

  function dashFrameToggleActive() {
    document.getElementById('dash-frame').classList.toggle('active',
      !(document.getElementById('dash-panel').classList.contains('hidden')) &&
      document.querySelector('.dash-content:not(.hidden)'));
  }


  /**
   * @summary Context menu
   */

  // context menu button click
  document.getElementById('menu-btn').addEventListener('click', function () {
    var rect = document.getElementById('menu-btn').getBoundingClientRect();
    var menu = document.getElementById('context-menu');
    // menu.style.right = 0;
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';
    menu.classList.toggle('hidden');
  });

  // open file (a hidden element)
  document.getElementById('open-file').addEventListener('change',
    function (e) {
    uploadFile(e.target.files[0], mo);
  });

  // load data
  document.getElementById('load-data-a').addEventListener('click',
    function () {
    document.getElementById('open-file').click();
  });

  document.getElementById('show-data-a').addEventListener('click',
    function () {
    document.getElementById('data-btn').click();
  });

  document.getElementById('close-data-a').addEventListener('click',
    function () {
    mo.data = { cols: [], types: [], dicts: {}, df: [] };
    updateViewByData(mo);
  });

  document.getElementById('export-bins-a').addEventListener('click',
    function () {
    exportBins(mo.bins, mo.data);
  });

  document.getElementById('export-data-a').addEventListener('click',
    function () {
    exportJSON(mo.data);
  });

  document.getElementById('export-image-a').addEventListener('click',
    function () {
    exportPNG(mo.rena);
  });

  document.getElementById('help-a').addEventListener('click', function () {
    toastMsg(helpInfo, stat);
  });


  /**
   * @summary Shared
   */

  // side panel headers
  document.querySelectorAll('.side-head span:last-of-type button').forEach(
    function(btn) {
    btn.addEventListener('click', function() {
      var pnl = this.parentElement.parentElement.nextElementSibling;
      if (pnl !== null) pnl.classList.toggle("hidden");
    });
  });

  // show/hide side frame
  document.getElementById('hide-side-btn').addEventListener('click',
    function () {
    document.getElementById('side-frame').classList.add('hidden');
    document.getElementById('show-frame').classList.remove('hidden');
    var mf = document.getElementById('main-frame');
    mf.style.resize = 'none';
    mf.style.width = '100%';
    resizeArena(mo.rena, mo.oray);
    updateView(mo);
  });

  document.getElementById('show-side-btn').addEventListener('click',
    function () {
    document.getElementById('show-frame').classList.add('hidden');
    document.getElementById('side-frame').classList.remove('hidden');
    var mf = document.getElementById('main-frame');
    mf.style.resize = 'horizontal';
    var w = mf.getAttribute('data-width');
    if (w) mf.style.width = w;
    resizeArena(mo.rena, mo.oray);
    updateView(mo);
  });


  // button groups
  initBtnGroups();

  // close buttons
  initCloseBtns();

  // color palettes
  var sel = document.getElementById('color-palette-sel');
  mo.palettes.list.forEach(function (palette, i) {
    var opt = document.createElement('option');
    opt.text = palette;
    opt.value = i;
    sel.add(opt);
  });
  sel.value = 0;


  // generic list select table
  document.getElementById('list-options').addEventListener('click',
    function (e) {
    for (var i = 0; i < this.rows.length; i++) {
      if (this.rows[i].contains(e.target)) {
        var target =
          document.getElementById(this.getAttribute('data-target-id'));
        target.value = this.rows[i].cells[0].textContent;
        target.focus();
        this.parentElement.classList.add('hidden');
        break;
      }
    }
  });

  // scale select buttons
  var list = document.getElementById('scale-select');
  var btns = document.getElementsByClassName('scale-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      document.getElementById('current-scale').innerHTML =
        this.getAttribute('data-scale');
      list.setAttribute('data-target-id', this.id);
      var rect = this.getBoundingClientRect();
      list.style.top = rect.bottom + 'px';
      list.style.left = rect.left + 'px';
      list.classList.toggle('hidden');
    });
  }

  // scale select options
  var table = document.getElementById('scale-options');
  for (var i = 0; i < table.rows.length; i++) {
    for (var j = 0; j < table.rows[i].cells.length; j++) {
      var cell = table.rows[i].cells[j];

      // mouse over to show scale name
      cell.addEventListener('mouseover', function () {
        document.getElementById('current-scale').innerHTML = this.title;
      });

      // click to select a scale
      cell.addEventListener('click', function () {
        var src = document.getElementById(document
          .getElementById('scale-select').getAttribute('data-target-id'));
        if (src.innerHTML !== this.innerHTML) {
          src.innerHTML = this.innerHTML;
          src.setAttribute('data-scale', this.title);
          var item = src.id.split('-')[0];
          displayItemChange(item, document.getElementById(item +
            '-field-sel').value, this.title, mo);
        }
      });
    }
  }


  /**
   * @summary View panel toolbar
   */

  // show/hide grid
  document.getElementById('grid-btn').addEventListener('click', function () {
    view.grid = !view.grid;
    document.getElementById('grid-btn').classList.toggle('pressed');
    document.getElementById('coords-label').classList.toggle('hidden');
    renderArena(mo);
  });

  // reset graph
  document.getElementById('reset-btn').addEventListener('click',
    function () {
    resetView(mo);
  });

  // show/hide navigation controls
  document.getElementById('nav-btn').addEventListener('click', function () {
    this.classList.toggle('pressed');
    document.getElementById('nav-panel').classList.toggle('hidden');
  });

  // take screenshot
  document.getElementById('screenshot-btn').addEventListener('click', function () {
    exportPNG(mo.rena);
  });

  // show data table
  document.getElementById('data-btn').addEventListener('click', function () {
    document.getElementById('data-table-modal').classList.remove('hidden');
  });


  /**
   * @summary Navigation controls
   */

  document.getElementById('zoomin-btn').addEventListener('click', function () {
    view.scale /= 0.75;
    updateView(mo);
  });

  document.getElementById('zoomout-btn').addEventListener('click', function () {
    view.scale *= 0.75;
    updateView(mo);
  });

  document.getElementById('left-btn').addEventListener('click', function () {
    view.pos.x -= 15;
    updateView(mo);
  });

  document.getElementById('up-btn').addEventListener('click', function () {
    view.pos.y -= 15;
    updateView(mo);
  });

  document.getElementById('right-btn').addEventListener('click', function () {
    view.pos.x += 15;
    updateView(mo);
  });

  document.getElementById('down-btn').addEventListener('click', function () {
    view.pos.y += 15;
    updateView(mo);
  });


  /**
   * @summary View panel body
   */

  ['x', 'y', 'size', 'opacity'].forEach(function (key) {
    document.getElementById(key + '-field-sel').addEventListener('change',
      function () {
      var span = document.getElementById(key + '-param-span');
      if (this.value) span.classList.remove('hidden');
      else span.classList.add('hidden');
      displayItemChange(key, this.value, view[key].scale, mo);
    });
  });

  document.getElementById('color-field-sel').addEventListener('change',
    function () {
    var span = document.getElementById('color-param-span');
    if (this.value) span.classList.remove('hidden');
    else span.classList.add('hidden');
    view.color.i = this.value;
    var sel = document.getElementById('color-palette-sel');
    view.color.palette = sel.options[sel.selectedIndex].text;
    updateColorMap(mo);
    renderArena(mo);
  });

  document.getElementById('color-palette-sel').addEventListener('change',
    function () {
    view.color.palette = this.options[this.selectedIndex].text;
    updateColorMap(mo);
    renderArena(mo);
  });


  /**
   * @summary Select panel tool bar
   */

  document.getElementById('polygon-btn').addEventListener('click',
    function () {
    polygonSelect(mo);
  });


  /**
   * @summary Select panel body
   */

  document.getElementById('field-list').addEventListener('change',
    function (e) {
    selectFieldChange(e, mo.data, view);
  });

  document.getElementById('min-btn').addEventListener('click', function () {
    if (this.innerHTML === '[') {
      this.innerHTML = '(';
      this.title = 'Lower bound excluded';
    } else {
      this.innerHTML = '[';
      this.title = 'Lower bound included';
    }
  });

  document.getElementById('max-btn').addEventListener('click', function () {
    if (this.innerHTML === ']') {
      this.innerHTML = ')';
      this.title = 'Upper bound excluded';
    } else {
      this.innerHTML = ']';
      this.title = 'Upper bound included';
    }
  });

  ['case-btn', 'whole-btn'].forEach(function (id) {
    document.getElementById(id).addEventListener('click', function () {
      this.classList.toggle('pressed');
    });
  });

  ['min-txt', 'max-txt', 'cat-sel-txt', 'fea-sel-txt', 'des-sel-txt']
    .forEach(function (id) {
    document.getElementById(id).addEventListener('keyup', function (e) {
      if (e.keyCode === 13) document.getElementById('search-btn').click();
    });
  })

  document.getElementById('search-btn').addEventListener('click',
    function () {
    selectByCriteria(mo);
  });


  /**
   * @summary Bin panel tool bar
   */

  document.getElementById('new-bin-btn').addEventListener('click',
    function () {
    var name = createBin(mo.bins);
    var ctgs = Object.keys(mo.pick);
    var n = ctgs.length;
    if (n > 0) {
      addToBin(ctgs, mo.bins[name]);
      mo.pick = {};
      updateSelection(mo);
    }
    updateBinTable(mo);
    updateBinToolbar(mo);
    var table = document.getElementById('bin-tbody');
    selectBin(table, name);
    toastMsg('Created "' + name + '"' + (n ? ' with ' + n
      + ' contig(s)': '') + '.', stat);
  });

  document.getElementById('add-to-bin-btn').addEventListener('click',
    function () {
    var table = document.getElementById('bin-tbody');
    var x = currentBin(table);
    var added = addToBin(Object.keys(mo.pick), mo.bins[x[1]]);
    var n = added.length;
    if (n > 0) table.rows[x[0]].cells[1].innerHTML =
      Object.keys(mo.bins[x[1]]).length;
    toastMsg('Added ' + n + ' contig(s) to "' + x[1] + '".', stat);
  });

  document.getElementById('remove-from-bin-btn').addEventListener('click',
    function () {
    var table = document.getElementById('bin-tbody');
    var x = currentBin(table);
    var removed = removeFromBin(Object.keys(mo.pick), mo.bins[x[1]]);
    updateBinToolbar(mo);
    var n = removed.length;
    if (n > 0) table.rows[x[0]].cells[1].innerHTML = Object.keys(mo.bins[x[1]])
      .length;
    toastMsg('Removed ' + n + ' contig(s) from "' + x[1] + '".', stat);
  });

  document.getElementById('delete-bin-btn').addEventListener('click',
    function () {
    var table = document.getElementById('bin-tbody');
    var deleted = deleteBins(table, mo.bins)[0];
    updateBinToolbar(mo);
    var n = deleted.length;
    if (n === 1) toastMsg('Deleted "' + deleted[0] + '".', stat);
    else toastMsg('Deleted ' + n + ' bins.', stat);
  });

  document.getElementById('merge-bin-btn').addEventListener('click',
    function () {
    var table = document.getElementById('bin-tbody');
    var x = deleteBins(table, mo.bins);
    var name = createBin(mo.bins);
    addToBin(x[1], mo.bins[name]);
    updateBinTable(mo);
    updateBinToolbar(mo);
    selectBin(table, name);
    var n = x[0].length;
    if (n === 2) toastMsg('Merged "' + x[0][0] + '" and "' + x[0][1] +
      '" into "' + name + '".', stat, 2000);
    else toastMsg('Merged ' + n + ' bins into "' + name + '".', stat, 2000);
  });

  document.getElementById('save-bin-btn').addEventListener('click',
    function () {
    exportBins(mo.bins, mo.data);
  });

  // let user choose a categorical field
  document.getElementById('load-bin-btn').addEventListener('click',
    function () {
    var div = document.getElementById('list-select');
    div.classList.add('hidden');
    var rect = this.getBoundingClientRect();
    div.style.top = rect.bottom + 'px';
    div.style.left = rect.left + 'px';
    div.style.width = (rect.right - rect.left) + 'px';
    var table = document.getElementById('list-options');
    table.setAttribute('data-target-id', this.id);
    table.innerHTML = '';
    Object.keys(view.categories).sort().forEach(function (itm) {
      var row = table.insertRow(-1);
      var cell = row.insertCell(-1);
      cell.innerHTML = itm;
    });
    div.classList.remove('hidden');
  });

  // load bins from a categorical field
  document.getElementById('load-bin-btn').addEventListener('focus',
    function () {
    if (this.value !== '') {
      var idx = mo.data.cols.indexOf(this.value);
      mo.bins = loadBins(mo.data.df, idx);
      updateBinTable(mo);
      updateBinToolbar(mo);
      toastMsg('Loaded ' + Object.keys(mo.bins).length + ' bins from "' +
        this.value + '".', stat);
      this.value = '';
    }
  });


  /** 
   * @summary Bin table events
   */

  document.getElementById('bin-tbody').addEventListener('click',
    function (e) {
    // prevent table text from being selected
    this.onselectstart = function() {
      return false;
    }
    var selected;
    for (var i = 0; i < this.rows.length; i++) {
      var row = this.rows[i];
      var label = row.cells[0].firstElementChild;
      var text = row.cells[0].lastElementChild;
      if (row.contains(e.target)) { // bin being clicked
        if (row.classList.contains('current') &&
          row.cells[0].contains(e.target)) {
          label.classList.add('hidden');
          text.classList.remove('hidden');
          text.focus();
        } else if (row.classList.contains('selected')) {
          row.classList.remove('selected');
          row.classList.remove('current');
        } else {
          row.classList.add('selected');
          row.classList.add('current');
          selected = label.innerHTML;
        }
      } else { // all other bins
        row.classList.remove('current');
        label.classList.remove('hidden');
        text.classList.add('hidden');
        // when Shift is pressed, append instead of replace
        if (!e.shiftKey) row.classList.remove('selected');
      }
    }
    updateBinToolbar(mo);

    // select contigs in bin
    if (selected !== undefined) {
      mo.pick = {};
      for (var i in mo.bins[selected]) mo.pick[i] = null;
      updateSelection(mo);
    }
  });


  /** 
   * @summary Information table events
   */

  document.getElementById('info-metric-btn').addEventListener('click',
    function () {
    var row = this.parentElement.parentElement.parentElement;
    if (row.getAttribute('data-metric') === 'sum') {
      row.setAttribute('data-metric', 'mean');
      this.innerHTML = '<span style="text-decoration: overline;">' +
        '<i>x</i></span>';
    } else {
      row.setAttribute('data-metric', 'sum');
      this.innerHTML = '&Sigma;<i>x</i>'
    }
    updateInfoRow(row, mo);
  });

  document.getElementById('info-ref-sel').addEventListener('change',
    function () {
    var row = this.parentElement.parentElement.parentElement.parentElement;
    row.setAttribute('data-refcol', this.value);
    updateInfoRow(row, mo);
  });

  document.getElementById('info-hide-btn').addEventListener('click',
    function () {
    var span = this.parentElement;
    var row = span.parentElement.parentElement;
    span.classList.add('hidden');
    document.body.appendChild(span);
    document.getElementById('info-table').deleteRow(row.rowIndex);
  });


  /**
   * @summary Mask panel events
   */
  document.getElementById('clear-mask-btn').addEventListener('click',
    function () {
      mo.mask = {};
      updateView(mo);
  });


  /** 
   * @summary Data table events
   */
  document.getElementById('load-data-btn').addEventListener('click',
    function () {
      document.getElementById('open-file').click();
  });
}


/**
 * Initiate canvas.
 * @function initCanvas
 * @params {Object} mo - master object
 */
function initCanvas(mo) {
  var view = mo.view;
  var stat = mo.stat;
  var rena = mo.rena;
  var oray = mo.oray;

  resizeArena(rena, oray);

  /* mouse events */
  rena.addEventListener('mousedown', function (e) {
    stat.mousedown = true;
    stat.drag.x = e.clientX - view.pos.x;
    stat.drag.y = e.clientY - view.pos.y;
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
    view.scale *= e.wheelDelta > 0 ? (4 / 3) : 0.75;
    updateView(mo);
  });

  rena.addEventListener('DOMMouseScroll', function (e) {
    view.scale *= e.detail > 0 ? 0.75 : (4 / 3);
    updateView(mo);
  });

  rena.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    var menu = document.getElementById('context-menu');
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';
    menu.classList.remove('hidden');
  });

  rena.addEventListener('click', function (e) {
    canvasMouseClick(e, mo);
  });

  /* drag & drop file to upload */
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

  /* keyboard events */
  rena.addEventListener('keydown', function (e) {
    // var t0 = performance.now();
    switch (e.keyCode) {
      case 37: // Left
        view.pos.x -= 15;
        updateView(mo);
        break;
      case 38: // Up
        view.pos.y -= 15;
        updateView(mo);
        break;
      case 39: // Right
        view.pos.x += 15;
        updateView(mo);
        break;
      case 40: // Down
        view.pos.y += 15;
        updateView(mo);
        break;
      case 37: // Left
        view.pos.x -= 15;
        updateView(mo);
        break;
      case 173: // - (Firefox)
      case 189: // - (others)
        view.scale *= 0.75;
        updateView(mo);
        break;
      case 61: // = (Firefox)
      case 187: // = (others)
        view.scale /= 0.75;
        updateView(mo);
        break;
      case 46: // Delete
      case 8: // Backspace
        var indices = Object.keys(mo.pick);
        if (indices.length > 0) {
          // switch to "add" mode, then treat deletion
          document.getElementById('sel-add-btn').click();
          treatSelection(indices, false, mo);
        }
        break;
      case 13: // Enter
        // finish polygon selection
        if (stat.drawing) polygonSelect(mo);
        break;
    }
    // var t1 = performance.now();
    // console.log(t1 - t0);
  });
}


/**
 * Canvas mouse click event.
 * @function canvasMouseClick
 * @param {Object} e - event object
 * @param {Object} mo - master object
 */
function canvasMouseClick(e, mo) {
  var data = mo.data;
  var view = mo.view;
  var stat = mo.stat;
  var rena = mo.rena;
  if (stat.mousemove) {
    stat.mousemove = false;
  } else if (stat.drawing) {
    var x = (e.offsetX - view.pos.x) / view.scale;
    var y = (e.offsetY - view.pos.y) / view.scale;
    stat.polygon.push({
      x: x,
      y: y
    })
    drawPolygon(mo);
  } else {
    var arr = [];
    var x0 = (e.offsetX - view.pos.x) / view.scale;
    var y0 = (e.offsetY - view.pos.y) / view.scale;
    var masking = (Object.keys(mo.mask).length > 0) ? true : false;
    for (var i = 0; i < data.df.length; i++) {
      if (masking && i in mo.mask) continue;
      var datum = data.df[i];
      var idx = view.size.i;
      var radius = idx ? scaleNum(datum[idx], view.size.scale) * view.size.base
        / view.size.max : view.size.base;
      // var ratio = scaleNum(datum[view.size.i], view.size.scale) *
      //   view.size.base / view.size.max;
      var r2 = radius * radius; // this is faster than Math.pow(x, 2)
      var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
        (view.x.max - view.x.min) - 0.5) * rena.width;
      var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
        (view.y.max - view.y.min) - 0.5) * rena.height;
      var dx = x - x0;
      var dy = y - y0;
      var x2y2 = dx * dx + dy * dy;
      // var x2y2 = Math.pow(x - x0, 2) + Math.pow(y - y0, 2);
      if (x2y2 <= r2) arr.push([i, x2y2]);
    }
    if (!e.shiftKey) mo.pick = {}; // clear selection
    if (arr.length > 0) {
      arr.sort(function (a, b) {
        return (a[1] - b[1]);
      });
      // if already selected, remove; else, add to selection
      var i = arr[0][0];
      if (i in mo.pick) delete mo.pick[i];
      else mo.pick[i] = null;
    }
    updateSelection(mo);
  }
}


/**
 * Window resize event
 * @function resizeWindow
 * @param {Object} mo - master object
 * @description also manually triggered when user resizes main frame
 */
function resizeWindow(mo) {
  var dims = calcArenaDimensions(mo.rena);
  var w = dims[0],
    h = dims[1];
  toastMsg('Plot size: ' + w.toString() + ' x ' + h.toString(), mo.stat);
  clearTimeout(mo.stat.resizing);
  mo.stat.resizing = setTimeout(function () {
    resizeArena(mo.rena, mo.oray);
    updateView(mo);
  }, 250); // redraw canvas after 0.25 sec
}


/**
 * Canvas mouse move event.
 * @function canvasMouseMove
 * @param {Object} e - event object
 * @param {Object} mo - master object
 */
function canvasMouseMove(e, mo) {
  var view = mo.view;
  var stat = mo.stat;
  var rena = mo.rena;
  if (stat.mousedown) {
    stat.mousemove = true;
    view.pos.x = e.clientX - stat.drag.x;
    view.pos.y = e.clientY - stat.drag.y;
    updateView(mo);
  } else {
    var x = ((e.offsetX - view.pos.x) / view.scale / rena.width + 0.5) *
      (view.x.max - view.x.min) + view.x.min;
    var y = view.y.max - ((e.offsetY - view.pos.y) / view.scale /
      rena.height + 0.5) * (view.y.max - view.y.min);
    document.getElementById('coords-label').innerHTML = x.toFixed(3) + ',' +
      y.toFixed(3);
  }
}


/**
 * Initiate button groups.
 * @function initBtnGroups
 */
function initBtnGroups() {
  var groups = document.getElementsByClassName('btn-group');
  for (var i = 0; i < groups.length; i++) {
    var btns = groups[i].getElementsByTagName('button');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        if (!this.classList.contains('pressed')) {
          var btns = this.parentElement.getElementsByTagName('button');
          for (var i = 0; i < btns.length; i++) {
            if (btns[i] !== this) {
              btns[i].classList.remove('pressed');
            }
          }
          this.classList.add('pressed');
        }
      });
    }
  }
}


/**
 * Initiate modal close buttons.
 * @function initCloseBtns
 */
function initCloseBtns() {
  var bars = document.getElementsByClassName('modal-head');
  for (var i = 0; i < bars.length; i++) {
    var btn = document.createElement('button');
    btn.innerHTML = '&times;';
    btn.classList.add('close');
    btn.title = 'Close the ' + bars[i].textContent
      .toLowerCase() + ' window';
    bars[i].appendChild(btn);
    btn.addEventListener('click', function () {
      this.parentElement.parentElement.parentElement.classList.add('hidden');
    });
  }
  // var btns = document.getElementsByClassName('close');
  // for (var i = 0; i < btns.length; i++) {
  //   btns[i].addEventListener('click', function () {
  //     this.parentElement.parentElement.parentElement.classList.add('hidden');
  //   });
  // }
}


/**
 * Get HTML code for scale code
 * @function scale2HTML
 * @param {string} scale - scale code
 * @returns {string} - HTML code
 */
function scale2HTML(scale) {
  var table = document.getElementById('scale-options');
  for (var i = 0; i < table.rows.length; i++) {
    for (var j = 0; j < table.rows[i].cells.length; j++) {
      var cell = table.rows[i].cells[j];
      if (cell.title === scale) {
        return cell.innerHTML;
      }
    }
  }
}


/**
 * Display a message in toast.
 * @function toastMsg
 * @param {string} msg - message to display
 * @param {Object} stat - status object
 * @param {number} duration - milliseconds to keep toast visible
 */
function toastMsg(msg, stat, duration) {
  duration = duration || 1000;
  var toast = document.getElementById('toast');
  toast.innerHTML = msg;
  toast.classList.remove('hidden');
  clearTimeout(stat.toasting);
  stat.toasting = setTimeout(function () {
    toast.classList.add('hidden');
    toast.innerHTML = '';
  }, duration);
}


/**
 * @summary The following functions are for building auto-complete input boxes.
 * Modified based on the W3Schools tutorial:
 * @see {@link https://www.w3schools.com/howto/howto_js_autocomplete.asp}
 */

/**
 * Add auto-complete function to a text box.
 * @function autoComplete
 * @param {Object} inp - input text box
 * @param {*} arr - list of options
 */
function autoComplete(inp, arr) {
  var focus;
  inp.addEventListener('input', function () {
    var val = this.value;
    if (!val) return false;
    var div = document.getElementById('list-select');
    div.classList.add('hidden');
    var rect = this.getBoundingClientRect();
    div.style.top = rect.bottom + 'px';
    div.style.left = rect.left + 'px';
    div.style.width = (rect.right - rect.left) + 'px';
    var table = document.getElementById('list-options');
    table.setAttribute('data-target-id', inp.id);
    table.innerHTML = '';
    arr.forEach(function (itm) {
      var prefix = itm.substr(0, val.length);
      if (prefix.toUpperCase() === val.toUpperCase()) {
        var row = table.insertRow(-1);
        var cell = row.insertCell(-1);
        cell.innerHTML = '<strong>' + prefix + '</strong>' + itm.substr(val.length);
      }
    });
    div.classList.remove('hidden');
    focus = -1;
  });

  inp.addEventListener('keydown', function (e) {
    var table = document.getElementById('list-options');
    if (e.keyCode == 40) { // Down key
      focus ++;
      addActive(table);
    } else if (e.keyCode == 38) { // Up key
      focus --;
      addActive(table);
    } else if (e.keyCode == 13) { // Enter key
      e.preventDefault();
      if (focus > -1) {
        table.rows[focus].cells[0].click();
      }
    }
  });

  function addActive(table) {
    removeActive(table);
    if (focus >= table.rows.length) focus = 0;
    else if (focus < 0) focus = (table.rows.length - 1);
    table.rows[focus].cells[0].classList.add('active');
  }

  function removeActive(table) {
    for (var i = 0; i < table.rows.length; i++) {
      table.rows[i].cells[0].classList.remove('active');
    }
  }
}
