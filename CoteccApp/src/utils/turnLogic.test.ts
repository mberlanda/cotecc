import {describe, expect, it} from '@jest/globals';

import {newTurn, resetTurnState} from './turnLogic';

describe('newTurn', () => {
  it('returns an empty turn', () => {
    const emptyTurn = newTurn(1);
    expect(emptyTurn).toEqual({
      currentPlayerID: 1,
      highestCard: null,
      moves: [],
      suit: null,
      winnerID: null,
    });
  });
});

describe('resetTurnState', () => {
  it('restore an empty turn as round current turn', () => {
    const initialPlayerID = 123;
    const round = {
      ID: 1,
      initialPlayerID,
      currentTurn: newTurn(initialPlayerID),
      pastTurns: [],
    };
    expect(round.currentTurn.currentPlayerID).toEqual(initialPlayerID);

    const nextPlayerID = 432;
    resetTurnState(round, nextPlayerID);
    expect(round.currentTurn.currentPlayerID).toEqual(nextPlayerID);
  });
});
