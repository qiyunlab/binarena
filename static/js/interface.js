"use strict";

/**!
 * @module interface
 * @file The graphical user interface.
 * @description This module adds event listeners to DOMs that are predefined in
 * the HTML file, and enable pure interface-related actions. It triggers init-
 * tialization functions defined in this module or external modules to build
 * individual components of the program.
 */


/**
 * Initialize graphical user interface.
 * @function initGUI
 * @param {Object} mo - main object
 */
function initGUI(mo) {

  // reset controls
  resetControls();

  // initialize program window
  initWindow(mo);

  // initalize shared components
  initPanelHeads();      // panel heads
  initBtnGroups();       // button groups
  initCloseBtns();       // close buttons
  initListSel();         // list select table
  initToast();           // toast

  // initialize lightweight components defined in this module
  initContextMenu(mo);   // context menu
  initSideFrame(mo);     // side frame
  initScaleSel(mo);      // scale select table
  initSettings(mo);      // setting panel
  initWidgets(mo);       // widgets

  // initialize significant components defined in external modules
  initDisplayCtrl(mo);   // display controls    ( 'display.js'   )
  initSelectCtrl(mo);    // select controls     ( 'select.js'    )
  initBinCtrl(mo);       // binning controls    ( 'binning.js'   )
  initSearchCtrl(mo);    // search controls     ( 'search.js'    )
  initMiniPlotCtrl(mo);  // mini plot controls  ( 'miniplot.js'  )
  initDataTableCtrl(mo); // data table controls ( 'datable.js'   )
  initCalcBoxCtrl(mo);   // calculator controls ( 'calculate.js' )
  initCanvas(mo);        // main canvas         ( 'render.js'    )

}


/**
 * Reset all input and select elements.
 * @function resetControls
 * @description I didn't find a way to do this automatically...
 */
function resetControls() {
  for (let dom of document.querySelectorAll('input, select')) {
    dom.value = '';
  }
}


/**
 * Update controls based on new data.
 * @function updateControls
 * @param {Object} mo - main object
 */
function updateControls(mo) {
  const cols = mo.cols,
        view = mo.view;
  updateSearchCtrl(cols);
  updateDisplayCtrl(cols, view);
  updateMiniPlotCtrl(cols);
}


/**
 * Initialize program window.
 * @function initWindow
 * @param {Object} mo - main object
 */
function initWindow(mo) {

  // window resize event
  window.addEventListener('resize', function () {
    resizeWindow(mo);
  });

  // main frame resize event
  const observer = new MutationObserver(function (mutations) {
    const mutation = mutations[0];
    if (mutation.attributeName !== 'style') return;
    const mf = mutation.target;
    if (mf.id !== 'main-frame') return;
    const w = mf.style.width;
    if (w !== '100%') {
      const w0 = mf.getAttribute('data-width');
      if (!(w0) || w !== w0) {
        mf.setAttribute('data-width', w);
        resizeWindow(mo);
      }
    }
  });
  observer.observe(byId('main-frame'), { attributes: true });

  // window click event
  // hide popup elements (context menu, dropdown selection, etc.)
  window.addEventListener('click', function (e) {
    if (e.button === 0) { // left button

      // hide dropdown divs if event target is not marked as "dropdown"
      let hideDropdown = true;
      const dds = document.getElementsByClassName('dropdown');
      for (let dd of dds) {
        if (dd.contains(e.target)) {
          hideDropdown = false;
          break;
        }
      }
      if (hideDropdown) {
        for (let div of document.querySelectorAll('div.popup')) {
          div.classList.add('hidden');
        }
      }
    }
  });

}


/**
 * Window resize event.
 * @function resizeWindow
 * @param {Object} mo - main object
 * @description also manually triggered when user resizes main frame
 */
function resizeWindow(mo) {
  const [w, h] = calcArenaDimensions(mo.rena);
  toastMsg(`Plot size: ${w} x ${h}`, mo.stat);
  clearTimeout(mo.stat.resizing);
  mo.stat.resizing = setTimeout(function () {
    resizeArena(mo);
  }, 250); // redraw canvas after 0.25 sec
}


/**
 * Initialize panel heads.
 * @function initPanelHeads
 */
