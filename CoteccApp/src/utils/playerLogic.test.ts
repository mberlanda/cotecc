import {describe, expect, it} from '@jest/globals';

import {
  findPlayerById,
  generatePlayers,
  nextPlayerID,
  updateLivesCount,
} from './playerLogic';
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
  it('clamps invalid input to the minimum table size', () => {
    expect(generatePlayers('human name', 0, -1)).toEqual([
      {ID: 0, name: 'human name', hand: [], lifeCount: -1, isHuman: true},
      {ID: 1, name: 'Bruno', lifeCount: -1, isHuman: false},
    ]);
  });

  it('generates 2 players when 2 total players are requested', () => {
    const result = generatePlayers('Alice', 2, 3);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ID: 0, name: 'Alice', isHuman: true});
    expect(result[1].isHuman).toBe(false);
    expect(result.every(p => p.lifeCount === 3)).toBe(true);
  });

  it('generates 3 players when 3 total players are requested', () => {
    const result = generatePlayers('Bob', 3, 5);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ID: 0, name: 'Bob', isHuman: true});
    expect(result.filter(p => !p.isHuman)).toHaveLength(2);
    expect(result.every(p => p.lifeCount === 5)).toBe(true);
  });

  it('generates 6 players when 6 total players are requested', () => {
    const result = generatePlayers('Carol', 6, 3);

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ID: 0, name: 'Carol', isHuman: true});
    expect(result.filter(p => !p.isHuman)).toHaveLength(5);
  });

  it('caps total players at 6 even when more are requested', () => {
    const result = generatePlayers('Dave', 10, 3);

    expect(result).toHaveLength(6);
    expect(result.filter(p => !p.isHuman)).toHaveLength(5);
  });
});

describe('updateLivesCount', () => {
  it('handles capot scenario when max lives count is below threshold', () => {
    const winner: Player = {...playerOne};
    const loser: Player = {...playerTwo};

    expect(winner.lifeCount).toEqual(3);
    expect(loser.lifeCount).toEqual(3);

    const roundOutcome = {
      outcome: 0,
      winnerID: winner.ID,
      roundLosers: new Set([loser.ID]),
    };
    updateLivesCount([winner, loser], roundOutcome, 4);

    expect(winner.lifeCount).toEqual(4);
    expect(loser.lifeCount).toEqual(2);
  });

  it('handles capot scenario when max lives count is at threshold', () => {
    const winner: Player = {...playerOne};
    const loser: Player = {...playerTwo};

    expect(winner.lifeCount).toEqual(3);
    expect(loser.lifeCount).toEqual(3);

    const roundOutcome = {
      outcome: 0,
      winnerID: winner.ID,
      roundLosers: new Set([loser.ID]),
    };
    updateLivesCount([winner, loser], roundOutcome, 3);

    expect(winner.lifeCount).toEqual(3);
    expect(loser.lifeCount).toEqual(2);
  });

  it('handles max score scenario', () => {
    const winner: Player = {...playerOne};
    const loser: Player = {...playerTwo};

    expect(winner.lifeCount).toEqual(3);
    expect(loser.lifeCount).toEqual(3);

    const roundOutcome = {
      outcome: 1,
      roundLosers: new Set([loser.ID]),
    };
    updateLivesCount([winner, loser], roundOutcome, 4);

    expect(winner.lifeCount).toEqual(3);
    expect(loser.lifeCount).toEqual(2);
  });

  it('sanitizes incosistent scenarios with too high or too low values', () => {
    const winner: Player = {...playerOne};
    const loser: Player = {...playerTwo};

    winner.lifeCount = 1000;
    loser.lifeCount = -1000;

    expect(winner.lifeCount).toEqual(1000);
    expect(loser.lifeCount).toEqual(-1000);

    const roundOutcome = {
      outcome: 0,
      winnerID: winner.ID,
      roundLosers: new Set([loser.ID]),
    };
    updateLivesCount([winner, loser], roundOutcome, 3);

    expect(winner.lifeCount).toEqual(3);
    expect(loser.lifeCount).toEqual(0);
  });
});
