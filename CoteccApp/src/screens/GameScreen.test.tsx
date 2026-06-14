import React from 'react';

import {describe, expect, it, jest} from '@jest/globals';
import {act, render} from '@testing-library/react-native';

import GameScreen from './GameScreen';
import {GameState} from '../types';
import {GAME_OVER_SIM_DELAY_MS, ROUND_END_DELAY_MS} from '../utils/constants';
import {newTurn} from '../utils/turnLogic';

const players = [
  {ID: 0, name: 'Mauro', lifeCount: 4, isHuman: true},
  {ID: 1, name: 'Bruno', lifeCount: 4, isHuman: false},
];

const mockCompletedRoundState: GameState = {
  players,
  initialPlayerID: 0,
  currentRound: {
    ID: 1,
    initialPlayerID: 0,
    currentTurn: newTurn(0),
    pastTurns: [],
    players: players.map(player => ({
      playerID: player.ID,
      isHuman: player.isHuman,
      cards: [],
      cardsBySuit: {
        ori: [],
        spade: [],
        bastoni: [],
        coppe: [],
      },
    })),
    scoresMap: {
      0: 18,
      1: 6,
    },
  },
  pastRounds: [],
  maxLifeCount: 4,
  eliminationOrder: [],
};

jest.mock('../utils/gameLogic', () => ({
  ...(jest.requireActual('../utils/gameLogic') as object),
  newGame: jest.fn(() => mockCompletedRoundState),
  simulateGameToEnd: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    gameSpeed: '0',
    playerCount: '2',
    name: 'Mauro',
    showDebug: 'false',
    maxLifeCount: '4',
    sessionType: 'guest',
    language: 'en',
  }),
}));

describe('GameScreen', () => {
  it('shows each player total points and lives when the round is complete', () => {
    const {getByText} = render(<GameScreen />);

    expect(getByText('Mauro — 18 pts · 4 lives')).toBeTruthy();
    expect(getByText('Bruno — 6 pts · 4 lives')).toBeTruthy();
  });

  it('keeps the final trick visible briefly before showing the deal view when a round ends', () => {
    jest.useFakeTimers();
    try {
      // Default mock state: round complete (all hands empty), game not over.
      const {queryByText} = render(<GameScreen />);

      // Immediately after the round ends, the deal view is withheld so the
      // last hand's cards stay on screen.
      expect(queryByText('Deal cards')).toBeNull();

      // Once the delay elapses, the deal view appears.
      act(() => {
        jest.advanceTimersByTime(ROUND_END_DELAY_MS);
      });
      expect(queryByText('Deal cards')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows Game Over then a podium when the human is eliminated while AI players remain', () => {
    jest.useFakeTimers();
    try {
      const humanEliminatedState: GameState = {
        ...mockCompletedRoundState,
        players: [
          {ID: 0, name: 'Mauro', lifeCount: 0, isHuman: true},
          {ID: 1, name: 'Bruno', lifeCount: 4, isHuman: false},
          {ID: 2, name: 'Carla', lifeCount: 4, isHuman: false},
          {ID: 3, name: 'Dora', lifeCount: 4, isHuman: false},
        ],
        eliminationOrder: [0],
      };
      const mocked = jest.requireMock('../utils/gameLogic') as {
        newGame: jest.MockedFunction<() => GameState>;
        simulateGameToEnd: jest.MockedFunction<(gs: GameState) => void>;
      };
      mocked.newGame.mockImplementationOnce(() => humanEliminatedState);
      // Deterministic finish: Carla outlasts everyone; the human (out first)
      // ends up 4th, so they are off the podium.
      mocked.simulateGameToEnd.mockImplementationOnce(gs => {
        gs.players[1].lifeCount = 0; // Bruno
        gs.players[2].lifeCount = 3; // Carla survives
        gs.players[3].lifeCount = 0; // Dora
        gs.eliminationOrder = [0, 3, 1]; // Mauro out first, then Dora, then Bruno
      });

      const {getByText, queryByText} = render(<GameScreen />);

      // First the human sees "Game Over" and play has stopped...
      expect(getByText('Game Over')).toBeTruthy();
      expect(queryByText('Deal cards')).toBeNull();

      // ...then the remaining game is simulated and the podium is revealed.
      act(() => {
        jest.advanceTimersByTime(GAME_OVER_SIM_DELAY_MS);
      });
      expect(getByText('🥇 Carla')).toBeTruthy();
      expect(getByText('🥈 Bruno')).toBeTruthy();
      expect(getByText('🥉 Dora')).toBeTruthy();
      // The human finished outside the top three, so their position is shown.
      expect(getByText('Your position: 4')).toBeTruthy();
      expect(queryByText('Deal cards')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses singular "life" when a player has exactly 1 life remaining', () => {
    const singleLifeState: GameState = {
      ...mockCompletedRoundState,
      players: [
        {ID: 0, name: 'Mauro', lifeCount: 1, isHuman: true},
        {ID: 1, name: 'Bruno', lifeCount: 4, isHuman: false},
      ],
    };
    const {newGame} = jest.requireMock('../utils/gameLogic') as {
      newGame: jest.MockedFunction<() => GameState>;
    };
    newGame.mockImplementationOnce(() => singleLifeState);

    const {getByText} = render(<GameScreen />);

    expect(getByText('Mauro — 18 pts · 1 life')).toBeTruthy();
    expect(getByText('Bruno — 6 pts · 4 lives')).toBeTruthy();
  });
});
