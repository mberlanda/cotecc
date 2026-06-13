import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';

import StickyHeader from './StickyHeader';

describe('StickyHeader', () => {
  it('renders without exception', () => {
    const tree = render(<StickyHeader />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