function initPanelHeads() {
  for (let btn of document.querySelectorAll(
    '.panel-head span:last-of-type button')) {
    btn.addEventListener('click', function () {
      const panel = this.parentElement.parentElement.nextElementSibling;
      if (panel !== null) panel.classList.toggle("hidden");
    });
  }
}


/**
 * Initialize button groups.
 * @function initBtnGroups
 * @description Currently there are no button groups.
 */
function initBtnGroups() {
  const groups = document.getElementsByClassName('btn-group');
  let btns, btn;
  for (let group of groups) {
    btns = group.getElementsByTagName('button');
    for (btn of btns) {
      btn.addEventListener('click', function () {
        if (this.classList.contains('pressed')) return;
        btns = this.parentElement.getElementsByTagName('button');
        for (let btn of btns) {
          if (btn !== this) btn.classList.remove('pressed');
        }
        this.classList.add('pressed');
      });
    }
  }
}


/**
 * Initialize modal close buttons.
 * @function initCloseBtns
 */
function initCloseBtns() {
  for (let div of document.querySelectorAll('.modal-head')) {
    const btn = document.createElement('button');
    btn.innerHTML = '&#x2715;'; // cross mark
    btn.title = 'Close window';
    btn.addEventListener('click', function () {
      div.parentElement.parentElement.classList.add('hidden');
    });
    div.lastElementChild.appendChild(btn);
  }
}


/**
 * Initialize list select table.
 * @function initListSel
 * @description The list select table is like a dropdown menu. It is launched
 * by a source DOM. The user clicks an item, and this code will transfer the
 * selection back to the source DOM and trigger an event of it.
 */
function initListSel() {
  byId('list-options').addEventListener('click', function (e) {
    let src;
    for (let row of this.rows) {
      if (row.contains(e.target)) {
        src = byId(this.getAttribute('data-target-id'));
        src.value = row.cells[0].textContent;
        if (src.nodeName.toLowerCase() == 'input') {
          src.focus(); // for text box etc.
        } else {
          src.click(); // for button, menu item, etc.
        }
        this.parentElement.classList.add('hidden');
        break;
      }
    }
  });

}


/**
 * Initialize toast.
 * @function initToast
 */
function initToast() {
  byId('toast-close-btn').addEventListener('click', function () {
    byId('toast').classList.add('hidden');
  });
}


/**
 * Initialize context menu.
 * @function initContextMenu
 * @param {Object} mo - main object
 */
function initContextMenu(mo) {

  // main button
  byId('dash-btn').addEventListener('click', function () {
    this.classList.toggle('active');
    byId('dash-panel').classList.toggle('hidden');
    byId('dash-frame').classList.toggle('active');
  });

  // context menu button click
  byId('menu-btn').addEventListener('click', function () {
    const rect = byId('menu-btn').getBoundingClientRect();
    const menu = byId('context-menu');
    // menu.style.right = 0;
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';
    menu.classList.toggle('hidden');
  });

  // open file (a hidden element)
  byId('open-file').addEventListener('change', function (e) {
    uploadFile(e.target.files[0], mo);
  });

  // load data
  byId('load-data-a').addEventListener('click', function () {
    byId('open-file').click();
  });

  // show data table
  byId('show-data-a').addEventListener('click', function () {
    if (mo.cache.nctg) mo.tabled = [...mo.data[0].keys()];
    fillDataTable(mo, 'Dataset');
    byId('data-table-modal').classList.remove('hidden');
  });

  // close current data
  byId('close-data-a').addEventListener('click', function () {
    closeData(mo);
    updateViewByData(mo);
  });

  // export bins
  byId('export-bins-a').addEventListener('click', function () {
    exportBinPlan(mo.binned);
  });

  // export data table as JSON
  byId('export-data-a').addEventListener('click', function () {
    exportDataTable(mo);
  });

  // export image as PNG
  byId('export-image-a').addEventListener('click', function () {
    exportPNG(mo.rena);
  });

  // reset view
  byId('reset-view-a').addEventListener('click', function () {
    byId('reset-btn').click();
  });

}


/**
 * Initialize side frame.
 * @function initSideFrame
 * @param {Object} mo - main object
 */
