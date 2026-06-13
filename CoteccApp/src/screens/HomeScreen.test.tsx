import React from 'react';

import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import HomeScreen from './HomeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
  useLocalSearchParams: () => ({
    name: 'Mauro',
    sessionType: 'guest',
    language: 'en',
  }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows the player name from params', () => {
    const {getByText} = render(<HomeScreen />);
    expect(getByText('Mauro')).toBeTruthy();
  });

  it('pushes to /game with default setup when starting a game', () => {
    const {getByText} = render(<HomeScreen />);
    fireEvent.press(getByText('New game vs computer'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/game',
      params: {
        gameSpeed: 500,
        playerCount: 4,
        name: 'Mauro',
        showDebug: 'false',
        maxLifeCount: 4,
        sessionType: 'guest',
        language: 'en',
      },
    });
  });
});
