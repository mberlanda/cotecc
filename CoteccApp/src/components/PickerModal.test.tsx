/** @jest-environment jsdom */
import React from 'react';

import {describe, expect, it} from '@jest/globals';
import {fireEvent, render, screen} from '@testing-library/react-native';
import renderer from 'react-test-renderer';

import PickerModal from './PickerModal';

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
// https://callstack.github.io/react-native-testing-library/docs/getting-started
describe('PickerModal', () => {
  const mockOnValueChange = jest.fn();
  const options = {1: 'Option 1', 2: 'Option 2'};
  const selectedValue = 1;

  it('renders correctly', () => {
    render(
      <PickerModal
        id="test-modal"
        options={options}
        selectedValue={selectedValue}
        onValueChange={mockOnValueChange}
        title="Test Modal"
      />,
    );
    expect(screen.getByText('Test Modal: Option 1')).toBeTruthy();
  });

  it('opens and closes the modal', () => {
    render(
      <PickerModal
        id="test-modal"
        options={options}
        selectedValue={selectedValue}
        onValueChange={mockOnValueChange}
        title="Test Modal"
      />,
    );
    fireEvent.press(screen.getByText('Test Modal: Option 1'));
    expect(screen.getByText('Option 1')).toBeTruthy();

    fireEvent.press(screen.getByText('Option 1')); // Adjust this to target the modal overlay
    expect(screen.queryByText('Option 1')).toBeNull();
  });

  it('handles option selection', () => {
    render(
      <PickerModal
        id="test-modal"
        options={options}
        selectedValue={selectedValue}
        onValueChange={mockOnValueChange}
        title="Test Modal"
      />,
    );
    fireEvent.press(screen.getByText('Test Modal: Option 1'));
    fireEvent.press(screen.getByText('Option 2'));

    expect(mockOnValueChange).toHaveBeenCalledWith('1');
    expect(mockOnValueChange).toHaveBeenCalledWith('2');
    expect(screen.queryByText('Option 2')).toBeNull();
  });

  it('renders without errors', () => {
    const tree = renderer
      .create(
        <PickerModal
          id={'foo'}
          options={options}
          title={'foobarbaz'}
          selectedValue={2}
          onValueChange={() => {}}
        />,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