function initSideFrame(mo) {

  // Show/hide side frame.
  byId('hide-side-btn').addEventListener('click', function () {
    byId('side-frame').classList.add('hidden');
    byId('show-frame').classList.remove('hidden');
    const mf = byId('main-frame');
    mf.style.resize = 'none';
    mf.style.width = '100%';
    resizeArena(mo);
  });

  byId('show-side-btn').addEventListener('click', function () {
    byId('show-frame').classList.add('hidden');
    byId('side-frame').classList.remove('hidden');
    const mf = byId('main-frame');
    mf.style.resize = 'horizontal';
    const w = mf.getAttribute('data-width');
    if (w) mf.style.width = w;
    resizeArena(mo);
  });

}


/**
 * Initialize scale select table.
 * @function initScaleSel
 * @param {Object} mo - main object
 * @description The scale select table is a dropdown menu containing multiple
 * scales (such as linear, square, square root, logarithm, exponential). It is
 * launched by a source DOM. The user clicks a scale, and the function will
 * transfer the selection back to the source DOM and trigger a display item
 * change event.
 */
 function initScaleSel(mo) {

  // scale select buttons
  // It is a dropdown menu of various scaling methods.
  let lst = byId('scale-select');
  for (let btn of document.querySelectorAll('button.scale-btn')) {
    btn.addEventListener('click', function () {
      byId('current-scale').innerHTML = this.getAttribute('data-scale');
      lst.setAttribute('data-target-id', this.id);
      const rect = this.getBoundingClientRect();
      lst.style.top = rect.bottom + 'px';
      lst.style.left = rect.left + 'px';
      lst.classList.toggle('hidden');
    });
  }

  // scale select options
  let table = byId('scale-options');
  for (let row of table.rows) {
    for (let cell of row.cells) {

      // mouse over to show scale name
      cell.addEventListener('mouseover', function () {
        byId('current-scale').innerHTML = this.getAttribute('data-scale');
      });

      // click to select a scale
      cell.addEventListener('click', function () {
        const src = byId(byId('scale-select').getAttribute('data-target-id'));
        if (src.innerHTML !== this.innerHTML) {
          src.innerHTML = this.innerHTML;
          const scale = this.getAttribute('data-scale');
          src.setAttribute('data-scale', scale);
          src.title = `Scale: ${scale}`;
          const item = src.id.split('-')[0];
          displayItemChange(item, byId(`${item}-field-sel`).value, scale, mo);
        }
      });
    }
  }

}


/**
 * Initialize setting panel.
 * @function initSettings
 * @param {Object} mo - main object
 */
function initSettings(mo) {

   // Display settings.
   byId('set-btn').addEventListener('click', function () {
    this.classList.toggle('pressed');
    this.nextElementSibling.classList.toggle('hidden');
  });

  // Change length filter.
  let btn = byId('len-filt');
  btn.value = mo.filter.len;
  btn.addEventListener('blur', function () {
    const val = parseInt(this.value);
    if (val !== mo.filter.len) {
      mo.filter.len = val;
      toastMsg(`Changed contig length threshold to ${val}.`, mo.stat);
    }
  });

  // Change coverage filter.
  btn = byId('cov-filt');
  btn.value = mo.filter.cov;
  btn.addEventListener('blur', function () {
    const val = parseFloat(this.value);
    if (val != mo.filter.cov) {
      mo.filter.cov = val;
      toastMsg(`Changed contig coverage threshold to ${val}.`, mo.stat);
    }
  });

  // Show/hide grid.
  byId('grid-chk').addEventListener('change', function () {
    mo.view.grid = this.checked;
    byId('coords-label').classList.toggle('hidden', !this.checked);
    renderArena(mo);
  });

  // Show/hide navigation controls.
  byId('nav-chk').addEventListener('change', function () {
    byId('nav-panel').classList.toggle('hidden', !this.checked);
  });

  // Show/hide frequent buttons.
  byId('freq-chk').addEventListener('change', function () {
    byId('freq-panel').classList.toggle('hidden', !this.checked);
  });

}


/**
 * Initialize widget panel.
 * @function initWidgets
 * @param {Object} mo - main object
 */
