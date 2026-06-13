import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';

import PastTurn from './PastTurn';
import {Suit} from '../utils/constants';
import {newTurn} from '../utils/turnLogic';

describe('PastTurn', () => {
  it('should render correctly with given props', () => {
    const initialPlayerID = 1;
    const previousTurn = {
      ...newTurn(initialPlayerID),
      moves: [
        {card: {suit: Suit.Ori, rank: 5, points: 0}, playerID: initialPlayerID},
        {card: {suit: Suit.Ori, rank: 8, points: 2}, playerID: 2},
      ],
      suit: Suit.Ori,
      winnerID: 2,
    };

    const tree = render(<PastTurn turns={[previousTurn]} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
