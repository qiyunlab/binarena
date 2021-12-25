"use strict";

/**!
 * @file Unit tests for "binning.js".
 */

describe('binning.js', function() {

  it('loadBins', function() {
    expect(loadBins(['1','2','3','2','', '3','4','3']))
      .toEqual({'1': 1, '2': 2, '3': 3, '4': 1});
  });

});
