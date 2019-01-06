"use strict;"

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
