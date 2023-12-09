import React from 'react';
import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';
import CardComponent from './CardComponent';
import {Suit} from '../utils/constants';
import {Card} from '../types';

const mockCardOne = {suit: Suit.Ori, rank: 5, points: 0};
const mockOnCardSelect = (_card: Card): void => {};

describe('CardComponent', () => {
  it('should render correctly with given props', () => {
    const tree = renderer
      .create(
        <CardComponent card={mockCardOne} onCardSelect={mockOnCardSelect} />,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
