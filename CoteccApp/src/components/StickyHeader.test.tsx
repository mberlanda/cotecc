import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import StickyHeader from './StickyHeader';

describe('StickyHeader', () => {
  it('renders without exception', () => {
    const tree = renderer.create(<StickyHeader />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
