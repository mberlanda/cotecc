import {beforeEach, describe, expect, it} from '@jest/globals';

import {
  newRound,
  playAICard,
  playCard,
  processCardPlay,
  validateSuit,
} from './gameLogic';
import {Card, GameState, Player} from '../types';

const playerOne = {ID: 0, name: 'foo', hand: [], boleCount: 0, isHuman: true};
const playerTwo = {ID: 1, name: 'bar', hand: [], boleCount: 0, isHuman: false};
const playerThree = {
  ID: 2,
  name: 'baz',
  hand: [],
  boleCount: 0,
  isHuman: false,
};
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

  it('sets suit of the same card as the card played by the first player', () => {
    const playedCard: Card = gameState.players[0].hand[0];

    playCard(gameState, playerOne.ID, playedCard);

    const currentTurn = gameState.currentTurn;
    expect(currentTurn.moves).toEqual([
      {playerID: playerOne.ID, card: playedCard},
    ]);
    expect(currentTurn.highestCard).toEqual(playedCard);
    expect(currentTurn.suit).toEqual(playedCard.suit);
    expect(currentTurn.winnerID).toEqual(playerOne.ID);

    expect(currentTurn.currentPlayerID).toEqual(playerTwo.ID);
  });
});

describe('playAICard', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newRound(
      players.map(p => Object.create(p)),
      players[0].ID,
    );
  });

  it('throws an exception if the player has an empty hand', () => {
    const playerWithoutCards = gameState.players[0];
    playerWithoutCards.hand = [];

    expect(() => {
      playAICard(gameState, playerWithoutCards);
    }).toThrowError();
  });
});

describe('validateSuit', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newRound(
      players.map(p => Object.create(p)),
      players[0].ID,
    );
  });

  it('returns without exception if suit is not set', () => {
    validateSuit(gameState, gameState.players[0], gameState.players[0].hand[0]);
  });

  it('returns without exception if player follows current turn suit', () => {
    const playedCard = gameState.players[0].hand[0];
    gameState.currentTurn.suit = playedCard.suit;

    validateSuit(gameState, gameState.players[0], playedCard);
  });

  it('throws error when the player has at least one card of the suit and does not play it', () => {
    const playedCard = gameState.players[0].hand[0];
    gameState.currentTurn.suit = playedCard.suit;
    const otherSuit = ['ori', 'spade'].find(el => el !== playedCard.suit)!;

    expect(() =>
      validateSuit(gameState, gameState.players[0], {
        ...playedCard,
        suit: otherSuit,
      }),
    ).toThrowError();
  });
});

describe('processCardPlay', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newRound(
      players.map(p => Object.create(p)),
      players[0].ID,
    );
  });

  it('throws an exception if the player does not own the card', () => {
    const aPlayer = gameState.players[0];
    const otherPlayerCard = gameState.players[1].hand[0];

    expect(() => {
      processCardPlay(gameState, aPlayer, otherPlayerCard);
    }).toThrowError();
  });
});
