import React from 'react';

import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import AuthScreen from './AuthScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('pushes to /home as guest with the entered name', () => {
    const {getByPlaceholderText, getAllByText} = render(<AuthScreen />);
    fireEvent.changeText(getByPlaceholderText('Player name'), 'Mauro');
    fireEvent.press(getAllByText('Play as guest').slice(-1)[0]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/home',
      params: {name: 'Mauro', sessionType: 'guest', language: 'en'},
    });
  });

  it('does not navigate when the guest name is empty', () => {
    const {getAllByText} = render(<AuthScreen />);
    fireEvent.press(getAllByText('Play as guest').slice(-1)[0]);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