function initWidgets(mo) {
  const view = mo.view;

  // draw polygon to select contigs
  byId('polygon-btn').addEventListener('click', function (e) {
    polygonSelect(mo, e.shiftKey);
  });

  // take screenshot
  byId('screenshot-btn').addEventListener('click', function () {
    exportPNG(mo.rena);
  });

  // reset graph
  byId('reset-btn').addEventListener('click', function () {
    resetView(mo);
  });

  // zoom in/out
  byId('zoomin-btn').addEventListener('click', function () {
    view.scale /= 0.75;
    updateView(mo);
  });

  byId('zoomout-btn').addEventListener('click', function () {
    view.scale *= 0.75;
    updateView(mo);
  });

  // move around
  byId('left-btn').addEventListener('click', function () {
    view.posX -= 15;
    updateView(mo);
  });

  byId('up-btn').addEventListener('click', function () {
    view.posY -= 15;
    updateView(mo);
  });

  byId('right-btn').addEventListener('click', function () {
    view.posX += 15;
    updateView(mo);
  });

  byId('down-btn').addEventListener('click', function () {
    view.posY += 15;
    updateView(mo);
  });

}

/**
 * Determine the most appropriate position of a popup.
 * @function popupPos
 * @param {Object} source - source DOM
 * @param {Object} target - target DOM
 * @param {string} direc - direction of popup
 * @param {boolean} same - keep same dimension
 * @description By default it pops up toward bottom and right. But if the
 * current position is too close to the right or bottom edge of the browser,
 * it will pop up toward top and/or left.
 */
function popupPos(source, target, direc, same) {
  const th = 0.8, // threshold: 80%
        vw = window.innerWidth,
        vh = window.innerHeight,
        ts = target.style;
  const rect = source.getBoundingClientRect();

  // pop up toward right or left
  if (['left', 'right'].includes(direc)) {
    if (same) {
      ts.top = rect.top + 'px';
      ts.height = (rect.top - rect.bottom) + 'px';
    } else if (rect.top <= vh * th) {
      ts.top = rect.top + 'px';
      ts.bottom = '';
    } else {
      ts.top = '';
      ts.bottom = (vh - rect.bottom) + 'px';
    }
    if (direc === 'right') {
      ts.left = rect.right + 'px';
      ts.right = '';
    } else if (direc === 'left') {
      ts.right = (vw - rect.left) + 'px';
      ts.left = '';
    }
  }

  // pop up toward bottom
  else if (direc === 'down') {
    ts.top = rect.bottom + 'px';
    ts.bottom = '';
    if (same) {
      ts.left = rect.left + 'px';
      ts.width = (rect.right - rect.left) + 'px';
    } else if (rect.left <= vw * th) {
      ts.left = rect.left + 'px';
      ts.right = '';
    } else {
      ts.left = '';
      ts.right = (vw - rect.right) + 'px';
    }
  }
}


/**
 * Let user select from a list displayed in a dropdown menu.
 * @function listSelect
 * @param {Object} src - source DOM
 * @param {string[]} lst - list of options
 * @param {string} direc - direction of list expansion
 * @param {boolean} same - keep same dimension
 */
function listSelect(lst, src, direc, same) {
  const div = byId('list-select');
  div.classList.add('hidden');
  popupPos(src, div, direc, same);
  const table = byId('list-options');
  table.setAttribute('data-target-id', src.id);
  table.innerHTML = '';
  for (let item of lst) {
    const row = table.insertRow(-1);
    const cell = row.insertCell(-1);
    cell.innerHTML = item;
  }
  div.classList.remove('hidden');
}


/**
 * Get HTML code for scale code
 * @function scale2HTML
 * @param {string} scale - scale code
 * @returns {string} - HTML code
 */
function scale2HTML(scale) {
  const table = byId('scale-options');
  for (let row of table.rows) {
    for (let cell of row.cells) {
      if (cell.getAttribute('data-scale') === scale) return cell.innerHTML;
    }
  }
}


/**
 * Display a message in toast.
 * @function toastMsg
 * @param {string} msg - message to display
 * @param {Object} stat - status object
 * @param {number} duration - milliseconds to keep toast visible; if omitted,
 * the default time is 1 sec; set 0 to keep it visible for ever
 * @param {boolean} loading - display loading dots
 * @param {boolean} toclose - display a close button
 */
