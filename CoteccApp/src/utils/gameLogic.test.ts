import {beforeEach, describe, expect, it} from '@jest/globals';

import {endRound, newGame, playCard, processCardPlay} from './gameLogic';
import {newTurn} from './turnLogic';
import {Card, GameState, Player} from '../types';

const playerOne = {ID: 0, name: 'foo', lifeCount: 3, isHuman: true};
const playerTwo = {ID: 1, name: 'bar', lifeCount: 3, isHuman: false};
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
    const otherPlayer = gameState.currentRound.players[1];
    playCard(gameState, otherPlayer.playerID, otherPlayer.cards[0]);

    expect(gameState).toEqual(gameState);
  });

  it('sets suit of the same card as the card played by the first player', () => {
    const currentPlayer = gameState.currentRound.players[0];

    const playedCard: Card = currentPlayer.cards[0];

    playCard(gameState, currentPlayer.playerID, playedCard);

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
    const aPlayer = gameState.currentRound.players[0];
    const otherPlayerCard = gameState.currentRound.players[1].cards[0];

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
    gameState.currentRound.players.forEach(p => {
      const playedCard = p.cards.slice(0, 1);
      fakeTurn.currentPlayerID = p.playerID;
      fakeTurn.suit ||= playedCard[0].suit;
      fakeTurn.moves.push({card: playedCard[0], playerID: p.playerID});
      p.cards = [];
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
