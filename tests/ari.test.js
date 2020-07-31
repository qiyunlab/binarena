/**!
 * @file Unit tests for "ari.js".
 */

describe('ari.js', function() {
  it('factorial', function() {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(5)).toBe(120);
    expect(factorial(5, 3)).toBe(60);
  });

  it('comb', function() {
    expect(comb(1, 2)).toBe(0);
    expect(comb(5, 3)).toBe(10);
    expect(comb(5, 2)).toBe(10);
    expect(comb(4, 2)).toBe(6);
  });

  it('unique', function() {
    expect(unique([0, 2, 0, 1, 2])).toEqual([0, 2, 1]);
    expect(unique([0, 2, 0, 1, 2], true)).toEqual([[0, 2, 1], [0, 1, 0, 2, 1]]);
    expect(unique([1, 2, 5, 2], true)).toEqual([[1, 2, 5], [0, 1, 2, 1]]);
  });

  it('coordinateMatrix', function() {
    expect(coordinateMatrix([0, 2, 2], [0, 1, 2], [2, 3, 1], [4, 4]))
      .toEqual([[2, 0, 0, 0], [0, 0, 0, 0], [0, 3, 1, 0], [0, 0, 0, 0]]);
    expect(coordinateMatrix([2, 0, 2], [2, 0, 1], [1, 2, 3], [4, 4]))
      .toEqual([[2, 0, 0, 0], [0, 0, 0, 0], [0, 3, 1, 0], [0, 0, 0, 0]]);
    expect(coordinateMatrix([0, 2, 2], [0, 1, 2], [2, 3, 1], [4, 4], true))
      .toEqual([[[0, 0], [2, 1], [2, 2]], [2, 3, 1]]);
    expect(coordinateMatrix([0, 2, 2], [0, 2, 2], [2, 3, 1], [3, 3]))
      .toEqual([[2, 0, 0], [0, 0, 0], [0, 0, 4]]);
  });

  it('contingencyMatrix', function() {
    expect(contingencyMatrix([0, 0, 1, 0, 2], [0, 1, 1, 0, 2]))
      .toEqual([[[0, 0], [0, 1], [1, 1], [2, 2]], [2, 1, 1, 1]]);
  });

  it('adjustedRandScore', function() {
    expect(adjustedRandScore([0, 0, 1, 0, 2], [0, 1, 1, 0, 2]))
      .toBe(0.4 / 1.9);
  });
});



