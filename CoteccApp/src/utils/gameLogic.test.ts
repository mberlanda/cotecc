import {beforeEach, describe, expect, it} from '@jest/globals';

import {shuffleDeck} from './cardsLogic';
import {Suit} from './constants';
import {endRound, makeMove, newGame, nextMove, playCard} from './gameLogic';
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

jest.mock('./cardsLogic', () => {
  const actualModule = jest.requireActual('./cardsLogic') as any;
  return {
    ...actualModule,
    // mock shuffleDeck with identity function so snapshots don't fail
    shuffleDeck: jest.fn(),
  };
});

describe('gameLogic', () => {
  let gameState: GameState;

  afterEach(() => {
    jest.resetAllMocks();
  });
  beforeEach(() => {
    (shuffleDeck as jest.Mock).mockImplementation(deck => {
      return deck.sort(
        // reverse sort since dealCards uses pop to remove cards
        (a: Card, b: Card) => b.suit.localeCompare(a.suit) || b.rank - a.rank,
      );
    });
    gameState = newGame(
      players.map(p => Object.create(p)),
      players[0].ID,
      4,
    );
  });

  describe('playCard', () => {
    it('does not change the gameState when other player does not respect the turn', () => {
      const otherPlayer = gameState.currentRound.players[1];
      playCard(gameState, otherPlayer.playerID, otherPlayer.cards[0]);

      expect(gameState).toEqual(gameState);
    });

    it('sets suit of the same card as the card played by the first player', () => {
      const currentPlayer = gameState.currentRound.players[0];
      const playedCard: Card = currentPlayer.cards[0];

      // Validates test setup
      expect(playedCard).toEqual({suit: Suit.Bastoni, rank: 2, points: 0});

      playCard(gameState, currentPlayer.playerID, playedCard);

      const currentTurn = gameState.currentRound.currentTurn;
      expect(currentTurn.moves).toEqual([
        {playerID: playerOne.ID, card: playedCard},
      ]);
      expect(currentTurn.highestCard).toEqual(playedCard);
      expect(currentTurn.suit).toEqual(playedCard.suit);
      expect(currentTurn.winnerID).toEqual(playerOne.ID);

      expect(currentTurn.currentPlayerID).toEqual(playerTwo.ID);

      // Validates test setup
      const nextPlayedCard = gameState.currentRound.players[1].cards[0];
      expect(nextPlayedCard).toEqual({suit: Suit.Bastoni, rank: 9, points: 4});

      playCard(gameState, playerTwo.ID, nextPlayedCard);

      expect(currentTurn.highestCard).toEqual(nextPlayedCard);
      expect(currentTurn.winnerID).toEqual(playerTwo.ID);
    });
  });

  describe('processCardPlay', () => {
    it('throws an exception if the player does not own the card', () => {
      const aPlayer = gameState.currentRound.players[0];
      const otherPlayerCard = gameState.currentRound.players[1].cards[0];
      const currentTurn = gameState.currentRound.currentTurn;

      expect(() => {
        makeMove(currentTurn, aPlayer, otherPlayerCard, () => {});
      }).toThrowError();
    });
  });

  describe('nextMove', () => {
    it('resets turn state after one turn', () => {
      const mockEndRound = jest.fn();
      let currentHand = gameState.currentRound.players[0];

      for (let i = 0; i < 7; i++) {
        gameState.currentRound.players.forEach(hand => {
          currentHand = hand;
          gameState.currentRound.currentTurn.moves.push({
            card: hand.cards.splice(0, 1)[0],
            playerID: hand.playerID,
          });
        });

        nextMove(gameState.currentRound, currentHand, mockEndRound);
      }

      expect(mockEndRound).toHaveBeenCalled();
    });
  });

  describe('endRound', () => {
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
      gameState.players[2].lifeCount = 1;

      endRound(gameState);
      expect(gameState.players[0].lifeCount).toEqual(4);
      expect(gameState.players[1].lifeCount).toEqual(2);
      expect(gameState.players[2].lifeCount).toEqual(0);
    });
  });
});
