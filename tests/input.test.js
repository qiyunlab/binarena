"use strict";

/**!
 * @file Unit tests for "input.js".
 */

describe('input.js', function() {

  /** Parse data table. */
  it('parseTable', function() {
    let exp;
    const text = (
      `#ID	x	y	length	gc|n	coverage	taxonomy	function	description|d
      CTG1	1.024	2.435	19801	53.5	15.33	Escherichia	K00012	first contig in the dataset
      CTG2	-2.254	1.209	5643	55.6	27.64	Bacteroides	K00237,K00040:2,K00630	yet another contig
      CTG3	0.365	2.003	3078	47.2	6.59	Streptococcus	K01043:3	here is one more
      CTG4	3.197	-4.142	2653	50.2	10.25	Escherichia	K00237,K03852	
      CTG5	-1.755	-0.672	1753	48.8	2.65	Bacteroides	K00012,K01043:2	this is the last one`).replace(/  +/g, '');
    const data = [];
    const cols = {'names': [], 'types': []};
    parseTable(text, data, cols);
    exp = [['CTG1', 'CTG2', 'CTG3', 'CTG4', 'CTG5'],
           [1.024, -2.254, 0.365,  3.197, -1.755],
           [2.435,  1.209, 2.003, -4.142, -0.672],
           [19801,   5643,  3078,   2653,   1753],
           [53.5,    55.6,  47.2,   50.2,   48.8],
           [15.33,  27.64,  6.59,  10.25,   2.65],
           ['Escherichia', 'Bacteroides', 'Streptococcus', 'Escherichia',
            'Bacteroides'],
           [['K00012'], ['K00237', 'K00040', 'K00630'], ['K01043'],
            ['K00237', 'K03852'], ['K00012', 'K01043']],
           [[NaN], [NaN, 2, NaN], [3], [NaN, NaN], [NaN, 2]],
           ['first contig in the dataset', 'yet another contig',
            'here is one more', '', 'this is the last one']];
    expect(data).toEqual(exp);
    exp = ['#ID', 'x', 'y', 'length', 'gc', 'coverage', 'taxonomy',
           'function', 'function', 'description'];
    expect(cols.names).toEqual(exp);
    exp = ['id', 'num', 'num', 'num', 'num', 'num', 'cat', 'fea', 'fwt',
           'des'];
    expect(cols.types).toEqual(exp);
  });

  /** Parse numeric column. */
  it('parseNumColumn', function() {
    let arr, obs, exp;

    // normal numbers
    arr = ['1', '2', '3', '4', '5'];
    obs = parseNumColumn(arr);
    exp = [1, 2, 3, 4, 5];
    expect(obs).toEqual(exp);

    // with exceptions
    arr = ['0', '1.5', '-2.0', 'N/A', 'false'];
    obs = parseNumColumn(arr);
    exp = [0, 1.5, -2, NaN, NaN];
    expect(obs).toEqual(exp);

    // empty input
    expect(parseNumColumn([])).toEqual([]);
  });


  /** Parse categorical column. */
  it('parseCatColumn', function() {
    let arr, obs, exp;

    // normal categories
    arr = ['a', 'b', 'c'];
    obs = parseCatColumn(arr);
    exp = [['a', 'b', 'c'], null];
    expect(obs).toEqual(exp);

    // normal categories with weights
    arr = ['a:100', 'b:95', 'c:80'];
    obs = parseCatColumn(arr);
    exp = [['a', 'b', 'c'],
           [100,  95,  80]];
    expect(obs).toEqual(exp);

    // with exceptions
    arr = ['a', 'b:0.25', 'c:-1', 'd:x', 'e:2:3', ':1', '2', ''];
    obs = parseCatColumn(arr);
    exp = [['a', 'b',   'c', 'd:x', 'e:2', ':1', '2',  ''],
           [NaN,  0.25,  -1,   NaN,     3,  NaN, NaN, NaN]];
    expect(obs).toEqual(exp);

    // empty input
    expect(parseCatColumn([])).toEqual([[], null]);
  });


  /** Parse feature set column. */
  it('parseFeaColumn', function() {
    let arr, obs, exp;

    // normal feature sets
    arr = ['a', 'a,b,c', 'b,d'];
    obs = parseFeaColumn(arr);
    exp = [[['a'], ['a', 'b', 'c'], ['b', 'd']], null];
    expect(obs).toEqual(exp);

    // normal feature sets with weights
    arr = ['a,b:1', 'c:2,d:3', 'a:4,e,f:1'];
    obs = parseFeaColumn(arr);
    exp = [[['a', 'b'], ['c', 'd'], ['a', 'e', 'f']],
           [[NaN,  1 ], [ 2,   3 ], [ 4,  NaN,  1 ]]];
    expect(obs).toEqual(exp);

    // with exceptions
    arr = ['a:0.5,b:0.7', 'c,d:x', '5', ',:10,', ''];
    obs = parseFeaColumn(arr);
    exp = [[['a', 'b'], ['c', 'd:x'], ['5'], [':10'], []],
           [[0.5, 0.7], [NaN,  NaN ], [NaN], [ NaN ], []]];

    // empty input
    expect(parseFeaColumn([])).toEqual([[], null]);
  });


  /** Guess column data type and parse. */
  it('guessColumnType', function() {
    let arr, obs, exp;

    // numbers
    arr = ['1', '2', '3', '4', '5'];
    obs = guessColumnType(arr);
    exp = ['num', [1, 2, 3, 4, 5], null];
    expect(obs).toEqual(exp);

    // categories
    arr = ['a:100', 'b:95', 'c:80'];
    obs = guessColumnType(arr);
    exp = ['cat',
           ['a', 'b', 'c'],
           [100,  95,  80]];
    expect(obs).toEqual(exp);

    // feature sets
    arr = ['a,b:1', 'c:2,d:3', 'a:4,e,f:1'];
    obs = guessColumnType(arr);
    exp = ['fea',
           [['a', 'b'], ['c', 'd'], ['a', 'e', 'f']],
           [[NaN,  1 ], [ 2,   3 ], [ 4,  NaN,  1 ]]];
    expect(obs).toEqual(exp);

    // empty input
    expect(guessColumnType([])).toEqual(['num', [], null]);
  });

  /** Calculate entropy of an array. */
  it('calcEntropy', function() {
    let arr, obs, exp;

    // same values in array
    arr = [1, 1, 1, 1, 1];
    obs = calcEntropy(arr);
    exp = 0;
    expect(obs).toEqual(exp);

    // all unique values in array
    arr = [1, 2, 3, 4, 5];
    obs = calcEntropy(arr);
    exp = Math.log2(5);
    expect(obs).toBeCloseTo(exp, 15);

    // categories
    arr = ['a', 'a', 'b', 'c', 'b', 
           'a', 'c', 'c', 'b', 'b'];
    obs = calcEntropy(arr);
    exp = Math.log2(0.3 ** -0.3) + Math.log2(0.4 ** -0.4)
          + Math.log2(0.3 ** -0.3);
    expect(obs).toBeCloseTo(exp, 15);

    // array with blanks
    arr = [1, , 2, 2, , 3, 4, , , 4];
    obs = calcEntropy(arr);
    exp = Math.log2(0.1 ** -0.1) + Math.log2(0.1 ** -0.1) 
          + Math.log2(0.4 ** -0.4) + Math.log2(0.2 ** -0.2)
          + Math.log2(0.2 ** -0.2);
    expect(obs).toBeCloseTo(exp, 15);

    // empty input
    expect(calcEntropy([])).toEqual(0);
  });

});
