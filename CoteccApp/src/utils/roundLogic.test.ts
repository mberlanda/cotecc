import {newGame} from './gameLogic';
import {newRound, nextRound} from './roundLogic';

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
