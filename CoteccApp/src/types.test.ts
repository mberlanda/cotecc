import {describe, expect, it} from '@jest/globals';

import {newSuitMap} from './types';
import {Suit} from './utils/constants';

describe('newSuitMap', () => {
  it('creates an entry for each of the 4 suits', () => {
    const map = newSuitMap(() => 0);

    const keys = Object.keys(map);
    expect(keys).toHaveLength(4);
    expect(keys).toContain(Suit.Bastoni);
    expect(keys).toContain(Suit.Spade);
    expect(keys).toContain(Suit.Coppe);
    expect(keys).toContain(Suit.Ori);
  });

  it('initialises each suit with the factory return value', () => {
    const map = newSuitMap(() => 42);

    for (const suit of Object.values(Suit)) {
      expect(map[suit as Suit]).toBe(42);
    }
  });

  it('calls the factory per suit so each value is independent', () => {
    const map = newSuitMap(() => [] as number[]);

    map[Suit.Bastoni].push(1);

    expect(map[Suit.Bastoni]).toEqual([1]);
    expect(map[Suit.Spade]).toEqual([]);
    expect(map[Suit.Coppe]).toEqual([]);
    expect(map[Suit.Ori]).toEqual([]);
  });

  it('works with object default values', () => {
    const map = newSuitMap(() => ({count: 0}));

    map[Suit.Ori].count = 5;

    expect(map[Suit.Ori].count).toBe(5);
    expect(map[Suit.Bastoni].count).toBe(0);
  });
});
