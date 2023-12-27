import {beforeEach, describe, expect, it} from '@jest/globals';

import {Suit} from './constants';
import {
  endRound,
  newGame,
  newTurn,
  playCard,
  processCardPlay,
  validateSuit,
} from './gameLogic';
import {Card, GameState, Player} from '../types';

const playerOne = {ID: 0, name: 'foo', hand: [], lifeCount: 3, isHuman: true};
const playerTwo = {ID: 1, name: 'bar', hand: [], lifeCount: 3, isHuman: false};
const playerThree = {
  ID: 2,
  name: 'baz',
  hand: [],
  lifeCount: 3,
  isHuman: false,
};
const players: Player[] = [playerOne, playerTwo, playerThree];

describe('playCard', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newGame(
      players.map(p => Object.create(p)),
      players[0].ID,
      4,
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

    const currentTurn = gameState.currentRound.currentTurn;
    expect(currentTurn.moves).toEqual([
      {playerID: playerOne.ID, card: playedCard},
    ]);
    expect(currentTurn.highestCard).toEqual(playedCard);
    expect(currentTurn.suit).toEqual(playedCard.suit);
    expect(currentTurn.winnerID).toEqual(playerOne.ID);

    expect(currentTurn.currentPlayerID).toEqual(playerTwo.ID);
  });
});

describe('validateSuit', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newGame(
      players.map(p => Object.create(p)),
      players[0].ID,
      4,
    );
  });

  it('returns without exception if suit is not set', () => {
    validateSuit(gameState, gameState.players[0], gameState.players[0].hand[0]);
  });

  it('returns without exception if player follows current turn suit', () => {
    const playedCard = gameState.players[0].hand[0];
    gameState.currentRound.currentTurn.suit = playedCard.suit;

    validateSuit(gameState, gameState.players[0], playedCard);
  });

  it('throws error when the player has at least one card of the suit and does not play it', () => {
    const playedCard = gameState.players[0].hand[0];
    gameState.currentRound.currentTurn.suit = playedCard.suit;
    const otherSuit = [Suit.Ori, Suit.Spade].find(
      el => el !== playedCard.suit,
    )!;

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
    gameState = newGame(
      players.map(p => Object.create(p)),
      players[0].ID,
      4,
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

describe('endRound', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = newGame(
      players.map(p => Object.create(p)),
      players[0].ID,
      4,
    );
  });

  it('handles capot as expected', () => {
    const winner = gameState.players[0];

    const fakeTurn = newTurn(winner.ID);
    gameState.players.forEach(p => {
      const playedCard = p.hand.slice(0, 1);
      fakeTurn.currentPlayerID = p.ID;
      fakeTurn.suit ||= playedCard[0].suit;
      fakeTurn.moves.push({card: playedCard[0], playerID: p.ID});
      p.hand = [];
    });
    fakeTurn.winnerID = winner.ID;
    gameState.currentRound.pastTurns.push(fakeTurn);

    gameState.players.forEach(p => expect(p.lifeCount).toEqual(3));

    endRound(gameState, winner.ID);
    expect(gameState.players[0].lifeCount).toEqual(4);
    for (let i = 1; i < gameState.players.length; i++) {
      expect(gameState.players[i].lifeCount).toEqual(2);
    }
  });
});
