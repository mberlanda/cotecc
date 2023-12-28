import {describe, expect, it} from '@jest/globals';

import {toPlayerHand} from './playerHandLogic';

describe('toPlayerHand', () => {
  it('returns a PlayerHand given a Player', () => {
    const player = {ID: 1, name: 'bar', hand: [], lifeCount: 3, isHuman: false};
    expect(toPlayerHand(player)).toEqual({
      isHuman: false,
      playerID: 1,
      cards: [],
    });
  });
});
