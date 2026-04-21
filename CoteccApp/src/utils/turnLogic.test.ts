import {describe, expect, it} from '@jest/globals';

import {Suit} from './constants';
import {endTurn, newTurn, resetTurnState} from './turnLogic';
import {newPlayerHand} from '../__tests__/playerHandTestFixture';
import {Round} from '../types';

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
    const nextPlayerID = 432;
    const round: Round = {
      ID: 1,
      initialPlayerID,
      currentTurn: newTurn(initialPlayerID),
      pastTurns: [],
      players: [
        newPlayerHand({playerID: initialPlayerID}),
        newPlayerHand({playerID: nextPlayerID}),
      ],
      scoresMap: {},
    };
    expect(round.currentTurn.currentPlayerID).toEqual(initialPlayerID);

    resetTurnState(round, nextPlayerID);
    expect(round.currentTurn.currentPlayerID).toEqual(nextPlayerID);
  });
});

describe('endTurn', () => {
  it('processes the score and returns the winnerID', () => {
    const initialPlayerID = 1;
    const prevCurrentTurn = {
      ...newTurn(initialPlayerID),
      moves: [
        {card: {suit: Suit.Ori, rank: 5, points: 0}, playerID: initialPlayerID},
        {card: {suit: Suit.Ori, rank: 8, points: 2}, playerID: 2},
      ],
      suit: Suit.Ori,
      winnerID: 2,
    };
    const round: Round = {
      ID: 1,
      initialPlayerID,
      currentTurn: prevCurrentTurn,
      pastTurns: [],
      players: [
        newPlayerHand({
          cards: [{suit: Suit.Ori, rank: 5, points: 0}],
          playerID: initialPlayerID,
        }),
        newPlayerHand({
          cards: [{suit: Suit.Ori, rank: 8, points: 2}],
          playerID: 2,
        }),
      ],
      scoresMap: {},
    };

    const winnerID = endTurn(round);
    expect(winnerID).toEqual(2);
  });
});
