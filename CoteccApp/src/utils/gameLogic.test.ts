import {beforeEach, describe, expect, it} from '@jest/globals';
import {findPlayerById, playCard} from './gameLogic';
import {Card, GameState, Player} from '../types';
import {createDeck, dealCards, shuffleDeck} from './cardsLogic';

const validPlayerID = 123;
const playerOne = {
  ID: validPlayerID,
  name: 'foo',
  hand: [],
  boleCount: 0,
  score: 0,
};
const playerTwo = {ID: 1, name: 'bar', hand: [], boleCount: 0, score: 0};
const playerThree = {ID: 2, name: 'baz', hand: [], boleCount: 0, score: 0};
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

describe('playCard', () => {
  let gameState: GameState;
  let player: Player;
  let playedCard: Card;

  beforeEach(() => {
    gameState = {
      players: players.map(p => Object.create(p)),
      deck: shuffleDeck(createDeck()),
      currentPlayerID: players[0].ID,
      currentSuit: null,
      currentHighestCard: null,
      currentWinnerID: players[0].ID,
      currentMoves: [],
      pastTurns: [],
    };
    player = gameState.players[0];
    dealCards(gameState.deck, gameState.players);
  });

  it('does not change the gameState when other player does not respect the turn', () => {
    const otherPlayer = gameState.players[1];
    playCard(gameState, otherPlayer, otherPlayer.hand[0]);

    expect(gameState).toEqual(gameState);
  });
});
