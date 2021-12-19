"use strict;"


/**!
 * @module resource
 * @file Resources that are used by the program, such as color palettes.
 */


/**
 * Texts
 */

var helpInfo = 'Help information to be added.';


/** palette */
function PaletteObj() {
  this.list = [
    'default'
  ];
  this.make = function(name, n) {
    switch(name){
      case 'default':
        return defaultPalette(n);
      default:
        throw 'Error: invalid palette.';
    }
  };
}

function defaultPalette(n) {
  var colors = ['ff0000', '0000ff', 'f27405', '008000', '91278e', 'ffff00'];
  var k = colors.length;
  var res = [];
  for (var i = 0; i < n; i++) {
    res.push(colors[i % k]);
  }
  return res;
}

/**
 * Color palettes.
 * @constant PALETTES
 * @type {Object.<Array.<string>>}
 * 
 * @description The QIIME palette was adopted from QIIME 2.
 * {@link https://qiime2.org/}
 * @license BSD 3-Clause
 * @see licenses/QIIME2.txt
 * 
 * @description Other palettes were extracted from matplotlib 3.0.3.
 * {@link https://matplotlib.org/}
 * @license matplotlib license
 * @see licenses/matplotlib.txt
 * 
 * @description In which multiple palettes were originally adopted from
 * ColorBrewer palettes.
 * @author Cynthia Brewer
 * {@link http://colorbrewer2.org/}
 * @license Apache-stype license
 * @see licenses/ColorBrewer.txt
 *
 * @description Introduction to matplotlib palettes:
 * {@link https://matplotlib.org/tutorials/colors/colormaps.html}
 * 
 * @description In this program, continuous palettes are defined by 11 stops.
 * They are approximations to, but not exact copies of the original palettes.
 * Extraction was performed using the following Python code:
 * ```
 * import seaborn as sns
 * def get11stops(cmap):
 *     hexes = sns.color_palette(cmap, 100001).as_hex()
 *     for i in range(11):
 *         yield(hexes[i * 10000])
 * ```
 */


