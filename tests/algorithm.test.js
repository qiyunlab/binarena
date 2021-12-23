/**!
 * @file Unit tests for "algorithm.js".
 */

describe('algorithm.js', function() {

  it('silhouetteSample', function() {
    let x0 = [[5, 0], [3, 3], [7, 9]];
    let label0 = [0, 0, 1];
    expect(silhouetteSample(x0, label0, pdist(x0)))
      .toEqual([(Math.sqrt(85) - Math.sqrt(13)) / Math.sqrt(85), 0.5, 0]);
    let x1 = [[3, 0], [0, 4], [3, 4], [0, 0]];
    let label1 = [0, 1, 1, 0];
    expect(silhouetteSample(x1, label1, pdist(x1))).toEqual([1/3, 1/3, 1/3, 1/3]);
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
