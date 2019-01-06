/**!
 * @file Unit tests for "util.js".
 */

 describe('util.js', function() {

  it('splitLines', function() {
    expect(splitLines('This is\na multiline\nstring'))
      .toEqual(['This is', 'a multiline', 'string']);
  });

  it('hexToRgb', function() {
    expect(hexToRgb('e41a1c')).toBe('228,26,28');
    expect(hexToRgb('377eb8')).toBe('55,126,184');
    expect(hexToRgb('4daf4a')).toBe('77,175,74');
  });

  it('arrMinMax', function() {
    expect(arrMinMax([1])).toEqual([1, 1]);
    expect(arrMinMax([1, 2, 3])).toEqual([1, 3]);
    expect(arrMinMax([0, -2, 1])).toEqual([-2, 1]);
    expect(arrMinMax([1.5, 12.2, 7.05])).toEqual([1.5, 12.2]);
    expect(arrMinMax([0, 1, 2, 2])).toEqual([0, 2]);
  });

  it('objMinMax', function() {
    expect(objMinMax({'a': 1})).toEqual([['a', 1], ['a', 1]]);
    expect(objMinMax({'a': 1, 'b': 4, 'c': -2}))
      .toEqual([['c', -2], ['b', 4]]);
    expect(objMinMax({'a': 2.5, 'b': 0.5, 'c': 0.5}))
      .toEqual([['b', 0.5], ['a', 2.5]]);
  });

  it('arrSum', function() {
    expect(arrSum([1, 2, 3])).toBe(6);
    expect(arrSum([0.05, 1.0, 2.25])).toBe(3.3);
  });

  it('arrProdSum', function() {
    expect(arrProdSum([1, 2, 3], [0, 1, 2])).toBe(8);
    expect(arrProdSum([2.5, 3.2, 4.5], [0.1, 1.2, -0.4])).toBe(2.29);
  });

  it('transpose', function() {
    var before = [
      [1, 2, 4, 2],
      [-2, 0, 3, 1],
      [3, 5, -1, -3]
    ];
    var after = [
      [1, -2, 3],
      [2, 0, 5],
      [4, 3, -1],
      [2, 1, -3]
    ];
    expect(transpose(before)).toEqual(after);
  });
});
