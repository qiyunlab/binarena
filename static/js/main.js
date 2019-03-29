/**!
 * @name BinaRena
 * @author Qiyun Zhu <qiyunzhu@gmail.com>
 * @version 0.0.1
 * @license BSD 3-Clause
 *
 * @description The program does not dependent on any third-party libraries.
 * The code is intended to be compatible with ES5 (ECMAScript 5.1). Please
 * refrain from using any ES6+ syntax. The program is intended to be compatible
 * with Internet Explorer 10 and later. Please consider when using more recent
 * features.
 *
 * @file This script is the main body of the program. It has only one top-level
 * entry: window onload event. All functions and variables are local to it.
 *
 */


window.addEventListener('load', function () {

  "use strict";

  /**
   * Data object.
   * @param {string[]} cols - field names
   * @param {string[]} types - field types
   * @param {Object.<string, Object.<string, string>>} dicts - dictionaries
   * @param {Array.<Array.<*>>} df - data frame
   */
  var data = {
    cols: [], // columns
    types: [], // field types
    dicts: {}, // dictionaries
    df: [], // data frame
  }

  /**
   * View object.
   * @param {Object.<string, number>} pos - drawing position
   * @param {number} scale - scaling factor
   * @param {number, number} drag - dragging position
   * @param {boolean} mouseDown
   * @param {boolean} mouseMove
   * @param {[number, number][]} polygon - vertices of polygon
   * @param {Object.<number, null>} selection - indices of selected data
   * @param {Object.<number, null>} exclusion - indices of excluded data
   * @param {boolean} grid - whether show grid
   * @param {boolean} drawing - whether drawing polygon
   */
  var view = {
    /* canvas rendering */
    pos: { // drawing position
      x: 0,
      y: 0
    },
    scale: 1.0, // scaling factor
    mouseDown: false,
    mouseMove: false,
    drag: {}, // dragging position
    drawing: false, // drawing polygon
    polygon: [], // vertices of polygon

    /* select/exclude status */
    selection: {},
    exclusion: {},

    /* ongoing ui events */
    resizing: null, // window resizing
    toasting: null, // toasting

    /* display items */
    x: {},
    y: {},
    size: {},
    opacity: {},
    color: {},

    /* additional display items */
    grid: false,

    /* pre-cached data info */
    lencol: null, // name of putative "length" column
    covcol: null, // name of putative "coverage" column
    categories: {}, // column to category to frequency map
    features: {}, // column to category to frequency map
    decimals: {}, // column to maximum decimals map
    abundance: null // total abundance (sum of len * cov)
  };

  // more structures of the view object
  ['x', 'y', 'size', 'opacity', 'color'].forEach(function (itm) {
    ['i', 'scale', 'min', 'max'].forEach(function (param) {
      view[itm][param] = null;
    });
  });
  view.size.base = 15;
  ['palette', 'map'].forEach(function (param) {
    view.color[param] = null;
  });


  /**
   * Bins object.
   * data structure:
   * { bin name => { contig index 1 => null, contig index 2 => null, ... } }
   */
  var bins = {};

  // load demo data, if available
  if (typeof dataPath !== 'undefined') {
    updateDataFromRemote(dataPath);
  }

  // the two main canvases that render the graphs
  var arena = document.getElementById('arena-canvas');
  var overlay = document.getElementById('overlay-canvas');

  // generate some global dictionaries
  var scale2HTML = getScale2HTML();

  // initiate color palette object
  var palettes = new PaletteObj();

  // initiate controls
  initControls();

  // initiate canvas
  initCanvas();

  // update view based on data
  updateViewByData();


  /**
   * Initiate controls.
   * @function initControls
   */
  function initControls() {

    /**
     * @summary Window
     */

    // window resize event
    window.addEventListener('resize', function () {
      var dims = calcArenaDimensions();
      var w = dims[0],
        h = dims[1];
      toastMsg('Plot size: ' + w.toString() + ' x ' + h.toString());
      clearTimeout(view.resizing);
      view.resizing = setTimeout(function () {
        resizeArena();
        updateView();
      }, 250); // redraw canvas after 0.25 sec
    });

    // window click event
    // hide popup elements (context menu, dropdown selection, etc.)
    window.addEventListener('click', function (e) {
      if (e.button == 0) {
        // main context menu
        if (!(document.getElementById('menu-btn').contains(e.target))) {
          document.getElementById('menu-body').classList.add('hidden');
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

    // slide button (show/hide side frame)
    document.getElementById('slide-btn').addEventListener('click', function () {
      document.getElementById('side-frame').classList.toggle('hidden');
      var p = this.firstElementChild;
      p.style.transform = (p.style.transform === 'rotate(45deg)') ?
        'rotate(225deg)' : 'rotate(45deg)';
      resizeArena();
      updateView();
    });


    /**
     * @summary Context menu
     */

    // context menu button click
    document.getElementById('menu-btn').addEventListener('click', function () {
      // document.getElementById('menu-content').style.right = 0;
      var menu = document.getElementById('menu-body');
      menu.style.position = 'relative';
      menu.style.top = 0;
      menu.style.left = 0;
      menu.classList.toggle('hidden');
    });

    // open file (a hidden element)
    document.getElementById('open-file').addEventListener('change',
      function (e) {
      uploadFile(e.target.files[0]);
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
      data = { cols: [], types: [], dicts: {}, df: [] };
      updateViewByData();
    });

    document.getElementById('export-bins-a').addEventListener('click',
      function () {
      exportBins();
    });

    document.getElementById('export-data-a').addEventListener('click',
      function () {
      exportJSON();
    });

    document.getElementById('export-image-a').addEventListener('click',
      function () {
      exportPNG();
    });

    document.getElementById('help-a').addEventListener('click', function () {
      document.getElementById('help-btn').click();
    });


    /**
     * @summary Shared
     */

    // button groups
    initBtnGroups();

    // panel show/hide buttons
    initShowHideBtns();

    // close buttons
    initCloseBtns();

    // color palettes
    var sel = document.getElementById('color-palette-sel');
    palettes.list.forEach(function (palette, i) {
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
              '-field-sel').value, this.title);
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
      renderArena();
    });

    // reset graph
    document.getElementById('reset-btn').addEventListener('click',
      function () {
      resetView();
    });

    // show/hide navigation controls
    document.getElementById('nav-btn').addEventListener('click', function () {
      this.classList.toggle('pressed');
      document.getElementById('nav-ctrls').classList.toggle('hidden');
    });

    // take screenshot
    document.getElementById('png-btn').addEventListener('click', function () {
      exportPNG();
    });

    // show data table
    document.getElementById('data-btn').addEventListener('click', function () {
      document.getElementById('data-table-modal').classList.remove('hidden');
    });

    // help button
    document.getElementById('help-btn').addEventListener('click', function () {
      window.alert(helpInfo);
    });


    /**
     * @summary Navigation controls
     */

    document.getElementById('zoomin-btn').addEventListener('click', function () {
      view.scale /= 0.75;
      updateView();
    });

    document.getElementById('zoomout-btn').addEventListener('click', function () {
      view.scale *= 0.75;
      updateView();
    });

    document.getElementById('left-btn').addEventListener('click', function () {
      view.pos.x -= 15;
      updateView();
    });

    document.getElementById('up-btn').addEventListener('click', function () {
      view.pos.y -= 15;
      updateView();
    });

    document.getElementById('right-btn').addEventListener('click', function () {
      view.pos.x += 15;
      updateView();
    });

    document.getElementById('down-btn').addEventListener('click', function () {
      view.pos.y += 15;
      updateView();
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
        displayItemChange(key, this.value, view[key].scale);
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
      updateColorMap();
      renderArena();
    });

    document.getElementById('color-palette-sel').addEventListener('change',
      function (e) {
      view.color.palette = this.options[this.selectedIndex].text;
      updateColorMap();
      renderArena();
    });


    /**
     * @summary Select panel tool bar
     */

    document.getElementById('polygon-btn').addEventListener('click',
      function () {
      polygonSelect();
    });


    /**
     * @summary Select panel body
     */

    document.getElementById('field-list').addEventListener('change',
      function (e) {
      selectFieldChange(e);
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
      selectByCriteria();
    });


    /**
     * @summary Bin panel tool bar
     */

    document.getElementById('new-bin-btn').addEventListener('click',
      function () {
      var name = createBin(bins);
      var ctgs = Object.keys(view.selection);
      var n = ctgs.length;
      if (n > 0) {
        addToBin(ctgs, bins[name]);
        view.selection = {};
        showSelection();
      }
      updateBinTable();
      updateBinToolbar();
      var table = document.getElementById('bin-tbody');
      selectBin(table, name);
      toastMsg('Created "' + name + '"' + (n ? ' with ' + n
        + ' contig(s)': '') + '.');
    });

    document.getElementById('add-to-bin-btn').addEventListener('click',
      function () {
      var table = document.getElementById('bin-tbody');
      var x = currentBin(table);
      var added = addToBin(Object.keys(view.selection), bins[x[1]]);
      var n = added.length;
      if (n > 0) table.rows[x[0]].cells[1].innerHTML =
        Object.keys(bins[x[1]]).length;
      toastMsg('Added ' + n + ' contig(s) to "' + x[1] + '".');
    });

    document.getElementById('remove-from-bin-btn').addEventListener('click',
      function () {
      var table = document.getElementById('bin-tbody');
      var x = currentBin(table);
      var removed = removeFromBin(Object.keys(view.selection), bins[x[1]]);
      updateBinToolbar();
      var n = removed.length;
      if (n > 0) table.rows[x[0]].cells[1].innerHTML = Object.keys(bins[x[1]])
        .length;
      toastMsg('Removed ' + n + ' contig(s) from "' + x[1] + '".');
    });

    document.getElementById('delete-bin-btn').addEventListener('click',
      function () {
      var table = document.getElementById('bin-tbody');
      var deleted = deleteBins(table, bins)[0];
      updateBinToolbar();
      var n = deleted.length;
      if (n === 1) toastMsg('Deleted "' + deleted[0] + '".');
      else toastMsg('Deleted ' + n + ' bins.');
    });

    document.getElementById('merge-bin-btn').addEventListener('click',
      function () {
      var table = document.getElementById('bin-tbody');
      var x = deleteBins(table, bins);
      var name = createBin(bins);
      addToBin(x[1], bins[name]);
      updateBinTable();
      updateBinToolbar();
      selectBin(table, name);
      var n = x[0].length;
      if (n === 2) toastMsg('Merged "' + x[0][0] + '" and "' + x[0][1] +
        '" into "' + name + '".', 2000);
      else toastMsg('Merged ' + n + ' bins into "' + name + '".', 2000);
    });

    document.getElementById('save-bin-btn').addEventListener('click',
      function () {
      exportBins();
    });

    // let user choose a categorical field
    document.getElementById('load-bin-btn').addEventListener('click',
      function () {
      var div = document.getElementById('list-select');
      div.classList.add('hidden');
      div.style.width = this.style.width;
      var rect = this.getBoundingClientRect();
      div.style.top = rect.bottom + 'px';
      div.style.left = rect.left + 'px';
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
        var idx = data.cols.indexOf(this.value);
        bins = loadBins(data.df, idx);
        updateBinTable();
        updateBinToolbar();
        toastMsg('Loaded ' + Object.keys(bins).length + ' bins from "' +
          this.value + '".');
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
      updateBinToolbar();

      // select contigs in bin
      if (selected !== undefined) {
        view.selection = {};
        for (var i in bins[selected]) view.selection[i] = null;
        showSelection();
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
      updateInfoRow(row);
    });

    document.getElementById('info-ref-sel').addEventListener('change',
      function () {
      var row = this.parentElement.parentElement.parentElement.parentElement;
      row.setAttribute('data-refcol', this.value);
      updateInfoRow(row);
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
     * @summary Data table events
     */
    document.getElementById('load-data-btn').addEventListener('click',
      function () {
        document.getElementById('open-file').click();
    });


    /** just for test */

    // test button
    document.getElementById('test-btn').addEventListener('click', function () {
      testFunction();
    });
  }


  /**
   * Initiate canvas.
   * @function initCanvas
   */
  function initCanvas() {

    resizeArena();

    /* mouse events */
    arena.addEventListener('mousedown', function (e) {
      view.mouseDown = true;
      view.drag.x = e.clientX - view.pos.x;
      view.drag.y = e.clientY - view.pos.y;
    });

    arena.addEventListener('mouseup', function () {
      view.mouseDown = false;
    });

    arena.addEventListener('mouseover', function () {
      view.mouseDown = false;
    });

    arena.addEventListener('mouseout', function () {
      view.mouseDown = false;
      view.mouseMove = false;
    });

    arena.addEventListener('mousemove', function (e) {
      canvasMouseMove(e);
    });

    arena.addEventListener('mousewheel', function (e) {
      view.scale *= e.wheelDelta > 0 ? (4 / 3) : 0.75;
      updateView();
    });

    arena.addEventListener('DOMMouseScroll', function (e) {
      view.scale *= e.detail > 0 ? 0.75 : (4 / 3);
      updateView();
    });

    arena.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      // document.getElementById('menu-content').style.right = 'auto';
      var menu = document.getElementById('menu-body');
      menu.style.position = 'fixed';
      menu.style.top = e.clientY + 'px';
      menu.style.left = e.clientX + 'px';
      menu.classList.remove('hidden');
    });

    arena.addEventListener('click', function (e) {
      canvasMouseClick(e);
    });

    /* drag & drop file to upload */
    arena.addEventListener('dragover', function (e) {
      e.preventDefault();
    });

    arena.addEventListener('dragenter', function (e) {
      e.preventDefault();
    });

    arena.addEventListener('drop', function (e) {
      e.stopPropagation();
      e.preventDefault();
      uploadFile(e.dataTransfer.files[0]);
    });

    /* keyboard events */
    arena.addEventListener('keydown', function (e) {
      switch (e.keyCode) {
        case 37: // Left
          view.pos.x -= 15;
          updateView();
          break;
        case 38: // Up
          view.pos.y -= 15;
          updateView();
          break;
        case 39: // Right
          view.pos.x += 15;
          updateView();
          break;
        case 40: // Down
          view.pos.y += 15;
          updateView();
          break;
        case 37: // Left
          view.pos.x -= 15;
          updateView();
          break;
        case 173: // - (Firefox)
        case 189: // - (others)
          view.scale *= 0.75;
          updateView();
          break;
        case 61: // = (Firefox)
        case 187: // = (others)
          view.scale /= 0.75;
          updateView();
          break;
        case 46: // Delete
        case 8: // Backspace
          var indices = Object.keys(view.selection);
          if (indices.length > 0) {
            // switch to "add" mode, then treat deletion
            document.getElementById('sel-add-btn').click();
            treatSelection(indices, false);
          }
          break;
        case 13: // Enter
          // finish polygon selection
          if (view.drawing) polygonSelect();
          break;
      }
    });
  }


  /**
   * @summary File system operations
   */

  /**
   * Import data from a text file.
   * @function uploadFile
   * It uses the FileReader object, available since IE 10.
   */
  function uploadFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var cache = updateDataFromText(e.target.result, data);
      updateViewByData(cache);
    }
    reader.readAsText(file);
  }

  /**
   * Import data from a remote location
   * @function updateDataFromRemote
   * It uses XMLHttpRequest, which has to be run on a server.
   */
  function updateDataFromRemote(path) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status == 200) {
          var cache = updateDataFromText(this.responseText, data);
          updateViewByData(cache);
        }
      }
    }
    xhr.open('GET', path, true);
    xhr.send();
  }

  /**
   * Initiate display items based on updated data.
   * Basically, it is a "guess" process.
   * @function initDisplayItems
   */
  function initDisplayItems() {
    var items = ['x', 'y', 'size', 'opacity', 'color'];
    var indices = guessDisplayFields(data);
    var scales = guessDisplayScales(items);
    items.forEach(function (item) {
      view[item].i = indices[item];
      view[item].scale = scales[item];
    });
  }


  /**
   * Update color map based on selected field and palette.
   * @function updateColorMap
   */
  function updateColorMap(n) {
    n = n || 10;
    view.color.map = {};
    var palette = palettes.make(view.color.palette, 10);

    // get categories and their occurrence numbers
    var cats = {}
    for (var i = 0; i < data.df.length; i++) {
      var val = data.df[i][view.color.i];
      if (val === null) continue;
      var cat = val[0];
      if (cat in cats) {
        cats[cat]++;
      } else {
        cats[cat] = 1;
      }
    }

    // convert object to array of key: value pairs, then sort
    cats = Object.keys(cats).map(function (key) {
      return [key, cats[key]];
    });
    cats.sort(function (a, b) {
      return b[1] - a[1];
    });

    // take up to given number of frequent categories
    for (var i = 0; i < Math.min(n, cats.length); i++) {
      view.color.map[cats[i][0]] = palette[i];
    }
  }


  /**
   * Update view based on data.
   * @function updateViewByData
   * @param {[Object, Object, Object]} [cache] - decimals, categories and
   * features
   * Singling out cache is for performance consideration.
   */
  function updateViewByData(cache) {
    var sign = document.getElementById('drop-sign');
    if (data.df.length === 0) sign.classList.remove('hidden');
    else sign.classList.add('hidden');

    // cache data
    cache = cache || cacheData(data);
    view.decimals = cache[0];
    view.categories = cache[1];
    view.features = cache[2];
    view.lencol = guessLenColumn(data);
    view.covcol = guessCovColumn(data);

    // calculate total abundance
    if (view.lencol && view.covcol) {
      var il = data.cols.indexOf(view.lencol);
      var ic = data.cols.indexOf(view.covcol);
      view.abundance = 0;
      for (var i = 0; i < data.df.length; i++) {
        view.abundance += data.df[i][il] * data.df[i][ic];
      }
    }

    // manipulate interface
    initDisplayItems();
    updateControls();
    initInfoTable(data, view.lencol);
    initDataTable(data.cols, data.types);
    fillDataTable(data);
    document.getElementById('bin-tbody').innerHTML = '';
    resetView();
  }

  /**
   * Calculate arena dimensions based on style and container.
   * @function calcArenaDimensions
   */
  function calcArenaDimensions() {
    var w = Math.max(parseInt(getComputedStyle(arena).minWidth),
      arena.parentElement.parentElement.offsetWidth);
    var h = Math.max(parseInt(getComputedStyle(arena).minHeight),
      arena.parentElement.parentElement.offsetHeight);
    return [w, h];
  }


  /**
   * Update canvas dimensions.
   * @function resizeArena
   * @description For an HTML5 canvas, (plot) and style width are two things.
   * See here: https://stackoverflow.com/questions/4938346/canvas-width-and-
   * height-in-html5
   */
  function resizeArena() {
    var dims = calcArenaDimensions();
    var w = dims[0],
      h = dims[1];

    // update width
    if (arena.style.width !== w) arena.style.width = w;
    if (arena.width !== w) arena.width = w;
    if (overlay.style.width !== w) overlay.style.width = w;
    if (overlay.width !== w) overlay.width = w;

    // update height
    if (arena.style.height !== h) arena.style.height = h;
    if (arena.height !== h) arena.height = h;
    if (overlay.style.height !== h) overlay.style.height = h;
    if (overlay.height !== h) overlay.height = h;
  }


  /** update control based on new data */
  function updateControls() {

    // update field list in filtering
    var fl = document.getElementById('field-list');
    fl.innerHTML = '';
    var opt = document.createElement('option');
    fl.add(opt);
    for (var i = 0; i < data.cols.length; i++) {
      if (data.types[i] !== 'id') {
        var opt = document.createElement('option');
        opt.text = data.cols[i];
        opt.value = i;
        fl.add(opt);
      }
    }

    // update field list in display items
    var numFields = [],
      catFields = [];
    for (var i = 0; i < data.cols.length; i++) {
      var type = data.types[i],
        field = data.cols[i];
      if (type === 'number') {
        numFields.push([i, field]);
      } else if (type === 'category') {
        catFields.push([i, field]);
      }
    }

    // numeric fields
    ['x', 'y', 'size', 'opacity'].forEach(function (item) {
      var sel = document.getElementById(item + '-field-sel');
      sel.innerHTML = '';
      sel.add(document.createElement('option'));
      for (var j = 0; j < numFields.length; j++) {
        var opt = document.createElement('option');
        opt.text = numFields[j][1];
        opt.value = numFields[j][0];
        sel.add(opt);
      }

      // pre-defined index
      var idx = view[item].i;
      if (idx) sel.value = idx;
      var span = document.getElementById(item + '-param-span');
      if (idx) span.classList.remove('hidden');
      else span.classList.add('hidden');

      // pre-defined scale
      var scale = view[item].scale;
      var btn = document.getElementById(item + '-scale-btn');
      btn.setAttribute('data-scale', scale);
      btn.innerHTML = scale2HTML[scale];
    });

    // categorical fields
    var sel = document.getElementById('color-field-sel');
    sel.innerHTML = '';
    sel.add(document.createElement('option'));
    catFields.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.text = cat[1];
      opt.value = cat[0];
      sel.add(opt);
    });
    var idx = view.color.i;
    if (idx) sel.value = idx;
    var palette = view.color.palette;
    if (palette) document.getElementById('color-palette-sel').value =
      palettes.list.indexOf(palette);
  }


  /**
   * Canvas mouse click event.
   * @function canvasMouseClick
   * @param {Object} e - event object
   */
  function canvasMouseClick(e) {
    if (view.mouseMove) {
      view.mouseMove = false;
    } else if (view.drawing) {
      var x = (e.offsetX - view.pos.x) / view.scale;
      var y = (e.offsetY - view.pos.y) / view.scale;
      view.polygon.push({
        x: x,
        y: y
      })
      drawPolygon();
    } else {
      var arr = [];
      var x0 = (e.offsetX - view.pos.x) / view.scale;
      var y0 = (e.offsetY - view.pos.y) / view.scale;
      var excluding = (Object.keys(view.exclusion).length > 0) ? true : false;
      for (var i = 0; i < data.df.length; i++) {
        if (excluding && i in view.exclusion) continue;
        var datum = data.df[i];
        var ratio = scaleNum(datum[view.size.i], view.size.scale) *
          view.size.base / view.size.max;
        var r2 = ratio * ratio; // this is faster than Math.pow(x, 2)
        var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
          (view.x.max - view.x.min) - 0.5) * arena.width;
        var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
          (view.y.max - view.y.min) - 0.5) * arena.height;
        var dx = x - x0;
        var dy = y - y0;
        var x2y2 = dx * dx + dy * dy;
        // var x2y2 = Math.pow(x - x0, 2) + Math.pow(y - y0, 2);
        if (x2y2 <= r2) arr.push([i, x2y2]);
      }
      if (!e.shiftKey) view.selection = {}; // clear selection
      if (arr.length > 0) {
        arr.sort(function (a, b) {
          return (a[1] - b[1]);
        });
        // if already selected, remove; else, add to selection
        var i = arr[0][0];
        if (i in view.selection) delete view.selection[i];
        else view.selection[i] = null;
      }
      showSelection();
    }
  }


  /** canvas mouse move event */
  function canvasMouseMove(e) {
    if (view.mouseDown) {
      view.mouseMove = true;
      view.pos.x = e.clientX - view.drag.x;
      view.pos.y = e.clientY - view.drag.y;
      updateView();
    } else {
      var x = ((e.offsetX - view.pos.x) / view.scale / arena.width + 0.5) *
        (view.x.max - view.x.min) + view.x.min;
      var y = view.y.max - ((e.offsetY - view.pos.y) / view.scale /
        arena.height + 0.5) * (view.y.max - view.y.min);
      document.getElementById('coords-label').innerHTML = x.toFixed(3) + ',' +
        y.toFixed(3);
    }
  }

  /** when user changes display item */
  function displayItemChange(item, i, scale) {
    view[item].i = i;
    view[item].scale = scale;
    resetView(true);
  }

  /**
   * @summary Selection functions.
   */

  /**
   * Select field change event.
   * @function selectFieldChange
   */
  function selectFieldChange(e) {
    ['search-btn', 'num-sel-p', 'cat-sel-p', 'fea-sel-p', 'des-sel-p']
      .forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
    var span = document.getElementById('str-match-span');
    span.classList.add('hidden');

    // show controls by field type
    var i = e.target.value;
    if (i !== '') {
      i = parseInt(i);
      switch (data.types[i]) {
        case 'number':
          document.getElementById('num-sel-p').classList.remove('hidden');
          break;
        case 'category':
          var p = document.getElementById('cat-sel-p');
          p.appendChild(span);
          span.classList.remove('hidden');
          p.classList.remove('hidden');
          autoComplete(document.getElementById('cat-sel-txt'),
            Object.keys(view.categories[data.cols[i]]).sort());
          break;
        case 'feature':
          var p = document.getElementById('fea-sel-p');
          p.appendChild(span);
          span.classList.remove('hidden');
          p.classList.remove('hidden');
          autoComplete(document.getElementById('fea-sel-txt'),
            Object.keys(view.features[data.cols[i]]).sort());
          break;
        case 'description':
          var p = document.getElementById('des-sel-p');
          p.appendChild(span);
          span.classList.remove('hidden');
          p.classList.remove('hidden');
          break;
      }
      document.getElementById('search-btn').classList.remove('hidden');
    }
  }


  /**
   * Select contigs by criteria.
   * @function selectByCriteria
   * @returns {boolean} whether selection is successful
   */
  function selectByCriteria() {
    var f = document.getElementById('field-list').value;
    if (f === '') {
      window.alert('No search criterium was specified.');
      return false;
    }
    f = parseInt(f);
    var type = data.types[f];

    // filter contigs by currently specified criteria
    var indices = [];
    var excluding = (Object.keys(view.exclusion).length > 0) ? true : false;

    // search by threshold
    if (type === 'number') {

      // validate minimum and maximum thresholds
      var min = document.getElementById('min-txt').value;
      var max = document.getElementById('max-txt').value;
      if (min === '' && max === '') {
        window.alert('Must specify minimum and/or maximum thresholds.');
        return false;
      }
      if (min === '') min = null;
      else if (isNaN(min)) {
        window.alert('Invalid minimum threshold was specified.');
        return false;
      } else min = Number(min);
      if (max === '') max = null;
      else if (isNaN(max)) {
        window.alert('Invalid maximum threshold was specified.');
        return false;
      } else max = Number(max);

      // whether to include lower and upper bounds
      var minIn = (document.getElementById('min-btn').innerHTML === '[') ?
        true : false;
      var maxIn = (document.getElementById('max-btn').innerHTML === '[') ?
        true : false;

      // compare values to threshold(s)
      for (var i = 0; i < data.df.length; i++) {
        if (excluding && i in view.exclusion) continue;
        var val = data.df[i][f];
        if ((val !== null) &&
          (min === null || (minIn ? (val >= min) : (val > min))) &&
          (max === null || (maxIn ? (val <= max) : (val < max)))) {
            indices.push(i);
        }
      }
    }

    // search by keyword
    else {
      var text = document.getElementById(type.substr(0, 3) + '-sel-txt')
        .value;
      if (text === '') {
        window.alert('Must specify a keyword.');
        return false;
      }
      var mcase = document.getElementById('case-btn').classList
        .contains('pressed');
      if (!mcase) text = text.toUpperCase();
      var mwhole = document.getElementById('whole-btn').classList
        .contains('pressed');
      for (var i = 0; i < data.df.length; i++) {
        if (excluding && i in view.exclusion) continue;
        var val = data.df[i][f];
        if (val === null) continue;

        // category or description
        if (type !== 'feature') {
          if (type === 'category') val = val[0];
          if (!mcase) val = val.toUpperCase();
          if (mwhole ? (val === text) : (val.indexOf(text) > -1))
            indices.push(i);
        }

        // feature
        else {
          for (var key in val) {
            if (mwhole ? (key === text) : (key.indexOf(text) > -1)) {
              indices.push(i);
              break;
            }
          }
        }
      }
    }

    var selecting = document.getElementById('sel-select-btn').classList
      .contains('pressed') ? true : false;
    treatSelection(indices, selecting);
    return true;
  }


  /**
   * Deal with selected contigs.
   * @function treatSelection
   * @param {number[]} indices - indices of contigs to be selected / excluded
   * @param {boolean} selecting - select or exclude (default: select)
   */
  function treatSelection(indices, selecting) {
    selecting = (typeof selecting !== 'undefined') ? selecting : true;
    var target = selecting ? view.selection : view.exclusion;

    // new selection
    if (document.getElementById('sel-new-btn').classList.contains('pressed')) {
      Object.keys(target).forEach(function (i) {
        delete target[i];
      });
      indices.forEach(function (i) {
        target[i] = null;
      });
      toastMsg((selecting ? 'Selected' : 'Hid') + ' ' + indices.length +
        ' contig(s).');
    }

    // add to selection
    else if (document.getElementById('sel-add-btn').classList
      .contains('pressed')) {
      var n = 0;
      indices.forEach(function (i) {
        if (!(i in target)) {
          target[i] = null;
          n++;
        }
      });
      toastMsg('Added ' + n + ' contig(s) to ' + (selecting ? 'selection' :
        'invisible') + '.');
    }

    // remove from selection
    else if (document.getElementById('sel-remove-btn').classList
      .contains('pressed')) {
      var toDel = [];
      indices.forEach(function (i) {
        if (i in target) toDel.push(i);
      });
      toDel.forEach(function (i) {
        delete target[i];
      });
      toastMsg('Removed ' + parseInt(toDel.length) + ' contig(s) from ' +
        (selecting ? 'selection' : 'invisible') + '.');
    }

    // remove excluded contigs from selection, if any
    if (!selecting) {
      var toDel = [];
      Object.keys(view.selection).forEach(function (i) {
        if (i in view.exclusion) toDel.push(i);
      });
      toDel.forEach(function (i) {
        delete view.selection[i];
      });
    }

    updateView();
    arena.focus();
  }


  /**
   * Initiate information table.
   * Fields (rows) to be displayed in the information table are determined
   * based on the type and names of data fields.
   * @function initInfoTable
   * @param {Object} data - data object
   */
  function initInfoTable(data, lencol) {
    lencol = lencol || '';
    var table = document.getElementById('info-table');
    table.innerHTML = '';
    var span = document.getElementById('info-ctrl-span');
    var sel = document.getElementById('info-ref-sel');
    sel.innerHTML = '';
    sel.add(document.createElement('option'));
    for (var i = 0; i < data.cols.length; i++) {
      var row = table.insertRow(-1);
      row.setAttribute('data-index', i);
      row.setAttribute('data-col', data.cols[i]);
      row.setAttribute('data-type', data.types[i]);
      if (data.types[i] === 'number') {
        var met = guessColMetric(data.cols[i]);
        row.setAttribute('data-refcol', (met.substr(met.length - 2) === 'by') ? lencol : '');
        row.setAttribute('data-metric', (met.substr(0, 3) === 'sum') ? 'sum' : 'mean');
      }
      row.addEventListener('mouseenter', function () {
        if (document.activeElement === sel) return false;
        var mbtn = document.getElementById('info-metric-btn');
        var pbtn = document.getElementById('info-plot-btn');
        var rspan = document.getElementById('info-ref-span');
        if (Object.keys(view.selection).length === 1 ||
          (this.getAttribute('data-type') !== 'number')) {
          mbtn.classList.add('hidden');
          pbtn.classList.add('hidden');
          rspan.classList.add('hidden');
        } else {
          var met = this.getAttribute('data-metric');
          mbtn.title = 'Metric: ' + met;
          sel.value = this.getAttribute('data-refcol');;
          mbtn.innerHTML = (met === 'sum') ? '&Sigma;<i>x</i>' :
            '<span style="text-decoration: overline;"><i>x</i></span>';
          mbtn.classList.remove('hidden');
          pbtn.classList.remove('hidden');
          rspan.classList.remove('hidden');
        }
        this.cells[this.cells.length - 1].appendChild(span);
        span.classList.remove('hidden');
      });
      row.addEventListener('mouseleave', function () {
        if (document.activeElement === sel) return false;
        span.classList.add('hidden');
      });
      // numeric field select
      if (data.types[i] === 'number') {
        var opt = document.createElement('option');
        opt.text = data.cols[i];
        opt.value = data.cols[i];
        sel.add(opt);
      }
      // 1st cell: field name
      var cell = row.insertCell(-1);
      cell.innerHTML = data.cols[i];
      // 2nd cell: field value
      row.insertCell(-1);
      // 3rd cell: controls
      row.insertCell(-1);
    }
  }


  /**
   * Display a message in toast.
   * @function toastMsg
   * @param {string} msg - message to display
   * @param {number} duration - milliseconds to keep toast visible
   */
  function toastMsg(msg, duration) {
    duration = duration || 1000;
    var toast = document.getElementById('toast');
    toast.innerHTML = msg;
    toast.classList.remove('hidden');
    clearTimeout(view.toasting);
    view.toasting = setTimeout(function () {
      toast.classList.add('hidden');
      toast.innerHTML = '';
    }, duration);
  }

  /**
   * Initiate or restore default view given data.
   * @function resetView
   * @param {boolean} keep - whether keep selection and exclusion (default: no)
   */
  function resetView(keep) {

    // reset view parameters
    keep = keep || false;
    if (!keep) {
      view.selection = {};
      view.exclusion = {};
    }
    view.scale = 1.0;

    // re-center view
    view.pos.x = arena.width / 2;
    view.pos.y = arena.height / 2;

    // calculate min and max of display items
    var items = ['x', 'y', 'size', 'opacity'];
    var indices = [],
      values = [];
    for (var i = 0; i < items.length; i++) {
      indices.push(view[items[i]].i);
      values.push([]);
    }
    var excluding = (Object.keys(view.exclusion).length > 0) ? true : false;
    for (var i = 0; i < data.df.length; i++) {
      if (excluding && i in view.exclusion) continue;
      for (var j = 0; j < items.length; j++) {
        values[j].push(data.df[i][indices[j]]);
      }
    }
    for (var i = 0; i < items.length; i++) {
      view[items[i]].max = scaleNum(Math.max.apply(null, values[i]),
        view[items[i]].scale);
      view[items[i]].min = scaleNum(Math.min.apply(null, values[i]),
        view[items[i]].scale);
    }

    // clear canvas
    overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);

    // re-render
    updateView();
  }


  /**
   * Update view given current view parameters.
   * @function updateView
   * @todo be more simple
   */
  function updateView() {
    renderArena();
    showSelection();
    if (view.drawing) drawPolygon();
  }


  /** render polygon drawn by user */
  function drawPolygon() {
    var color = getComputedStyle(document.getElementById('polygon-color'))
      .color;
    var ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.save();
    ctx.translate(view.pos.x, view.pos.y);
    ctx.scale(view.scale, view.scale);
    for (var i = 0; i < view.polygon.length; i++) {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(view.polygon[i].x, view.polygon[i].y, 3 / view.scale, 0,
        Math.PI * 2, true);
      ctx.closePath();
      ctx.lineWidth = 1 / view.scale;
      ctx.moveTo(view.polygon[i].x, view.polygon[i].y);
      var j = i + 1;
      if (j == view.polygon.length) {
        j = 0;
      }
      ctx.lineTo(view.polygon[j].x, view.polygon[j].y);
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    ctx.restore();
  }


  /**
   * Render arena given current data and view.
   * @function renderArena
   */
  function renderArena() {

    // prepare canvas context
    var ctx = arena.getContext('2d');
    ctx.clearRect(0, 0, arena.width, arena.height);
    ctx.save();
    ctx.translate(view.pos.x, view.pos.y);
    ctx.scale(view.scale, view.scale);

    var excluding = (Object.keys(view.exclusion).length > 0) ? true : false;
    var coloring = Boolean(view.color.i && view.color.palette);

    for (var i = 0; i < data.df.length; i++) {
      if (excluding && i in view.exclusion) continue;
      var datum = data.df[i];

      // determine x- and y-coordinates
      var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
        (view.x.max - view.x.min) - 0.5) * arena.width;
      var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
        (view.y.max - view.y.min) - 0.5) * arena.height;

      ctx.beginPath();

      // determine color
      var c = '0,0,0';
      if (coloring) {
        var val = datum[view.color.i];
        if (val !== null) {
          var cat = val[0];
          if (cat in view.color.map) {
            c = hexToRgb(view.color.map[cat]);
          }
        }
      }

      // determine opacity
      ctx.fillStyle = 'rgba(' + c + ',' + (scaleNum(datum[view.opacity.i],
        view.opacity.scale) / view.opacity.max).toFixed(2) + ')';

      // determine radius and draw circle
      ctx.arc(x, y, scaleNum(datum[view.size.i], view.size.scale) *
        view.size.base / view.size.max, 0, Math.PI * 2, true);

      ctx.closePath();
      ctx.fill();
    }

    // draw grid
    if (view.grid) drawGrid(ctx);

    ctx.restore();
  }


  /**
   * Draw grid.
   * @function drawGrid
   * @todo needs further work
   */
  function drawGrid(ctx) {
    ctx.font = (1 / view.scale).toFixed(2) + 'em monospace';
    ctx.fillStyle = 'dimgray';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1 / view.scale;
    var ig = 5,
      gp = 10;
    for (var x = Math.trunc(view.x.min / ig) * ig; x <= Math.trunc(view.x.max /
        ig) * ig; x += ig) {
      var xx = ((x - view.x.min) / (view.x.max - view.x.min) - 0.5) *
        arena.width;
      ctx.moveTo(xx, -arena.height * 0.5);
      ctx.lineTo(xx, arena.height * 0.5);
      ctx.fillText(x.toString(), xx - gp / view.scale, (view.y.max /
        (view.y.max - view.y.min) - 0.5) * arena.height + gp / view.scale);
    }
    for (var y = Math.trunc(view.y.min / ig) * ig; y <= Math.trunc(view.y.max /
      ig) * ig; y += ig) {
      var yy = ((view.y.max - y) / (view.y.max - view.y.min) - 0.5) *
        arena.height;
      ctx.moveTo(-arena.width * 0.5, yy);
      ctx.lineTo(arena.width * 0.5, yy);
      ctx.fillText(y.toString(), (view.x.min / (view.x.min - view.x.max) -
        0.5) * arena.width - gp / view.scale, yy + gp / view.scale);
    }
    ctx.strokeStyle = 'lightgray';
    ctx.stroke();
  }


  /**
   * Let user draw polygon to select a region of data points.
   * @function polygonSelect
   */
  function polygonSelect() {
    var btn = document.getElementById('polygon-btn');
    if (!view.drawing) {
      btn.innerHTML = btn.innerHTML.substr(0, btn.innerHTML.lastIndexOf(' ') +
        1) + 'Finish';
      view.polygon = [];
      view.drawing = true;
    } else {
      var ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      var indices = [];
      var excluding = (Object.keys(view.exclusion).length > 0) ? true : false;
      for (var i = 0; i < data.df.length; i++) {
        if (excluding && i in view.exclusion) continue;
        var datum = data.df[i];
        var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
          (view.x.max - view.x.min) - 0.5) * arena.width;
        var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
          (view.y.max - view.y.min) - 0.5) * arena.height;
        if (pnpoly(x, y, view.polygon)) indices.push(i);
      }
      btn.innerHTML = btn.innerHTML.substr(0, btn.innerHTML.lastIndexOf(' ') +
        1) + 'Draw';
      view.polygon = [];
      view.drawing = false;

      if (indices.length > 0) {
        var selecting = document.getElementById('sel-select-btn').classList
          .contains('pressed') ? true : false;
        treatSelection(indices, selecting);
      }
    }
  }

  /**
   * Add shadow to selected contigs on canvas.
   * @function showSelection
   */
  function showSelection() {
    var color = getComputedStyle(document.getElementById('highlight-color'))
      .color;
    var ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    var indices = Object.keys(view.selection);
    if (indices.length > 0) {
      ctx.save();
      ctx.translate(view.pos.x, view.pos.y);
      ctx.scale(view.scale, view.scale);
      indices.forEach(function (i) {
        var datum = data.df[i];
        var x = ((scaleNum(datum[view.x.i], view.x.scale) - view.x.min) /
          (view.x.max - view.x.min) - 0.5) * overlay.width;
        var y = ((view.y.max - scaleNum(datum[view.y.i], view.y.scale)) /
          (view.y.max - view.y.min) - 0.5) * overlay.height;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, scaleNum(datum[view.size.i], view.size.scale) *
          view.size.base / view.size.max, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fill();
      });
      ctx.restore();
    }
    updateBinToolbar();
    updateSelectionInfo();
  }

  /**
   * Update information of selected contigs.
   * @function updateSelectionInfo
   */
  function updateSelectionInfo() {
    var table = document.getElementById('info-table');
    var indices = Object.keys(view.selection);
    var nosel = document.getElementById('no-select-msg');
    if (indices.length === 0) { // no contig is selected
      nosel.classList.remove('hidden');
      table.classList.add('hidden');
    } else {
      nosel.classList.add('hidden');
      table.classList.remove('hidden');
      var rows = table.rows;

      // single data point
      if (indices.length === 1) {
        var selData = data.df[indices[0]];
        for (var i = 0; i < rows.length; i++) {
          var val = selData[rows[i].getAttribute('data-index')];
          var type = rows[i].getAttribute('data-type');
          rows[i].cells[1].innerHTML = value2Str(val, type);
        }
      }

      // multiple data points
      else {
        var selData =
          transpose(indices.sort().map(function (i) { return data.df[i]; }));
        rows[0].cells[1].innerHTML = '(' + indices.length + ' contigs)';
        for (var i = 1; i < rows.length; i++) {
          var arr = selData[rows[i].getAttribute('data-index')];
          var refcol = rows[i].getAttribute('data-refcol');
          var refarr = refcol ? selData[data.cols.indexOf(refcol)] : null;
          updateInfoRow(rows[i], arr, refarr);
        }
      }
    }
  }


  /**
   * Update information of selected contigs.
   * @function updateInfoRow
   * @param {Object} row - information table row
   * @param {Array} [arr] - data column
   * @param {Array} [refarr] - reference column
   */
  function updateInfoRow(row, arr, refarr) {
    if (arr === undefined) {
      var data_ = Object.keys(view.selection).sort()
        .map(function (i) { return data.df[i]; });
      var idx = row.getAttribute('data-index');
      arr = data_.map(function (x) { return x[idx]; });
      var refcol = row.getAttribute('data-refcol');
      if (refcol) {
        idx = data.cols.indexOf(refcol);
        refarr = data_.map(function (x) { return x[idx]; });
      } else refarr = null;
    }
    arr = arr || Object.keys(view.selection).sort()
      .map(function (i) { return data.df[i]; })
      .map(function (x) { return x[row.getAttribute('data-index')]; });
    var type = row.getAttribute('data-type');
    if (type !== 'number') {
      row.cells[1].innerHTML = columnInfo(arr, type);
    } else {
      var met = row.getAttribute('data-metric');
      var deci = view.decimals[row.getAttribute('data-col')];
      var refcol = row.getAttribute('data-refcol');
      row.cells[1].innerHTML = columnInfo(arr, type, met, deci, refarr);
    }
  }


  /**
   * Initiate data table based on data.
   * @function initDataTable
   */
  function initDataTable(columns, types) {
    var table = document.getElementById('data-table');
    table.innerHTML = '';
    var header = table.createTHead();
    var row = header.insertRow(-1);
    for (var i = 0; i < columns.length; i++) {
      var cell = row.insertCell(-1);
      cell.setAttribute('data-index', i);
      cell.setAttribute('data-column', columns[i]);
      cell.setAttribute('data-type', types[i]);
      cell.innerHTML = columns[i];
    }
    table.appendChild(document.createElement('tbody'));
  }


  /**
   * Populate data table by data.
   * @function fillDataTable
   * @param {Object} data - data object
   * @param {number} [n=100] - maximum number of rows
   */
  function fillDataTable(data, n) {
    n = n || 100;
    var table = document.getElementById('data-table');
    for (var i = 0; i < n; i++) {
      var row = table.tBodies[0].insertRow(-1);
      for (var j = 0; j < data.cols.length; j++) {
        var cell = row.insertCell(-1);
        cell.innerHTML = value2Str(data.df[i][j], data.types[j]);
      }
    }
  }


  /**
   * Update bins toolbar.
   * @function updateBinToolbar
   */
  function updateBinToolbar() {
    var n = 0;
    var table = document.getElementById('bin-tbody');
    for (var i = 0; i < table.rows.length; i++) {
      if (table.rows[i].classList.contains('selected')) n ++;
    }
    if (n === 0) {
      document.getElementById('delete-bin-btn').classList.add('hidden');
      document.getElementById('merge-bin-btn').classList.add('hidden');
    } else if (n === 1) {
      document.getElementById('delete-bin-btn').classList.remove('hidden');
      document.getElementById('merge-bin-btn').classList.add('hidden');
    } else {
      document.getElementById('delete-bin-btn').classList.remove('hidden');
      document.getElementById('merge-bin-btn').classList.remove('hidden');
    }
    if (n === 0 || Object.keys(view.selection).length === 0) {
      document.getElementById('add-to-bin-btn').classList.add('hidden');
      document.getElementById('remove-from-bin-btn').classList.add('hidden');
    } else {
      document.getElementById('add-to-bin-btn').classList.remove('hidden');
      document.getElementById('remove-from-bin-btn').classList
        .remove('hidden');
    }
  }


  /**
   * Update bin table.
   * @function updateBinTable
   */
  function updateBinTable() {
    var table = document.getElementById('bin-tbody');
    table.innerHTML = '';

    // cache length and coverage data
    var lens = {};
    var covs = {};
    if (view.lencol || view.covcol) {
      var il = view.lencol ? data.cols.indexOf(view.lencol) : null;
      var ic = view.covcol ? data.cols.indexOf(view.covcol) : null;
      for (var i = 0; i < data.df.length; i++) {
        if (il) lens[i] = data.df[i][il];
        if (ic) covs[i] = data.df[i][ic];
      }
    }
    
    Object.keys(bins).sort().forEach(function (name) {
      var row = table.insertRow(-1);

      // 1st cell: name
      var cell = row.insertCell(-1);
      // name label
      var label = document.createElement('span');
      label.innerHTML = name;
      cell.appendChild(label);
      // rename text box
      var text = document.createElement('input');
      text.type = 'text';
      text.value = name;
      text.classList.add('hidden');
      text.addEventListener('focus', function () {
        this.select();
      });
      text.addEventListener('keyup', function (e) {
        binNameKeyUp(e);
      });
      cell.appendChild(text);

      // 2nd cell: contigs
      var cell = row.insertCell(-1);
      cell.innerHTML = Object.keys(bins[name]).length;

      // 3rd cell: length (kb)
      var cell = row.insertCell(-1);
      if (view.lencol) {
        var sum = 0;
        for (var i in bins[name]) sum += lens[i];
        cell.innerHTML = parseInt(sum / 1000);
      } else cell.innerHTML = 'na';
      
      // 4th cell: abundance (%)
      var cell = row.insertCell(-1);
      if (view.lencol && view.covcol) {
        var sum = 0;
        for (var i in bins[name]) sum += lens[i] * covs[i];
        cell.innerHTML = (sum * 100 / view.abundance).toFixed(2);
      } else cell.innerHTML = 'na';
    });
  }


  /**
   * Bin name textbox keyup event.
   * @function binNameKeyUp
   */
  function binNameKeyUp(e) {
    var text = e.target;
    var label = text.parentElement.firstElementChild;
    var name = label.innerHTML;
    if (e.keyCode === 13) { // press Enter to save new name
      if (text.value === '') {
        text.value = name;
        toastMsg('Bin name must not be empty.')
      } else if (text.value === name) {
        text.classList.add('hidden');
        label.classList.remove('hidden');
      } else {
        var success = renameBin(bins, name, text.value);
        if (success) {
          text.classList.add('hidden');
          label.innerHTML = text.value;
          label.classList.remove('hidden');
        } else {
          toastMsg('Bin name "' + text.value + '" already exists.');
          text.value = name;
        }
      }
    } else if (e.keyCode === 27) { // press ESC to cancel editing
      text.classList.add('hidden');
      label.classList.remove('hidden');
    }
  }


  /**
   * Export bins as a plain text file.
   * @function exportBins
   */
  function exportBins() {
    var idmap = {};
    for (var i = 0; i < data.df.length; i++) {
      idmap[i] = data.df[i][0];
    }
    var tsv = '';
    Object.keys(bins).sort().forEach(function (name) {
      tsv += (name + '\t' + Object.keys(bins[name]).sort().map(function (i) {
        return idmap[i];
      }).join(',') + '\n');
    });
    var a = document.createElement('a');
    a.href = "data:text/tab-separated-values;charset=utf-8," +
      encodeURIComponent(tsv);
    a.download = 'bins.tsv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }


  /**
   * Export data as a JSON file.
   * @function exportJSON
   * @see https://stackoverflow.com/questions/17527713/force-browser-to-
   * download-image-files-on-click
   * This way avoids saving the lengthy href.
   */
  function exportJSON() {
    var a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(data, null, 2));
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }


  /**
   * Take a screenshot and export as a PNG image.
   * @function exportPNG
   */
  function exportPNG() {
    var a = document.createElement('a');
    a.href = arena.toDataURL('image/png');
    a.download = 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  
  /**
   * Test function.
   * @function testFunction
   */
  function testFunction() {
    console.log('hi');
  }
});
