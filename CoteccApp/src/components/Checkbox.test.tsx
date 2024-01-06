import React from 'react';

import {describe, expect, it} from '@jest/globals';
import renderer from 'react-test-renderer';

import CheckBox from './Checkbox';

describe('CheckBox', () => {
  it('renders when checked', () => {
    const tree = renderer
      .create(<CheckBox text={'foo'} checked={true} onPress={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
  it('renders when un-checked', () => {
    const tree = renderer
      .create(<CheckBox text={'foo'} checked={false} onPress={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
