import {Card, newSuitMap, PlayerHand} from '../types';
import {Suit} from '../utils/constants';

// TODO: figure out how to exclude these test fixtures from the bundled application
export const newPlayerHand = (args: Partial<PlayerHand>): PlayerHand => {
  return {
    isHuman: false,
    playerID: -1,
    cards: [],
    cardsBySuit: newSuitMap<Card[]>(() => []),
    ...args,
  };
};

describe('newPlayerHand', () => {
  it('requires to be moved to a testing utility', () => {
    const hand = newPlayerHand({});
    const card = {points: 5, rank: 10, suit: Suit.Bastoni};

    hand.cardsBySuit['bastoni' as Suit].push(card);

    expect(hand.cardsBySuit[Suit.Bastoni].length).toEqual(1);
    expect(hand.cardsBySuit[Suit.Ori].length).toEqual(0);
  });
});