function toastMsg(msg, stat, duration, loading, toclose) {
  if (duration === undefined) duration = 2000;
  const toast = byId('toast');
  toast.firstElementChild.innerHTML = msg;
  byId('toast-dots').classList.toggle('hidden', !loading);
  byId('toast-close-btn').classList.toggle('hidden', !toclose);
  toast.classList.remove('hidden');
  if (duration) {
    clearTimeout(stat.toasting);
    stat.toasting = setTimeout(function () {
      toast.classList.add('hidden');
      toast.firstElementChild.innerHTML = '';
    }, duration);
  }
}


/**
 * Add auto-complete function to a text box.
 * @function autoComplete
 * @param {Object} src - source text box
 * @param {*} arr - list of options
 * @description Modified based on the W3Schools tutorial:
 * @see {@link https://www.w3schools.com/howto/howto_js_autocomplete.asp}
 */
function autoComplete(src, arr) {
  let focus;

  // this is to avoid re-assign listener when making autocomplete multiple
  // times, although I didn't validate
  src.addEventListener('input', inputEvent);
  function inputEvent(e) {
    const val = e.currentTarget.value;
    if (!val) return false;
    const VAL = val.toUpperCase();
    const l = val.length;
    const lst = [];
    for (let itm of arr) {
      const prefix = itm.substring(0, l);
      if (prefix.toUpperCase() === VAL) {
        lst.push('<strong>' + prefix + '</strong>' + itm.substring(l));
      }
    }
    listSelect(lst, src, 'down', true);
    focus = -1;
  }

  // keyboard controls
  src.addEventListener('keydown', keydownEvent);
  function keydownEvent(e) {
    const table = byId('list-options');
    switch (e.key) {
      case 'Down':
      case 'ArrowDown':
        focus ++;
        addActive(table);
        break;
      case 'Up':
      case 'ArrowUp':
        focus --;
        addActive(table);
        break;
      case 'Enter':
        e.preventDefault();
        if (focus > -1) table.rows[focus].cells[0].click();
        break;
    }
  }

  function addActive(table) {
    removeActive(table);
    if (focus >= table.rows.length) {
      focus = 0;
    } else if (focus < 0) {
      focus = (table.rows.length - 1);
    }
    table.rows[focus].cells[0].classList.add('active');
  }

  function removeActive(table) {
    for (let row of table.rows) {
      row.cells[0].classList.remove('active');
    }
  }
}


/**
 * Format a value to be a label depending on content.
 * @function formatValueLabel
 * @param {number} value - value to format
 * @param {number} icol - column index
 * @param {number} digits - number of digits to keep
 * @param {boolean} unit - whether to keep unit if available
 * @param {Object} mo - main object
 */
function formatValueLabel(value, icol, digits, unit, mo) {
  const ilen = mo.cache.speci.len;
  if (ilen && icol === ilen) {
    const fmtlen = FormatLength(value);
    let res = formatNum(fmtlen[0], digits);
    if (unit) res += ' ' + fmtlen[1];
    return res;
  } else {
    return formatNum(value, digits);
  }
}


/**
 * Append an element to a container with inner HTML
 * @function appendHTML
 * @param {Object} dom - container DOM
 * @param {string} tag - element tag
 * @param {string} html - inner HTML of element
 */

function appendHTML(dom, tag, html) {
  let e = document.createElement(tag);
  e.innerHTML = html;
  dom.appendChild(e);
}


/**
 * Load program theme
 * @function loadTheme
 * @returns {Object} theme
 * @description Currently, it reads colors defined in "theme.css".
 */
function loadTheme() {
  const theme = {};
  theme.selection = getComputedStyle(byId('selection-color')).color;
  theme.polygon = getComputedStyle(byId('polygon-color')).color;
  theme.typecolors = {
    num: getComputedStyle(byId('type-num-color')).backgroundColor,
    cat: getComputedStyle(byId('type-cat-color')).backgroundColor,
    fea: getComputedStyle(byId('type-fea-color')).backgroundColor,
    des: getComputedStyle(byId('type-des-color')).backgroundColor
  };
  return theme;
}
