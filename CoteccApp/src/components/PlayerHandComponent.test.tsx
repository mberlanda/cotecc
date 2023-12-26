import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import PlayerHand from './PlayerHandComponent';
import {Move} from '../types';
import {Suit} from '../utils/constants';

const mockCardOne = {suit: Suit.Ori, rank: 5, points: 0};
const mockCardTwo = {suit: Suit.Ori, rank: 1, points: 6};
const mockPlayer = {
  ID: 0,
  name: 'foo',
  hand: [mockCardOne, mockCardTwo],
  boleCount: 0,
  score: 0,
};
const mockOnCardSelect = (_move: Move): void => {};

describe('PlayerHand', () => {
  it('should render correctly with given props', () => {
    const tree = renderer
      .create(
        <PlayerHand player={mockPlayer} onCardSelect={mockOnCardSelect} />,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
