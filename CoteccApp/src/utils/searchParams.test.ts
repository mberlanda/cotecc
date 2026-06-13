import {describe, expect, it} from '@jest/globals';

import {boolParam, firstParam, numberParam} from './searchParams';

describe('firstParam', () => {
  it('returns the string value as-is', () => {
    expect(firstParam('Mauro')).toBe('Mauro');
  });

  it('returns the first element of an array', () => {
    expect(firstParam(['a', 'b'])).toBe('a');
  });

  it('falls back when undefined or empty array', () => {
    expect(firstParam(undefined, 'fallback')).toBe('fallback');
    expect(firstParam([], 'fallback')).toBe('fallback');
  });
});

describe('numberParam', () => {
  it('parses a numeric string', () => {
    expect(numberParam('500', 4)).toBe(500);
  });

  it('falls back for missing or non-numeric values', () => {
    expect(numberParam(undefined, 4)).toBe(4);
    expect(numberParam('', 4)).toBe(4);
    expect(numberParam('not-a-number', 4)).toBe(4);
  });
});

describe('boolParam', () => {
  it('is true only for the string "true"', () => {
    expect(boolParam('true')).toBe(true);
    expect(boolParam('false')).toBe(false);
    expect(boolParam('anything')).toBe(false);
  });

  it('uses the fallback when missing', () => {
    expect(boolParam(undefined, true)).toBe(true);
    expect(boolParam(undefined)).toBe(false);
  });
});
