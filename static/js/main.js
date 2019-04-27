"use strict";

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
 * @module main
 * @file Definition and initiation of the master object.
 * @description The whole program has only one top-level entry: the window load
 * event. It initializes the master object and passes it to functions. There is
 * no global variable.
 */


/**
 * Master object.
 * @class
 * @function masterObj
 * @property {Object} data - contig data and metadata
 * @property {Object} view - current view
 * @property {Object} stat - transient status
 * @property {Object.<number, null>} pick - indices of picked contigs
 * @property {Object.<number, null>} mask - indices of masked contigs
 * @property {Object.<string, Object.<number, null>>} bins - binning plan
 * @property {Object} rena - arena canvas DOM
 * @property {Object} oray - overlay canvas DOM
 * @property {Object} palettes - available palettes
 */
function masterObj() {

  /**
   * Data object.
   * @member {Object} data
   * @property {string[]} cols - field names
   * @property {string[]} types - field types
   * @property {Object.<string, Object.<string, string>>} dicts - dictionaries
   * @property {Array.<Array.<*>>} df - data frame (2D array)
   */
  this.data = {
    cols: [], 
    types: [],
    dicts: {},
    df: [],
  }

  /**
   * View object.
   * @member {Object} view
   * @property {{x: number, y: number}} pos - viewport position
   * @property {number} scale - scaling factor
   * @property {Object} x - x-axis variable
   * @property {Object} y - y-axis variable
   * @property {Object} size - size variable
   * @property {Object} opacity - opacity variable
   * @property {boolean} grid - whether show grid
   * @property {number} rbase - base radius (px) of contig
   * @property {string} contPal - continuous palette
   * @property {string} discPal - discrete palette
   */
  this.view = {
    /** canvas rendering */
    pos: {
      x: 0,
      y: 0
    },
    scale: 1.0,

    /** display variables */
    x: {},
    y: {},
    size: {},
    opacity: {},
    color: {},

    /** display features */
    grid: false,
    rbase: 15,
    contPal: DEFAULT_CONTINUOUS_PALETTE,
    discPal: DEFAULT_DISCRETE_PALETTE,

    /** pre-cached data info */
    lencol: null, // name of putative "length" column
    covcol: null, // name of putative "coverage" column
    categories: {}, // column to category to frequency map
    features: {}, // column to category to frequency map
    decimals: {}, // column to maximum decimals map
    abundance: null // total abundance (sum of len * cov)
  };

  /**
   * Display item properties.
   * @member {Object} * 
   * @property {number} i - data column index
   * @property {string} scale - scale key
   * @property {number} min - minimum after scaling
   * @property {number} max - maximum after scaling
   * @property {number} lower - lower bound of visual parameter
   * @property {number} upper - upper bound of visual parameter
   * @property {boolean} zero - whether lower bound is zero or minimum
   */
  var items = ['x', 'y', 'size', 'opacity', 'color'];
  var params = ['i', 'scale', 'min', 'max'];
  for (var i = 0; i < items.length; i++) {
    for (var j = 0; j < params.length; j++) {
      this.view[items[i]][params[j]] = null;
    }
  }

  items = ['size', 'opacity', 'color'];
  for (var i = 0; i < items.length; i++) {
    var obj = this.view[items[i]];
    obj['lower'] = 0;
    obj['upper'] = 100;
    obj['zero'] = true;
  }

  this.view.color['palette'] = null;
  this.view.color['map'] = null;

  /**
   * Stat object
   * @member {Object} stat
   * @property {boolean} mousedown - mouse is down
   * @property {boolean} mousemove - mouse is moving
   * @property {{x: number, y: number}} drag - dragging position
   * @property {string} selmode - selection mode (new, add, remove)
   * @property {boolean} masking - masking mode is on
   * @property {boolean} drawing - polygon drawing is ongoing
   * @property {Array.<{x: number, y: number}>} polygon - vertices of polygon
   * @property {number} resizing - window resizing is ongoing
   * @property {number} toasting - toasting is ongoing
   */
  this.stat = {
    mousedown: false,
    mousemove: false,
    drag: {},
    selmode: 'new',
    masking: false,
    drawing: false,
    polygon: [],
    resizing: null,
    toasting: null,
  }

  /** Current picked and masked contigs. */
  this.pick = {};
  this.mask = {};

  /** Current binning plan. */
  this.bins = {};

  /** Main canvases for rendering. */
  this.rena = null;
  this.oray = null;
}


/**
 * @summary Window load event, also top-level entry for all functions.
 */
window.addEventListener('load', function () {

  // single global master object
  var mo = new masterObj();

  // load demo data, if available
  if (typeof dataPath !== 'undefined') {
    updateDataFromRemote(dataPath, mo);
  }

  // the two main canvases that render the graphs
  mo.rena = document.getElementById('arena-canvas');
  mo.oray = document.getElementById('overlay-canvas');

  // initiate color palette object
  mo.palettes = new PaletteObj();

  // initiate controls
  initControls(mo);

  // initiate canvas
  initCanvas(mo);

  // update view based on data
  updateViewByData(mo);

});

 
/**
 * Test function.
 * @function testFunction
 */
function testFunction() {
  console.log('Hi there!');
}
