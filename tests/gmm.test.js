/**!
 * @file Unit tests for "gmm.js".
 */

describe('gmm.js', function() {
	it('identity', function() {
		expect(identity(0)).toEqual([]);
		expect(identity(1)).toEqual([[1]]);
		expect(identity(3)).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
	});
	it('inv', function() {
		expect(inv([[2, 3], [2, 2]])).toEqual([[-1, 3/2], [1, -1]]);
		expect(inv([[1, 3, 2], [1, 3, 3], [2, 7, 8]]))
			.toEqual([[-3, 10, -3], [2, -4, 1], [-1, 1, -0]]);
		//expect(inv([[3, 0, 2], [2, 0, -2], [0, 1, 1]]))
			//.toEqual([[0.2, 0.2, 0], [0.2, 0.3, 1], [0.2, -0.3, 0]]);
	});
});