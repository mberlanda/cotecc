import {describe, expect, it} from '@jest/globals';

import {findPlayerById, generatePlayers, nextPlayerID} from './playerLogic';
import {Player} from '../types';

const validPlayerID = 123;
const playerOne = {
  ID: validPlayerID,
  name: 'foo',
  hand: [],
  lifeCount: 3,
  isHuman: true,
};
const playerTwo = {ID: 1, name: 'bar', hand: [], lifeCount: 3, isHuman: false};
const playerThree = {
  ID: 2,
  name: 'baz',
  hand: [],
  lifeCount: 3,
  isHuman: false,
};
const players: Player[] = [playerOne, playerTwo, playerThree];

describe('findPlayerById', () => {
  it('should find a player with a valid ID', () => {
    const player = findPlayerById(players, validPlayerID);
    expect(player).toBeDefined();
    expect(player.ID).toBe(validPlayerID);
  });

  it('should throw an error for an invalid ID', () => {
    const invalidID = -1;
    expect(() => {
      findPlayerById(players, invalidID);
    }).toThrow(RangeError);
  });
});

describe('nextPlayerID', () => {
  it('returns the next ID when there are at least two players', () => {
    expect(nextPlayerID(players, playerOne.ID)).toEqual(playerTwo.ID);
  });
  it('returns the first ID when there provided las player ID', () => {
    expect(nextPlayerID(players, playerThree.ID)).toEqual(playerOne.ID);
  });
  it('returns the same ID when there provided a single player list', () => {
    expect(nextPlayerID([playerOne], playerOne.ID)).toEqual(playerOne.ID);
  });
  it('returns the first playerID when the ID provided is not the list', () => {
    // scenario expected when filtering out eliminated players
    expect(
      nextPlayerID(
        players.filter(p => p.isHuman),
        playerTwo.ID,
      ),
    ).toEqual(playerOne.ID);
  });

  it('throws an exception on an empty list', () => {
    expect(() => nextPlayerID([], validPlayerID)).toThrow(TypeError);
  });
});

describe('generatePlayers', () => {
  it('returns a single player with no input validation when invalid input', () => {
    expect(generatePlayers('human name', 0, -1)).toEqual([
      {ID: 0, name: 'human name', hand: [], lifeCount: -1, isHuman: true},
    ]);
  });
});
