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
  it('returns a single player with no input validation when invalid input', () => {
    expect(generatePlayers('human name', 0, -1)).toEqual([
      {ID: 0, name: 'human name', hand: [], lifeCount: -1, isHuman: true},
    ]);
  });

  it('generates 2 players when 1 opponent is requested', () => {
    const players = generatePlayers('Alice', 1, 3);

    expect(players).toHaveLength(2);
    expect(players[0]).toMatchObject({ID: 0, name: 'Alice', isHuman: true});
    expect(players[1].isHuman).toBe(false);
    expect(players.every(p => p.lifeCount === 3)).toBe(true);
  });

  it('generates 3 players when 2 opponents are requested', () => {
    const players = generatePlayers('Bob', 2, 5);

    expect(players).toHaveLength(3);
    expect(players[0]).toMatchObject({ID: 0, name: 'Bob', isHuman: true});
    expect(players.filter(p => !p.isHuman)).toHaveLength(2);
    expect(players.every(p => p.lifeCount === 5)).toBe(true);
  });

  it('generates 5 players when 4 opponents are requested', () => {
    const players = generatePlayers('Carol', 4, 3);

    expect(players).toHaveLength(5);
    expect(players[0]).toMatchObject({ID: 0, name: 'Carol', isHuman: true});
    expect(players.filter(p => !p.isHuman)).toHaveLength(4);
  });

  it('caps AI opponents at 4 even when more are requested', () => {
    const players = generatePlayers('Dave', 10, 3);

    expect(players).toHaveLength(5);
    expect(players.filter(p => !p.isHuman)).toHaveLength(4);
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
