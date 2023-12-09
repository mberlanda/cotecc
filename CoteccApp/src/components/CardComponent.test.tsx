import React from 'react';
import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';
import CardComponent from './CardComponent';
import {Suit} from '../utils/constants';
import {Move} from '../types';

const mockCardOne = {suit: Suit.Ori, rank: 5, points: 0};
const mockPlayer = {ID: 0, name: 'foo', hand: [], boleCount: 0, score: 0};
const mockOnCardSelect = (_move: Move): void => {};

describe('CardComponent', () => {
  it('should render correctly with given props', () => {
    const tree = renderer
      .create(
        <CardComponent
          card={mockCardOne}
          player={mockPlayer}
          onCardSelect={mockOnCardSelect}
        />,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
