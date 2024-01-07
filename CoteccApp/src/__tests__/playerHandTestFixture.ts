import {Card, newSuitMap, PlayerHand} from '../types';

// TODO: figure out how to exclude these test fixtures from the bundled application
export const newPlayerHand = (args: Partial<PlayerHand>): PlayerHand => {
  return {
    isHuman: false,
    playerID: -1,
    cards: [],
    cardsBySuit: newSuitMap<Card[]>([]),
    ...args,
  };
};

describe('newPlayerHand', () => {
  it('requires to be moved to a testing utility', () => {
    expect(true).toBeTruthy();
  });
});
