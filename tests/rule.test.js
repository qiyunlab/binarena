"use strict";

/**!
 * @file Unit tests for "rule.js".
 */

describe('rule.js', function() {

  it('findColumnByKeys', function() {

    // default match
    const cols = { names: ['id', 'len',  'gc', 'cov', 'size', 'mass'],
                   types: ['id', 'cat', 'num', 'num',  'num',  'fea'] };
    const keys = ['length', 'size', 'len', 'bp'];
    expect(findColumnByKeys(cols, keys)).toEqual(1);

    // match certain type
    expect(findColumnByKeys(cols, keys, ['num'])).toEqual(4);

    // prefix match
    cols.names = ['len', 'size (bp)', 'length of contig', 'confidence'];
    cols.types = ['id', 'num', 'num', 'num'];
    expect(findColumnByKeys(cols, keys)).toEqual(1);

    // whole-word match supercedes prefix match
    cols.names = ['len', 'size_of', 'length', 'conf'];
    expect(findColumnByKeys(cols, keys)).toEqual(2);

  });

});
