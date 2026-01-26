import React from 'react';
import UrlInput from '../src/components/UrlInput';
import renderer from 'react-test-renderer';

// Mock React Native
jest.mock('react-native', () => {
  // eslint-disable-next-line no-shadow
  const React = require('react');
  const TextInput = React.forwardRef((props, ref) =>
    React.createElement('TextInput', {...props, ref}),
  );
  return {
    TextInput,
  };
});

describe('UrlInput Performance', () => {
  it('should only persist data once when editing ends, not on every keystroke', () => {
    const mockSetUrl = jest.fn();
    const mockPersist = jest.fn();
    const mockOnSubmitEditing = jest.fn();

    const component = renderer.create(
      <UrlInput
        url=""
        setUrl={mockSetUrl}
        persist={mockPersist}
        onSubmitEditing={mockOnSubmitEditing}
      />,
    );

    const textInput = component.root.findByType('TextInput');

    // Simulate typing "http"
    // In the unoptimized version, this triggers persist 4 times
    textInput.props.onChangeText('h');
    textInput.props.onChangeText('ht');
    textInput.props.onChangeText('htt');
    textInput.props.onChangeText('http');

    // In the optimized version, we expect 0 calls here,
    // and 1 call after onEndEditing.
    // However, for this test to be a "Performance Benchmark" that fails initially:
    // We expect the final desired state: 1 call total (or 0 during typing).

    // Let's assert strictly for the desired outcome.
    // If it fails (calls = 4), we know we have room to optimize.

    // Simulate end editing
    if (textInput.props.onEndEditing) {
      textInput.props.onEndEditing({nativeEvent: {text: 'http'}});
    }

    // Expectation: persist called exactly ONCE (on save/exit), or at least NOT 4 times.
    // Ideally, we want 1 call.
    // Current behavior: 4 calls (from onChangeText) + 0 calls (from onEndEditing, not implemented yet) = 4 calls.
    expect(mockPersist).toHaveBeenCalledTimes(1);
    expect(mockPersist).toHaveBeenCalledWith('url', 'http');
  });
});
