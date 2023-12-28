import {Suit} from './constants';
import {calculateScore} from './movesLogic';

describe('calculateScore', () => {
  it('returns 0 when no  move', () => {
    expect(calculateScore([])).toEqual(0);
  });

  it('returns the sum of points', () => {
    const moves = [
      {card: {suit: Suit.Ori, rank: 5, points: 0}, playerID: 1},
      {card: {suit: Suit.Ori, rank: 8, points: 2}, playerID: 2},
    ];

    expect(calculateScore(moves)).toEqual(2);
  });
});
