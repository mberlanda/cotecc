import {newGame} from './gameLogic';
import {computeRoundOutcome, newRound, nextRound} from './roundLogic';
import {RoundOutcome} from '../types';

const playerOne = {ID: 0, name: 'foo', lifeCount: 3, isHuman: true};
const playerTwo = {ID: 1, name: 'bar', lifeCount: 3, isHuman: false};
const playerEliminated = {ID: 2, name: 'baz', lifeCount: 0, isHuman: false};

describe('newRound', () => {
  it('creates a new round state where only active players are present', () => {
    const players = [playerOne, playerEliminated];
    const round = newRound(1, playerOne.ID, players);

    expect(round.initialPlayerID).toEqual(playerOne.ID);
    expect(round.players.length).toEqual(1);
  });
});

describe('nextRound', () => {
  it('creates the next round only with active players', () => {
    const players = [playerOne, playerTwo, playerEliminated];
    const gameState = newGame(players, playerOne.ID, 2);

    expect(gameState.currentRound.ID).toEqual(1);
    expect(gameState.currentRound.initialPlayerID).toEqual(playerOne.ID);

    nextRound(gameState);

    expect(gameState.currentRound.ID).toEqual(2);
    expect(gameState.currentRound.initialPlayerID).toEqual(playerTwo.ID);
  });
});

describe('computeRoundOutcome', () => {
  it('returns capot when one player takes all hands', () => {
    const players = [playerOne, playerTwo];
    const round = newRound(1, playerOne.ID, players);

    round.pastTurns = [
      {
        currentPlayerID: playerOne.ID,
        highestCard: null,
        moves: [],
        suit: null,
        winnerID: playerOne.ID,
      },
      {
        currentPlayerID: playerOne.ID,
        highestCard: null,
        moves: [],
        suit: null,
        winnerID: playerOne.ID,
      },
    ];

    const computedOutcome = computeRoundOutcome(round);

    expect(computedOutcome.outcome).toEqual(RoundOutcome.CAPOT);
    expect(computedOutcome.winnerID).toEqual(playerOne.ID);
    expect(computedOutcome.roundLosers).toEqual(new Set([playerTwo.ID]));
  });

  it('returns max_score when more than one player takes at least one hand', () => {
    const players = [playerOne, playerTwo];
    const round = newRound(1, playerOne.ID, players);

    round.pastTurns = [
      {
        currentPlayerID: playerOne.ID,
        highestCard: null,
        moves: [],
        suit: null,
        winnerID: playerOne.ID,
      },
      {
        currentPlayerID: playerOne.ID,
        highestCard: null,
        moves: [],
        suit: null,
        winnerID: playerTwo.ID,
      },
    ];

    round.scoresMap[playerOne.ID] = 10;
    round.scoresMap[playerTwo.ID] = 6;

    const computedOutcome = computeRoundOutcome(round);

    expect(computedOutcome.outcome).toEqual(RoundOutcome.MAX_SCORE);
    expect(computedOutcome.winnerID).toBeUndefined();
    expect(computedOutcome.roundLosers).toEqual(new Set([playerOne.ID]));
  });
});
