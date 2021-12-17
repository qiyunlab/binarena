/**!
 * @file Unit tests for "numeric.js".
 */

 describe('numeric.js', function() {

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

  it('arrMean', function() {
    expect(arrMean([1, 2, 3])).toBe(2);
    expect(arrMean([0.05, 1.0, 2.25])).toBe(1.1);
  });

  it('arrProdSum', function() {
    expect(arrProdSum([1, 2, 3], [0, 1, 2])).toBe(8);
    expect(arrProdSum([2.5, 3.2, 4.5], [0.1, 1.2, -0.4])).toBe(2.29);
  });

  it('arrEqual', function() {
    expect(arrEqual([0, 1], 0)).toBeFalsy();
    expect(arrEqual([0, 0], [0, 1])).toBeFalsy();
    expect(arrEqual([[0, 0], [0, 1]], [0, 1])).toBeFalsy();
    expect(arrEqual([[0, 0], [0, 1]], [[0, 1], [0, 0]])).toBeFalsy();
    expect(arrEqual([[0, 0], [[1, 0], [1, 1]]], [[0, 0], [[1, 0], [1, 1]]])).toBeTruthy();
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

  it('unique', function() {
    expect(unique([0, 2, 0, 1, 2])).toEqual([0, 2, 1]);
    expect(unique([0, 2, 0, 1, 2], true)).toEqual([[0, 2, 1], [0, 1, 0, 2, 1]]);
    expect(unique([1, 2, 5, 2], true)).toEqual([[1, 2, 5], [0, 1, 2, 1]]);
  });

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

	it('idMat', function() {
		expect(idMat(0)).toEqual([]);
		expect(idMat(1)).toEqual([[1]]);
		expect(idMat(3)).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
	});

	it('matInv', function() {
		expect(matInv([[2, 3], [2, 2]])).toEqual([[-1, 3/2], [1, -1]]);
		expect(matInv([[1, 3, 2], [1, 3, 3], [2, 7, 8]]))
			.toEqual([[-3, 10, -3], [2, -4, 1], [-1, 1, -0]]);
	});

});