import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';

import CardComponent from './CardComponent';
import {Move} from '../types';
import {Suit} from '../utils/constants';

const mockCardOne = {suit: Suit.Ori, rank: 5, points: 0};
const mockOnCardSelect = (_move: Move): void => {};

describe('CardComponent', () => {
  it('should render correctly with given props', () => {
    const tree = render(
        <CardComponent
          card={mockCardOne}
          playerID={0}
          onCardSelect={mockOnCardSelect}
        />,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
