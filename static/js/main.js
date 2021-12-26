"use strict";

/**!
 * @name BinaRena
 * @author Qiyun Zhu <qiyunzhu@gmail.com>
 * @version 0.0.1
 * @license BSD 3-Clause
 *
 * @module main
 * @file Definition and initiation of the main object.
 * @description
 * 
 * The whole program has only one top-level entry: the window load event. It
 * initializes the main object and passes it to functions. 
 * 
 * The main object stores all information of the program. There is no global
 * variable.
 * 
 * The main object is merely for storing information, but it does not have
 * methods. The codebase is data-oriented.
 */


/**
 * Main object.
 * @class
 * @function mainObj
 * @property {Array}  data   - contig data
 * @property {Object} cols   - column metadata
 * @property {Object} dict   - dictionary
 * @property {Object} filter - contig filter
 * @property {Object} cache  - data cache
 * @property {Object} view   - current view
 * @property {Object} stat   - transient status
 * @property {Object} pick   - indices of selected contigs
 * @property {Object} mask   - indices of masked contigs
 * @property {Object} bins   - binning plan
 * @property {Object} rena   - arena canvas
 * @property {Object} oray   - overlay canvas
 * @property {Object} mini   - mini plot
 * @property {Object} theme  - program theme
 */
function mainObj() {

  /**
   * Dataset.
   * @member {Array} data
   * @description The data object stores the raw data of the assembly.
   * 
   * It is a 2D array. Each child array stores the data of a column (field).
   * The array index is the index of each contig.
   * 
   * This structure ensures the homogeneity of data type in each child array.
   * Modern JavaScript engines can identify such property and optimize the
   * array performance accordingly.
   * 
   * This data structure is also used in common data table libraries, such as
   * Pandas.
   * @see {@link https://pandas.pydata.org/pandas-docs/stable/user_guide/
   * dsintro.html}
   * 
   * Theoretically, a potential further optimization is to replace normal
   * arrays with typed arrays, which are more efficient in both memory and
   * access.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/
   * Typed_arrays}
   * 
   * However, the hassle of detecting and assigning data types may or may not
   * be worth since modern JavaScript engines have similar optimizations under
   * the hood for regular arrays of homogeneous data type. Therefore, this
   * remains for further investigation.
   */
  this.data = [];


  /**
   * Data columns.
   * @member {Object} cols
   * @description The metadata of columns (fields) of the dataset.
   * 
   * @property {string[]} names - column names
   * Must be unique except for weight columns, which have the same column name
   * as the original column.
   * 
   * @property {string[]} types - column types
   * May have the following values:
   * @param {string}   id  - unique contig identifier, must be the 1st column
   * @param {number}   num - numeric variable
   * - Missing data are stored as NaN.
   * @param {string}   cat - categorical variable
   * - Missing data are stored as '' (empty string).
   * @param {string[]} fea - feature sets
   * - Missing data are stored as [] (empty array).
   * @param {string[]} des - description
   * - Missing data are stored as [] (empty array).
   * @param {number}   cwt - weights of categories
   * @param {number[]} fwt - weights of features (same order)
   */
  this.cols = {
    names: [],
    types: []
  };


  /**
   * Dictionary of categories and features.
   * @member {Object.<Map>} dict
   * @description Mappings of category and feature IDs to descriptions.
   * Examples include taxID to taxon name, gene ID to product name, etc.
   * Key: column index, value: mapping.
   * @todo This feature is currently not in use.
   */
  this.dict = {};


  /**
   * Contig filter.
   * @member {Object.<Map>} filt
   * @description Filter of input contigs by their properties, currently
   * including length and coverage. Contigs that don't meet the criteria
   * will not be read into the dataset.
   * @property {number} len - minimum length threshold
   * @property {number} cov - minimum coverage threshold
   */
  this.filter = {
    len: 1000,
    cov: 1.0
  };


  /**
   * Data cache.
   * @member {Object} cache
   * @description Reusable calculation results based on the dataset.
   * 
   * @property {number} nctg - number of contigs in the dataset
   * Equivalent to data[0].length. Stored in case dataset is closed.
   * 
   * @property {Object.<number>} speci - indices of special columns
   * Three contig properties are special in the analysis:
   * @param len - length
   * @param cov - coverage
   * @param gc  - GC content
   * 
   * @property {number} abund - total abundance of contigs
   * Equals to the sum of (length x coverage) of all contigs.
   * Used to calculate the relative abundance of individual contigs and bins.
   *
   * @property {Object.<Map>} freqs - category and feature frequencies
   * Used to determine the most frequent categories or features to display.
   * Key: column index, value: frequency map.
   * @todo Feature frequency is currently not in use.
   * 
   * @property {number} npick - number of contigs selected
   * @property {number} nmask - number of contigs masked
   * 
   * @property {Object.<Array>} locis - locations of contigs in the plot
   * They are transformed values that can be directly rendered in the plot.
   * @todo Currently not in use.
   * 
   * @param {number[][]} pdist - pairwise distance among all contigs
   * Stored as a condensed distance matrix (i.e., a 1D array).
   * Calculating such a matrix is expensive, therefore it is cached here to
   * avoid duplicated calculations.
   * @see {@link https://docs.scipy.org/doc/scipy/reference/generated/scipy.
   * spatial.distance.pdist.html}
   */
  this.cache = {
    nctg:  0,
    speci: {},
    abund: 0,
    freqs: {},
    npick: 0,
    nmask: 0,
    locis: {},
    pdist: []
  };


  /**
   * Display properties.
   * @member {Object} view
   * @description Visual properties of the main plot.
   * 
   * @property {number}  posX    - viewport position x
   * @property {number}  posY    - viewport position y
   * @property {number}  scale   - scaling factor
   * 
   * @property {Object}  x       - x-axis variable
   * @property {Object}  y       - y-axis variable
   * @property {Object}  size    - size variable
   * @property {Object}  opacity - opacity variable
   * @property {Object}  color   - color variable
   * 
   * @property {boolean} grid    - whether show grid
   * @property {number}  rbase   - base radius (px) of contig
   * @property {number}  obase   - base opacity (alpha) of contig
   * @property {string}  contpal - continuous palette
   * @property {string}  discpal - discrete palette
   * @property {number}  ncolor  - number of categories to color
   */
  this.view = {
    /** canvas rendering */
    posX:    0,
    posY:    0,
    scale:   1.0,
    /** display variables */
    x:       {},
    y:       {},
    size:    {},
    opacity: {},
    color:   {},
    /** display features */
    grid:    false,
    rbase:   15,
    obase:   0.5,
    contpal: DEFAULT_CONTINUOUS_PALETTE,
    discpal: DEFAULT_DISCRETE_PALETTE,
    ncolor:  7
  };


  /**
   * Display item properties.
   * @member {Object} * 
   * @property {number}  i       - data column index
   * @property {string}  scale   - scale key
   * @property {number}  min     - minimum after scaling
   * @property {number}  max     - maximum after scaling
   * @property {number}  lower   - lower bound of visual parameter
   * @property {number}  upper   - upper bound of visual parameter
   * @property {boolean} zero    - whether lower bound is zero or minimum
   * @property {boolean} contmap - continuous color map
   * @property {boolean} discmap - discrete color map
   */
  for (let item of ['x', 'y', 'size', 'opacity', 'color']) {
    for (let param of ['i', 'scale', 'min', 'max']) {
      this.view[item][param] = null;
    }
  }
  for (let item of ['size', 'opacity', 'color']) {
    let obj = this.view[item];
    obj.lower = 0;
    obj.upper = 100;
    obj.zero = true;
  }
  let obj = this.view.color;
  obj.contmap = [];
  obj.discmap = {};


  /**
   * Transformed data for visualization.
   * @member {Object} trans
   * @property {number[]} x       - x-axis variable
   * @property {number[]} y       - y-axis variable
   * @property {number[]} size    - size variable
   * @property {string[]} opacity - opacity variable
   * @property {string[]} color   - color variable
   * They are 1D arrays of the same size as the dataset. They store transformed
   * data for visualization purpose to avoid duplicated calculations. They need
   * to be updated when the dataset is updated or the corresponding display
   * item is changed.
   */
  this.trans = {
    x:       [],
    y:       [],
    size:    [],
    opacity: [],
    color:   []
  }


  /**
   * Program status.
   * @member {Object} stat
   * @description Transcient status of the program. Used to determine the
   * correct behavior of the program.
   * 
   * @property {boolean} mousedown - mouse is down
   * @property {boolean} mousemove - mouse is moving
   * @property {number}  dragX     - dragging position X
   * @property {number}  dragY     - dragging position Y
   * @property {boolean} drawing   - polygon drawing is ongoing
   * @property {Array.<{x: number, y: number}>} polygon - vertices of polygon
   * @property {number}  resizing  - window resizing is ongoing
   * @property {number}  toasting  - toasting is ongoing
   */
  this.stat = {
    mousedown: false,
    mousemove: false,
    dragX:     0,
    dragY:     0,
    drawing:   false,
    polygon:   [],
    resizing:  null,
    toasting:  null
  };


  /**
   * Contig selection and masking
   * @member {Array.<boolean>} pick
   * @member {Array.<boolean>} mask
   * @description They are 1D arrays of the same size as data columns. Their
   * elements are true/false values.
   */
   this.pick = [];
   this.mask = [];


  /**
   * Binning plan.
   * @member {Object.<Object.<Object.<number>>>} bins
   * @description Indices of contigs included in each bin.
   */
  this.bins = {};


  /**
   * Main and overlay plots.
   * @member {Object} rena
   * @member {Object} oray
   */
  this.rena = null;
  this.oray = null;


  /**
   * Mini plot.
   * @member {Object} mini
   * @description Properties of the mini plot showing a histogram of a given
   * numeric column of the selected contigs.
   * 
   * @property {number}   canvas - mini canvas to plot data
   * @property {number}   field  - field index of data to plot
   * @property {boolean}  log    - whether log-transform data
   * @property {number}   nbin   - number of bins in histogram
   * @property {number[]} hist   - saved bin sizes
   * @property {number[]} edges  - saved bin edges
   * @property {number}   bin0   - first bin in selection range
   * @property {number}   bin0   - last bin in selection range
   * @property {number}   drag   - mouse dragging starting position
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
  };


  /**
   * Program theme.
   * @member {Object} theme
   */
  this.theme = null;

} // end of mainObj


/**
 * @summary Shorthand for DOM selection.
 */
const byId = (id) => document.getElementById(id);


/**
 * @summary Window load event, also top-level entry for all functions.
 */
window.addEventListener('load', function () {

  // single global main object
  const mo = new mainObj();

  // load demo data, if available
  if (typeof dataPath !== 'undefined') {
    updateDataFromRemote(dataPath, mo);
  }

  // load program theme
  mo.theme = loadTheme();

  // initiate graphical user interface
  initGUI(mo);

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
