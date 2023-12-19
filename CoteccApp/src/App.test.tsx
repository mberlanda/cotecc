import React from 'react';

import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {useColorScheme as mockUseColorScheme} from 'react-native/Libraries/Utilities/Appearance';
import renderer from 'react-test-renderer';

import App from './App';
import {shuffleDeck as mockShuffleDeck} from './utils/cardsLogic';

jest
  .mock('react-native/Libraries/NewAppScreen')
  .mock('./utils/cardsLogic', () => {
    const actualModule = jest.requireActual('./utils/cardsLogic') as any;
    return {
      ...actualModule,
      // mock shuffleDeck with identity function so snapshots don't fail
      shuffleDeck: jest.fn(),
    };
  });

describe('App', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders in default mode', () => {
    (mockUseColorScheme as jest.Mock).mockReturnValue('light');
    (mockShuffleDeck as jest.Mock).mockImplementation(deck => deck);
    const tree = renderer.create(<App />).toJSON();
    expect(tree).toMatchSnapshot();
  });
  it('renders in dark mode ', () => {
    (mockUseColorScheme as jest.Mock).mockReturnValue('dark');
    (mockShuffleDeck as jest.Mock).mockImplementation(deck => deck);
    const tree = renderer.create(<App />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
