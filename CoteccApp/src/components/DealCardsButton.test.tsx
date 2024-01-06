import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import DealCardsButton from './DealCardsButton';

describe('DealCardsButton', () => {
  it('renders without error', () => {
    const tree = renderer
      .create(<DealCardsButton doDealCards={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
