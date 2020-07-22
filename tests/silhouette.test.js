/**!
 * @file Unit tests for "silhouette.js".
 */

describe('silhouette.js', function() {
  it('euclidean', function(){
    expect(euclidean([0, 0], [0, 0])).toBe(0);
    expect(euclidean([0 ,0], [0, 1])).toBe(1);
    expect(euclidean([0, 0], [0.1, 0])).toBe(0.1);
    expect(euclidean([2, 1], [1, 3])).toBe(Math.sqrt(5));
    expect(euclidean([0, 0, 0], [3, 0, 4])).toBe(5);
  });

  it('pdist', function() {
    expect(pdist([[0, 0], [0, 0]])).toEqual([[0, 0], [0, 0]]);
    expect(pdist([[0, 0], [0, 1], [1, 0]]))
      .toEqual([[0, 1, 1,], [1, 0, Math.sqrt(2)], [1, Math.sqrt(2), 0]]);
  });

  it('bincount', function() {
    expect(bincount([0])).toEqual([1]);
    expect(bincount([1, 0, 0, 1, 1])).toEqual([2, 3]);
    expect(bincount([2, 0])).toEqual([1, 0, 1]);
  });

  it('silhouetteSample', function() {
    let x0 = [[5, 0], [3, 3], [7, 9]];
    let label0 = [0, 0, 1];
    expect(silhouetteSample(x0, label0))
      .toEqual([(Math.sqrt(85) - Math.sqrt(13)) / Math.sqrt(85), 0.5, 0]);
    let x1 = [[3, 0], [0, 4], [3, 4], [0, 0]];
    let label1 = [0, 1, 1, 0];
    expect(silhouetteSample(x1, label1)).toEqual([1/3, 1/3, 1/3, 1/3]);
  });

  it('silhouetteScore', function() {
    let x0 = [[3, 0], [0, 4], [3, 4], [0, 0]];
    let label0 = [0, 1, 1, 0];
    expect(silhouetteScore(x0, label0)).toBe(1/3);
  });
});