var PALETTES = {
  // QIIME
  'QIIME':    ['ff0000', '0000ff', 'f27405', '008000', '91278e', 'ffff00', '7cecf4', 'f49ac2', '5da09e', '6b440b', '808080', 'f79679', '7da9d8', 'fcc688', '80c99b', 'a287bf', 'fff899', 'c49c6b', 'c0c0c0', 'ed008a', '00b6ff', 'a54700', '808000', '008080'],
  // Perceptually Uniform Sequential
  'viridis':  ['440154', '482475', '414487', '355f8d', '2a788e', '21918c', '22a884', '44bf70', '7ad151', 'bddf26', 'fde725'],
  'plasma':   ['0d0887', '41049d', '6a00a8', '8f0da4', 'b12a90', 'cc4778', 'e16462', 'f2844b', 'fca636', 'fcce25', 'f0f921'],
  'inferno':  ['000004', '160b39', '420a68', '6a176e', '932667', 'bc3754', 'dd513a', 'f37819', 'fca50a', 'f6d746', 'fcffa4'],
  'magma':    ['000004', '140e36', '3b0f70', '641a80', '8c2981', 'b73779', 'de4968', 'f7705c', 'fe9f6d', 'fecf92', 'fcfdbf'],
  'cividis':  ['00224e', '083370', '35456c', '4f576c', '666970', '7d7c78', '948e77', 'aea371', 'c8b866', 'e5cf52', 'fee838'],
  // Sequential
  'Greys':    ['ffffff', 'f3f3f3', 'e2e2e2', 'cecece', 'b5b5b5', '959595', '7a7a7a', '5f5f5f', '404040', '1d1d1d', '000000'],
  'Purples':  ['fcfbfd', 'f2f0f7', 'e2e2ef', 'cecfe5', 'b6b6d8', '9e9ac8', '8683bd', '7262ac', '61409b', '4f1f8b', '3f007d'],
  'Blues':    ['f7fbff', 'e3eef9', 'd0e1f2', 'b7d4ea', '94c4df', '6aaed6', '4a98c9', '2e7ebc', '1764ab', '084a91', '08306b'],
  'Greens':   ['f7fcf5', 'e9f7e5', 'd3eecd', 'b8e3b2', '98d594', '73c476', '4bb062', '2f974e', '157f3b', '006428', '00441b'],
  'Oranges':  ['fff5eb', 'fee9d4', 'fdd9b4', 'fdc38d', 'fda762', 'fd8c3b', 'f3701b', 'e25508', 'c54102', '9e3303', '7f2704'],
  'Reds':     ['fff5f0', 'fee5d8', 'fdcab5', 'fcab8f', 'fc8a6a', 'fb694a', 'f14432', 'd92523', 'bc141a', '980c13', '67000d'],
  'YlOrBr':   ['ffffe5', 'fff9c5', 'feeba2', 'fed778', 'febb47', 'fe9829', 'f07818', 'd85a09', 'b84203', '8e3104', '662506'],
  'YlOrRd':   ['ffffcc', 'fff1a9', 'fee187', 'feca66', 'feab49', 'fd8c3c', 'fc5b2e', 'ed2e21', 'd41020', 'b00026', '800026'],
  'OrRd':     ['fff7ec', 'feebd0', 'fddcaf', 'fdca94', 'fdb27b', 'fc8c59', 'f26d4b', 'e0442f', 'c91d13', 'a80000', '7f0000'],
  'PuRd':     ['f7f4f9', 'eae5f1', 'dcc9e2', 'd0abd3', 'cd8bc2', 'df64af', 'e53592', 'd81b6a', 'b80b4e', '8d003b', '67001f'],
  'RdPu':     ['fff7f3', 'fde5e2', 'fcd0cc', 'fbb6bc', 'f994b1', 'f767a1', 'e23e99', 'c01588', '99017b', '6f0174', '49006a'],
  'BuPu':     ['f7fcfd', 'e5eff6', 'ccddec', 'b2cae1', '9ab4d6', '8c95c6', '8c74b5', '8a51a5', '852d90', '760c71', '4d004b'],
  'GnBu':     ['f7fcf0', 'e5f5e0', 'd4eece', 'bee6bf', '9fdab8', '7accc4', '57b8d0', '389bc6', '1d7eb7', '085fa3', '084081'],
  'PuBu':     ['fff7fb', 'f0eaf4', 'dbdaeb', 'c0c9e2', '9cb9d9', '73a9cf', '4295c3', '187cb6', '0567a2', '045382', '023858'],
  'YlGnBu':   ['ffffd9', 'f1faba', 'd6efb3', 'abdeb7', '73c8bd', '40b5c4', '2498c1', '2072b1', '234da0', '1f2f87', '081d58'],
  'PuBuGn':   ['fff7fb', 'f0e7f2', 'dbd8ea', 'c0c9e2', '99b9d9', '66a9cf', '4095c3', '16879f', '027976', '016451', '014636'],
  'BuGn':     ['f7fcfd', 'e9f7fa', 'd6f0ee', 'b8e4db', '8fd4c2', '65c2a3', '48b27f', '2f9858', '157f3b', '006428', '00441b'],
  'YlGn':     ['ffffe5', 'f9fdc2', 'e5f5ac', 'c8e99b', 'a2d88a', '77c679', '4cb063', '2f934d', '15793e', '006034', '004529'],
  // Sequential (2)
  'binary':   ['ffffff', 'e6e6e6', 'cccccc', 'b3b3b3', '999999', '7f7f7f', '666666', '4c4c4c', '333333', '191919', '000000'],
  'gray':     ['000000', '191919', '333333', '4c4c4c', '666666', '808080', '999999', 'b3b3b3', 'cccccc', 'e6e6e6', 'ffffff'],
  'bone':     ['000000', '16161e', '2d2d3e', '42425d', '595c79', '707b90', '869aa6', '9db9bc', 'b9d2d2', 'dde9e9', 'ffffff'],
  'pink':     ['1e0000', '684141', '915d5d', 'af7272', 'c68b84', 'd0ac94', 'dac6a1', 'e4dfae', 'ededc6', 'f7f7e5', 'ffffff'],
  'spring':   ['ff00ff', 'ff19e6', 'ff33cc', 'ff4cb3', 'ff6699', 'ff807f', 'ff9966', 'ffb34c', 'ffcc33', 'ffe619', 'ffff00'],
  'summer':   ['008066', '198c66', '339966', '4ca666', '66b266', '80c066', '99cc66', 'b3d966', 'cce666', 'e6f266', 'ffff66'],
  'autumn':   ['ff0000', 'ff1900', 'ff3300', 'ff4c00', 'ff6600', 'ff8000', 'ff9900', 'ffb300', 'ffcc00', 'ffe600', 'ffff00'],
  'winter':   ['0000ff', '0019f2', '0033e6', '004cd9', '0066cc', '0080bf', '0099b2', '00b3a6', '00cc99', '00e68c', '00ff80'],
  'cool':     ['00ffff', '19e6ff', '33ccff', '4cb3ff', '6699ff', '807fff', '9966ff', 'b34cff', 'cc33ff', 'e619ff', 'ff00ff'],
  'hot':      ['0b0000', '4c0000', '900000', 'd20000', 'ff1700', 'ff5c00', 'ff9d00', 'ffe100', 'ffff36', 'ffff9d', 'ffffff'],
  'afmhot':   ['000000', '320000', '660000', '981800', 'cc4d00', 'ff8001', 'ffb233', 'ffe667', 'ffff99', 'ffffcd', 'ffffff'],
  'copper':   ['000000', '1f140c', '3f2819', '5e3b26', '7e5033', '9e6440', 'bd784c', 'dd8c59', 'fc9f65', 'ffb472', 'ffc77f'],
  // Diverging
  'PiYG':     ['8e0152', 'c41a7c', 'de77ae', 'f1b5d9', 'fde0ef', 'f7f7f6', 'e6f5d0', 'b7e085', '7fbc41', '4c9121', '276419'],
  'PRGn':     ['40004b', '752982', '9970ab', 'c1a4ce', 'e7d4e8', 'f6f7f6', 'd9f0d3', 'a5da9f', '5aae61', '1a7736', '00441b'],
  'BrBG':     ['543005', '8b500a', 'bf812d', 'dec17b', 'f6e8c3', 'f4f5f5', 'c7eae5', '7fccc0', '35978f', '01655d', '003c30'],
  'PuOr':     ['7f3b08', 'b25706', 'e08214', 'fcb761', 'fee0b6', 'f6f6f7', 'd8daeb', 'b1aad1', '8073ac', '532687', '2d004b'],
  'RdGy':     ['67001f', 'b1182b', 'd6604d', 'f3a481', 'fddbc7', 'fefefe', 'e0e0e0', 'b9b9b9', '878787', '4c4c4c', '1a1a1a'],
  'RdBu':     ['67001f', 'b1182b', 'd6604d', 'f3a481', 'fddbc7', 'f6f7f7', 'd1e5f0', '90c4dd', '4393c3', '2065ab', '053061'],
  'RdYlBu':   ['a50026', 'd62f27', 'f46d43', 'fdad60', 'fee090', 'feffc0', 'e0f3f8', 'aad8e9', '74add1', '4574b3', '313695'],
  'RdYlGn':   ['a50026', 'd62f27', 'f46d43', 'fdad60', 'fee08b', 'feffbe', 'd9ef8b', 'a5d86a', '66bd63', '199750', '006837'],
  'Spectral': ['9e0142', 'd43d4f', 'f46d43', 'fdad60', 'fee08b', 'ffffbe', 'e6f598', 'aadca4', '66c2a5', '3387bc', '5e4fa2'],
  'bwr':      ['0000ff', '3232ff', '6666ff', '9898ff', 'ccccff', 'fffefe', 'ffcccc', 'ff9898', 'ff6666', 'ff3232', 'ff0000'],
  'seismic':  ['00004c', '000092', '0000db', '3131ff', '9999ff', 'fffdfd', 'ff9999', 'ff3131', 'e60000', 'b20000', '800000'],
  // Qualitative
  'Pastel1':  ['fbb4ae', 'b3cde3', 'ccebc5', 'decbe4', 'fed9a6', 'ffffcc', 'e5d8bd', 'fddaec', 'f2f2f2'],
  'Pastel2':  ['b3e2cd', 'fdcdac', 'cbd5e8', 'f4cae4', 'e6f5c9', 'fff2ae', 'f1e2cc', 'cccccc'],
  'Paired':   ['a6cee3', '1f78b4', 'b2df8a', '33a02c', 'fb9a99', 'e31a1c', 'fdbf6f', 'ff7f00', 'cab2d6', '6a3d9a', 'ffff99', 'b15928'],
  'Accent':   ['7fc97f', 'beaed4', 'fdc086', 'ffff99', '386cb0', 'f0027f', 'bf5b17', '666666'],
  'Dark2':    ['1b9e77', 'd95f02', '7570b3', 'e7298a', '66a61e', 'e6ab02', 'a6761d', '666666'],
  'Set1':     ['e41a1c', '377eb8', '4daf4a', '984ea3', 'ff7f00', 'ffff33', 'a65628', 'f781bf', '999999'],
  'Set2':     ['66c2a5', 'fc8d62', '8da0cb', 'e78ac3', 'a6d854', 'ffd92f', 'e5c494', 'b3b3b3'],
  'Set3':     ['8dd3c7', 'ffffb3', 'bebada', 'fb8072', '80b1d3', 'fdb462', 'b3de69', 'fccde5', 'd9d9d9', 'bc80bd', 'ccebc5', 'ffed6f'],
  // Vega (https://github.com/vega/vega/wiki/Scales)
  'tab10':    ['1f77b4', 'ff7f0e', '2ca02c', 'd62728', '9467bd', '8c564b', 'e377c2', '7f7f7f', 'bcbd22', '17becf'],
  'tab20':    ['1f77b4', 'aec7e8', 'ff7f0e', 'ffbb78', '2ca02c', '98df8a', 'd62728', 'ff9896', '9467bd', 'c5b0d5', '8c564b', 'c49c94', 'e377c2', 'f7b6d2', '7f7f7f', 'c7c7c7', 'bcbd22', 'dbdb8d', '17becf', '9edae5'],
  'tab20b':   ['393b79', '5254a3', '6b6ecf', '9c9ede', '637939', '8ca252', 'b5cf6b', 'cedb9c', '8c6d31', 'bd9e39', 'e7ba52', 'e7cb94', '843c39', 'ad494a', 'd6616b', 'e7969c', '7b4173', 'a55194', 'ce6dbd', 'de9ed6'],
  'tab20c':   ['3182bd', '6baed6', '9ecae1', 'c6dbef', 'e6550d', 'fd8d3c', 'fdae6b', 'fdd0a2', '31a354', '74c476', 'a1d99b', 'c7e9c0', '756bb1', '9e9ac8', 'bcbddc', 'dadaeb', '636363', '969696', 'bdbdbd', 'd9d9d9'],  
};

