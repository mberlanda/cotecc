import {beforeEach, describe, expect, it} from '@jest/globals';

import {shuffleDeck} from './cardsLogic';
import {Suit} from './constants';
import {
  checkForElimination,
  endRound,
  getFinalStandings,
  getGameWinner,
  isGameOver,
  isHumanEliminated,
  makeMove,
  newGame,
  nextMove,
  playCard,
  simulateGameToEnd,
} from './gameLogic';
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
      // Player 2 was eliminated (0 lives) but re-entered with 1 life
      // because the second-lowest active player (player 1) has lifeCount > 1
      expect(gameState.players[2].lifeCount).toEqual(1);
    });
  });

  describe('checkForElimination', () => {
    it('returns empty array when no players are eliminated', () => {
      const activePlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 2, isHuman: false},
      ];
      expect(checkForElimination(activePlayers)).toEqual([]);
    });

    it('returns eliminated players when no re-entry is possible', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 1, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 1, isHuman: false},
        {ID: 2, name: 'c', lifeCount: 0, isHuman: false},
      ];
      const eliminated = checkForElimination(testPlayers);
      expect(eliminated.map(p => p.ID)).toEqual([2]);
      expect(testPlayers[2].lifeCount).toEqual(0);
    });

    it('re-enters eliminated players when second-lowest active life count > 1', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 2, isHuman: false},
        {ID: 2, name: 'c', lifeCount: 0, isHuman: false},
      ];
      const eliminated = checkForElimination(testPlayers);
      expect(eliminated).toEqual([]);
      expect(testPlayers[2].lifeCount).toEqual(1);
    });

    it('returns eliminated players when only one active player remains', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 0, isHuman: false},
        {ID: 2, name: 'c', lifeCount: 0, isHuman: false},
      ];
      const eliminated = checkForElimination(testPlayers);
      expect(eliminated.map(p => p.ID)).toEqual([1, 2]);
    });
  });

  describe('isGameOver', () => {
    it('returns false when multiple players have lives', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 1, isHuman: false},
      ];
      expect(isGameOver(testPlayers)).toBe(false);
    });

    it('returns true when only one player has lives', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 0, isHuman: false},
        {ID: 2, name: 'c', lifeCount: 0, isHuman: false},
      ];
      expect(isGameOver(testPlayers)).toBe(true);
    });

    it('returns true when no players have lives', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 0, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 0, isHuman: false},
      ];
      expect(isGameOver(testPlayers)).toBe(true);
    });
  });

  describe('isHumanEliminated', () => {
    it('returns true when the human player has no lives, even if AI players remain active', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 0, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 3, isHuman: false},
        {ID: 2, name: 'c', lifeCount: 2, isHuman: false},
      ];
      expect(isHumanEliminated(testPlayers)).toBe(true);
    });

    it('returns false when the human player still has lives', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 1, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 0, isHuman: false},
      ];
      expect(isHumanEliminated(testPlayers)).toBe(false);
    });

    it('returns false when there is no human player', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 0, isHuman: false},
        {ID: 1, name: 'b', lifeCount: 3, isHuman: false},
      ];
      expect(isHumanEliminated(testPlayers)).toBe(false);
    });
  });

  describe('getFinalStandings', () => {
    it('ranks the survivor first, then eliminated players in reverse elimination order', () => {
      gameState.players = [
        {ID: 0, name: 'a', lifeCount: 0, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 0, isHuman: false},
        {ID: 2, name: 'c', lifeCount: 2, isHuman: false},
      ];
      // 'a' was eliminated first, then 'b'; 'c' is the last one standing.
      gameState.eliminationOrder = [0, 1];

      expect(getFinalStandings(gameState).map(p => p.ID)).toEqual([2, 1, 0]);
    });

    it('orders multiple survivors by remaining lives, highest first', () => {
      gameState.players = [
        {ID: 0, name: 'a', lifeCount: 1, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 3, isHuman: false},
      ];
      gameState.eliminationOrder = [];

      expect(getFinalStandings(gameState).map(p => p.ID)).toEqual([1, 0]);
    });
  });

  describe('simulateGameToEnd', () => {
    it('plays out the remaining game until a single player has lives', () => {
      gameState.players.forEach(p => (p.lifeCount = 1));

      simulateGameToEnd(gameState);

      expect(isGameOver(gameState.players)).toBe(true);
      expect(gameState.players.filter(p => p.lifeCount > 0).length).toBe(1);
      // Everyone but the survivor is recorded in elimination order.
      expect(gameState.eliminationOrder.length).toBe(
        gameState.players.length - 1,
      );
      expect(getFinalStandings(gameState)[0].lifeCount).toBeGreaterThan(0);
    });
  });

  describe('getGameWinner', () => {
    it('returns the winner when exactly one player has lives', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 0, isHuman: false},
      ];
      expect(getGameWinner(testPlayers)?.ID).toEqual(0);
    });

    it('returns undefined when multiple players have lives', () => {
      const testPlayers: Player[] = [
        {ID: 0, name: 'a', lifeCount: 3, isHuman: true},
        {ID: 1, name: 'b', lifeCount: 1, isHuman: false},
      ];
      expect(getGameWinner(testPlayers)).toBeUndefined();
    });
  });
});
