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
});
