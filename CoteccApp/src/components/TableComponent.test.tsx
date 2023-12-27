import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import TableComponent from './TableComponent';
import {Move} from '../types';
import {Suit} from '../utils/constants';

describe('TableComponent', () => {
  it('renders without exception when no move', () => {
    const tree = renderer.create(<TableComponent moves={[]} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders without exception when moves provided', () => {
    const moves: Move[] = [
      {playerID: 1, card: {suit: Suit.Ori, rank: 3, points: 0}},
      {playerID: 2, card: {suit: Suit.Ori, rank: 8, points: 3}},
    ];
    const tree = renderer.create(<TableComponent moves={moves} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
