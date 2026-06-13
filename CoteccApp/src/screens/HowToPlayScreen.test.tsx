import React from 'react';

import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import HowToPlayScreen from './HowToPlayScreen';

const mockBack = jest.fn();
const mockNavigate = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    navigate: mockNavigate,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => ({
    name: 'Mauro',
    sessionType: 'guest',
    language: 'en',
  }),
}));

describe('HowToPlayScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockNavigate.mockClear();
    mockCanGoBack = true;
  });

  it('goes back to the existing Home screen when there is history', () => {
    const {getByText} = render(<HowToPlayScreen />);
    fireEvent.press(getByText('Home'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to /home with params when there is no history', () => {
    mockCanGoBack = false;
    const {getByText} = render(<HowToPlayScreen />);
    fireEvent.press(getByText('Home'));

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/home',
      params: {name: 'Mauro', sessionType: 'guest', language: 'en'},
    });
    expect(mockBack).not.toHaveBeenCalled();
  });
});