var QUALITATIVE_PALETTES = [
  'QIIME', 'Paired', 'Accent', 'Dark2', 'Set1', 'Set2', 'Set3', 'Pastel1',
  'Pastel2', 'tab10', 'tab20', 'tab20b', 'tab20c'
];

var CONTINUOUS_PALETTES = [
  'viridis', 'plasma', 'inferno', 'magma', 'cividis', 'Spectral', 'RdYlGn',
  'RdYlBu', 'PuBuGn', 'YlGnBu', 'GnBu', 'YlOrRd', 'YlOrBr', 'RdBu', 'BuGn',
  'BuPu', 'PuBu', 'RdPu', 'PuRd', 'YlGn', 'OrRd', 'PiYG', 'PRGn', 'PuOr',
  'RdGy', 'BrBG'
];

var SEQUENTIAL_PALETTES = [
  'viridis', 'plasma', 'inferno', 'magma', 'cividis', 'PuBuGn', 'YlGnBu',
  'GnBu', 'YlOrRd', 'YlOrBr', 'BuGn', 'BuPu', 'RdPu', 'YlGn', 'OrRd'
];

var DIVERGING_PALETTES = [
  'Spectral', 'RdYlGn', 'RdYlBu', 'RdBu', 'PiYG', 'PRGn', 'PuOr', 'RdGy',
  'BrBG'
];

var DEFAULT_DISCRETE_PALETTE = 'QIIME';
var DEFAULT_CONTINUOUS_PALETTE = 'viridis';
