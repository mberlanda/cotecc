import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';

import DealCardsButton from './DealCardsButton';

describe('DealCardsButton', () => {
  it('renders without error', () => {
    const tree = render(<DealCardsButton doDealCards={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
