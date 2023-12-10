import {beforeEach, describe, expect, it} from '@jest/globals';
import {newRound, playCard} from './gameLogic';
import {GameState, Player} from '../types';

const validPlayerID = 123;
const playerOne = {ID: validPlayerID, name: 'foo', hand: [], boleCount: 0};
const playerTwo = {ID: 1, name: 'bar', hand: [], boleCount: 0};
const playerThree = {ID: 2, name: 'baz', hand: [], boleCount: 0};
const players: Player[] = [playerOne, playerTwo, playerThree];

describe('playCard', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newRound(
      players.map(p => Object.create(p)),
      players[0].ID,
    );
  });

  it('does not change the gameState when other player does not respect the turn', () => {
    const otherPlayer = gameState.players[1];
    playCard(gameState, otherPlayer.ID, otherPlayer.hand[0]);

    expect(gameState).toEqual(gameState);
  });
});
