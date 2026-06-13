import React from 'react';

import {describe, expect, it, jest} from '@jest/globals';
import {render} from '@testing-library/react-native';

import GameScreen from './GameScreen';
import {GameState} from '../types';
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
};

jest.mock('../utils/gameLogic', () => ({
  ...(jest.requireActual('../utils/gameLogic') as object),
  newGame: jest.fn(() => mockCompletedRoundState),
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
  it('shows each player total points when the round is complete', () => {
    const {getByText} = render(<GameScreen />);

    expect(getByText('Mauro — 18 pts · 4 lives')).toBeTruthy();
    expect(getByText('Bruno — 6 pts · 4 lives')).toBeTruthy();
  });
});
