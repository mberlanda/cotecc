import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';

import CheckBox from './Checkbox';

describe('CheckBox', () => {
  it('renders when checked', () => {
    const tree = render(<CheckBox text={'foo'} checked={true} onPress={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
  it('renders when un-checked', () => {
    const tree = render(<CheckBox text={'foo'} checked={false} onPress={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
