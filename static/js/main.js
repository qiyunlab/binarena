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
 * @property {Object} picked - contig selection
 * @property {Object} masked - contig masking
 * @property {Object} highed - contig highlighting
 * @property {Object} tabled - contigs in table
 * @property {Object} bins   - binning plan
 * @property {Object} plot   - main plots
 * @property {Array}  images - cached images
 * @property {Object} work   - web workers
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
   * Membership lists for feature sets.
   * @member {Object.<Array>} mems
   * @description Mapping of feature set field index to membership list.
   */
  this.mems = {};


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
   * @todo Remove this feature.
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
   * @property {number} ixmap - contig Id to index mapping
   * 
   * @property {number} splen - index of "length" column
   * @property {number} spcov - index of "coverage" column
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
   * @property {number} nhigh - number of contigs highlighted
   * 
   * @property {number[]} maskh - masking history
   * 
   * @property {Set.<string>} binns - current bin names
   * Note: Bin names is a superset of actual bins in the dataset, because there
   * can be empty bins.
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
    ixmap: {},
    splen: 0,
    spcov: 0,
    abund: 0,
    freqs: {},
    npick: 0,
    nmask: 0,
    nhigh: 0,
    maskh: [],
    binns: new Set(),
    pdist: [],
    silhs: []
  };


  /**
   * Display properties.
   * @member {Object} view
   * @description Visual properties of the main plot.
   * 
   * @property {Object}  x       - x-axis variable
   * @property {Object}  y       - y-axis variable
   * @property {Object}  size    - size variable
   * @property {Object}  opacity - opacity variable
   * @property {Object}  color   - color variable
   * 
   * @property {boolean} grid    - whether show grid
   * @property {string}  contpal - continuous palette
   * @property {string}  discpal - discrete palette
   * @property {number}  ncolor  - number of categories to color
   * 
   * @property {number} minW     - minimum width of canvas
   * @property {number} minH     - minimum height of canvas
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
    contpal: DEFAULT_CONTINUOUS_PALETTE,
    discpal: DEFAULT_DISCRETE_PALETTE,
    ncolor:  7,
    minW:    0,
    minH:    0
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
   * @property {number}  base    - default value 
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

  this.view.size.base = 15;       // radius = 15px
  this.view.opacity.base = 0.5;   // grey scale = 50%
  this.view.color.base = '0,0,0'; // black


  /**
   * Transformed data for visualization.
   * @member {Object} trans
   * @property {number[]} x       - x-axis variable
   * @property {number[]} y       - y-axis variable
   * @property {number[]} size    - size variable
   * @property {number[]} opacity - opacity variable
   * @property {number[]} color   - color variable
   * @property {string[]} rgb     - RGB value
   * @property {Object.number[]} fses - canvas fill style (RGBA)
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
    color:   [],
    rgb:     [],
    fses:    {}
  };


  /**
   * Program status.
   * @member {Object} stat
   * @description Transcient status of the program. Used to determine the
   * correct behavior of the program.
   * 
   * @property {boolean}  mousedown - mouse is down
   * @property {boolean}  mousemove - mouse is moving
   * @property {number}   dragX     - dragging position X
   * @property {number}   dragY     - dragging position Y
   * @property {number[]} touchX    - touching positions X
   * @property {number[]} touchY    - touching positions Y
   * @property {boolean}  drawing   - polygon drawing is ongoing
   * @property {Array.<{x: number, y: number}>} polygon - vertices of polygon
   * @property {number}   resizing  - window resizing is ongoing
   * @property {number}   toasting  - toasting is ongoing
   * @property {number}   stopping  - calculation is stopping
   * @property {number}   progress  - calculation progress
   * @property {number}   painting  - unique identifier for painting task
   */
  this.stat = {
    mousedown: false,
    mousemove: false,
    dragX:     0,
    dragY:     0,
    touchX:    [],
    touchY:    [],
    drawing:   false,
    polygon:   [],
    resizing:  null,
    toasting:  null,
    stopping:  false,
    progress:  null,
    painting:  0
  };


  /**
   * Contig selection, masking and focusing
   * @member {Array.<boolean>} picked
   * @member {Array.<boolean>} masked
   * @member {Array.<boolean>} blured
   * @description They are 1D arrays of the same size as data columns. Their
   * elements are true/false values.
   */
  this.picked = [];
  this.masked = [];
  this.blured = [];


  /**
   * Contig highlighting
   * @member {Array.<number>} highed
   * @description This is a 1D array of integers. 0 means not lighlighted. 1 to
   * n corresponds to highlight color indices.
   */
  this.highed = [];


  /**
   * Binning plan.
   * @member {Array.<string>} binned
   * @description Indices of contigs included in each bin. Is a 1D array of
   * strings. Unbinned contigs are empty strings.
   */
  this.binned = [];


  /**
   * Contigs displayed in data table.
   * @member {Array.<number>} tabled
   * @description They are indices of contigs that should be displayed in the
   * data table. They are not a boolean array as above because the order of
   * indices matters.
   */
  this.tabled = [];


  /**
   * Data being imported.
   * @member {Array} impo
   * @property {string}    fname - file name
   * @property {string}    text  - multi-line text containing data
   * @property {string[]}  names - field names
   * @property {string[]}  types - data types
   * @property {boolean[]} guess - whether data types are guessed
   * @property {number[]}  idx   - field indices (optional)
   */
  this.impo = {
    fname: null,
    text:  null,
    head:  true,
    names: [],
    types: [],
    guess: [],
    idx:   [],
  };


  /**
   * Scatter plot of data.
   * @member {Object} plot
   * @description Canvases and their properties.
   * 
   * @property {Element} main  - main scatter plot
   * @property {Element} sele  - selection shadows
   * @property {Element} high  - highlight borders
   * @property {Element} offs  - off-screen canvas
   * @property {number}  posX  - viewport position x
   * @property {number}  posY  - viewport position y
   * @property {number}  scale - scale factor
   */
  this.plot = {
    main:  null,
    sele:  null,
    high:  null,
    offs:  null,
    posX:  0,
    posY:  0,
    scale: 1
  };


  /**
   * Cached images.
   * @member {Array.<Object>} images
   * @description A fixed-sized array, with each element representing one set
   * of cached images, as well as their position and scale. An image may be a
   * canvas or a bitmap, which has its width and height, and can be drawn to
   * another (on-screen) canvas.
   * 
   * Each element has the following parameters:
   * @property {number}  iid   - image index (incremental)
   * @property {number}  uid   - ongoing drawing task Id
   * @property {boolean} done  - ready to use
   * @property {Element} main  - main scatter plot
   * @property {Element} sele  - selection shadows
   * @property {Element} high  - highlight borders
   * @property {number}  w     - canvas width
   * @property {number}  h     - canvas height
   * @property {number}  posX  - viewport position x
   * @property {number}  posY  - viewport position y
   * @property {number}  scale - scale factor
   * @see plot
   */
  this.images = [];


  /**
   * Web workers.
   * @member {Object} work
   * @description Web workers for calculation and rendering.
   * 
   * @property {Element} calc - worker for calculation
   * @property {Element} draw - worker for rendering
   */
  this.work = {
    calc: null,
    draw: null
  }


  /**
   * Mini plot.
   * @member {Object} mini
   * @description Properties of the mini plot showing a histogram of a given
   * numeric column of the selected contigs.
   * 
   * @property {Element}  canvas - mini canvas to plot data
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
 * @summary Fallback for `requestIdleCallback`.
 * @description For browser compatibility (esp. Safari).
 * @see {@link: https://developer.chrome.com/blog/using-requestidlecallback/}
 */
window.requestIdleCallback = window.requestIdleCallback ||
  function (cb) {
    const start = Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  }
window.cancelIdleCallback = window.cancelIdleCallback ||
  function (id) {
    clearTimeout(id);
  }


/**
 * @summary Window load event, also top-level entry for all functions.
 */
window.addEventListener('load', function () {

  // single global main object
  const mo = new mainObj();
  console.log('Program launched.');

  // check web worker support
  const work = mo.work;
  if (window.Worker) {
    work.calc = 'yes!'; // currently not in use

    // check offscreen canvas support
    if (HTMLCanvasElement.prototype.transferControlToOffscreen) {
      const blob = new Blob(['(' + renderWorker.toString() + ')()'],
                            {type: 'text/javascript'});
      try { work.draw = new Worker(URL.createObjectURL(blob)); }
      catch { work.draw = null; }
      if (work.draw) console.log('Offscreen canvas enabled.');
    }
  }

  // load demo data, if available
  if (typeof dataPath !== 'undefined') {
    updateDataFromRemote(dataPath, mo);
  }

  // load program theme
  mo.theme = loadTheme();

  // initiate interface
  initGUI(mo);

  // reset workplace
  resetWorkspace(mo);

});
