import React from 'react';

import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import HowToPlayScreen from './HowToPlayScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
  useLocalSearchParams: () => ({
    name: 'Mauro',
    sessionType: 'guest',
    language: 'en',
  }),
}));

describe('HowToPlayScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('pushes back to /home preserving session params', () => {
    const {getByText} = render(<HowToPlayScreen />);
    fireEvent.press(getByText('Home'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/home',
      params: {name: 'Mauro', sessionType: 'guest', language: 'en'},
    });
  });
});
