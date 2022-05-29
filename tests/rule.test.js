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

  it('guessLenColumn', function() {
    const cols = {
      'names': ['id', 'GC%', 'Len', 'Cov'],
      'types': ['id', 'num', 'num', 'num']};
    expect(guessLenColumn(cols)).toEqual(2);
    cols.types[2] = 'des';
    expect(guessLenColumn(cols)).toEqual(0);
    cols.names[3] = 'Size';
    expect(guessLenColumn(cols)).toEqual(3);
  });

  it('guessCovColumn', function() {
    const cols = {
      'names': ['id', 'GC%', 'Len', 'Cov'],
      'types': ['id', 'num', 'num', 'num']};
    expect(guessCovColumn(cols)).toEqual(3);
    cols.types[3] = 'cat';
    expect(guessCovColumn(cols)).toEqual(0);
    cols.names[1] = 'Depth';
    expect(guessCovColumn(cols)).toEqual(1);
  });

  it('guessGCColumn', function() {
    const cols = {
      'names': ['id', 'GC'],
      'types': ['id', 'cat']};
    expect(guessGCColumn(cols)).toEqual(0);
    cols.types[1] = 'num';
    expect(guessGCColumn(cols)).toEqual(1);
    cols.names[1] = '%';
    expect(guessGCColumn(cols)).toEqual(0);
    cols.names.push('G+C %');
    cols.types.push('num');
    expect(guessGCColumn(cols)).toEqual(2);
  });

  it('guessRankColumn', function() {
    const cols = {
      'names': ['id', 'domain', 'phylum', 'class', 'genus'],
      'types': ['id', 'cat', 'num', 'cat', 'cat']};
    expect(guessRankColumn(cols)).toEqual(3);
  });

  it('guessXYColumns', function() {
    const cols = {
      'names': ['id', 'x',   'y'],
      'types': ['id', 'num', 'num']};
    expect(guessXYColumns(cols)).toEqual([1, 2]);
    cols.names = ['id', 'PC1', 'PC2'];
    expect(guessXYColumns(cols)).toEqual([1, 2]);
    cols.names = ['id', 'umap_1_k5', 'umap_2_k5'];
    expect(guessXYColumns(cols)).toEqual([1, 2]);
    cols.names = ['id', 'GC', 'tSNE-3', 'tSNE-2', 'tSNE-1'];
    cols.types = ['id', 'num', 'num', 'num', 'num']
    expect(guessXYColumns(cols)).toEqual([4, 3]);
  });

});
