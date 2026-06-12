import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import PlayerHandComponent from './PlayerHandComponent';
import {Move} from '../types';
import {Suit} from '../utils/constants';

const mockCardOne = {suit: Suit.Ori, rank: 5, points: 0};
const mockCardTwo = {suit: Suit.Ori, rank: 11, points: 6};
const mockPlayer = {
  playerID: 0,
  cards: [mockCardOne, mockCardTwo],
  cardsBySuit: {
    bastoni: [],
    coppe: [],
    ori: [mockCardOne, mockCardTwo],
    spade: [],
  },
  isHuman: false,
};
const mockOnCardSelect = (_move: Move): void => {};

describe('PlayerHand', () => {
  it('should render correctly with given props', () => {
    const tree = renderer
      .create(
        <PlayerHandComponent
          hand={mockPlayer}
          onCardSelect={mockOnCardSelect}
        />,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
