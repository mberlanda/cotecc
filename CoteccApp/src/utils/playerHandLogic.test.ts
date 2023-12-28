import {describe, expect, it} from '@jest/globals';

import {nextHandPlayerID, toPlayerHand} from './playerHandLogic';
import {PlayerHand} from '../types';

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

const handOne: PlayerHand = {playerID: 1, cards: [], isHuman: true};
const handTwo: PlayerHand = {playerID: 2, cards: [], isHuman: false};
const handThree: PlayerHand = {playerID: 3, cards: [], isHuman: false};
const hands = [handOne, handTwo, handThree];

describe('nextHandPlayerID', () => {
  it('returns the next ID when there are at least two players', () => {
    expect(nextHandPlayerID(hands, handOne.playerID)).toEqual(handTwo.playerID);
  });
  it('returns the first ID when there provided las player ID', () => {
    expect(nextHandPlayerID(hands, handThree.playerID)).toEqual(
      handOne.playerID,
    );
  });
  it('returns the same ID when there provided a single player list', () => {
    expect(nextHandPlayerID([handOne], handOne.playerID)).toEqual(
      handOne.playerID,
    );
  });
  it('returns the first playerID when the ID provided is not the list', () => {
    // scenario expected when filtering out eliminated hands
    expect(
      nextHandPlayerID(
        hands.filter(p => p.isHuman),
        handTwo.playerID,
      ),
    ).toEqual(handOne.playerID);
  });

  it('throws an exception on an empty list', () => {
    expect(() => nextHandPlayerID([], 234)).toThrow(TypeError);
  });
});
