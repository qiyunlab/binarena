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
 * @file Definition and initiation of the main object.
 * @description The whole program has only one top-level entry: the window load
 * event. It initializes the main object and passes it to functions. There is
 * no global variable.
 */


/**
 * main object.
 * @class
 * @function mainObj
 * @property {Object} data - contig data and metadata
 * @property {Object} view - current view
 * @property {Object} stat - transient status
 * @property {Object.<number, null>} pick - indices of picked contigs
 * @property {Object.<number, null>} mask - indices of masked contigs
 * @property {Object.<string, Object.<number, null>>} bins - binning plan
 * @property {Object} rena - arena canvas DOM
 * @property {Object} oray - overlay canvas DOM
 * @property {Object} mini - mini plot
 * @property {number[]} dist - pairwise distances among all contigs 
 * @property {Object} palettes - available palettes
 */
function mainObj() {

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
   * @property {string} contpal - continuous palette
   * @property {string} discpal - discrete palette
   * @property {number} ncolor - number of categories to color
   * @property {{len: number, cov: number}} filter - contig filter
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
    contpal: DEFAULT_CONTINUOUS_PALETTE,
    discpal: DEFAULT_DISCRETE_PALETTE,
    ncolor: 7,

    /** contig filter */
    filter: {
      len: 1000,
      cov: 1.0
    },

    /** indices of special columns */
    spcols: {
      len: null,
      cov: null,
      gc: null
    },

    /** pre-cached data info */
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

  /**
   * Item-specific properties
   */
  this.view.color['contmap'] = [];
  this.view.color['discmap'] = {};

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

  /**
   * Mini object
   * @member {Object} mini
   * @property {number} canvas - mini canvas to plot data
   * @property {number} field - field index of data to plot
   * @property {boolean} log - whether log-transform data
   * @property {number} nbin - number of bins in histogram
   * @property {number[]} hist - saved bin sizes
   * @property {number[]} edges - saved bin edges
   * @property {number} bin0 - first bin in selection range
   * @property {number} bin0 - last bin in selection range
   * @property {number} drag - mouse dragging starting position
   */
  this.mini = {
    canvas: null,
    field:  null,
    log:   false,
    nbin:     10,
    hist:   null,
    edges:  null,
    bin0:   null,
    bin1:   null,
    drag:   null,
  }

  /**
   * Pairwise distances
   * @member {Array} dist
   * @description Pairwise distances among all contigs, stored as a condensed
   * distance matrix (a 1D array). Calculating such a matrix is expensive,
   * therefore it is cached here to avoid duplicated calculations.
   */
  this.dist = null;
}


/**
 * Shorthand for DOM selection.
 */
var byId = function (id) { return document.getElementById(id); };


/**
 * @summary Window load event, also top-level entry for all functions.
 */
window.addEventListener('load', function () {

  // single global main object
  var mo = new mainObj();

  // load demo data, if available
  if (typeof dataPath !== 'undefined') {
    updateDataFromRemote(dataPath, mo);
  }

  // the two main canvases that render the graphs
  mo.rena = byId('arena-canvas');
  mo.oray = byId('overlay-canvas');

  // the mini plot canvas
  mo.mini.canvas = byId('mini-canvas');

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
