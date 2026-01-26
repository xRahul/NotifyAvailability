import React from 'react';
import {TextInput} from 'react-native';
import SearchInput from '../src/components/SearchInput';
import renderer from 'react-test-renderer';

// Mock react-native to work with react-test-renderer
jest.mock('react-native', () => {
  const ReactMock = require('react');
  const TextInputMock = ReactMock.forwardRef((props, ref) =>
    ReactMock.createElement('TextInput', {...props, ref}),
  );
  return {
    TextInput: TextInputMock,
  };
});

describe('SearchInput Performance', () => {
  it('calls persist only on end editing (Optimized)', () => {
    const persistMock = jest.fn();
    const setSearchTextMock = jest.fn();

    const component = renderer.create(
      <SearchInput
        searchText=""
        setSearchText={setSearchTextMock}
        persist={persistMock}
      />,
    );

    const root = component.root;
    const textInput = root.findByType(TextInput);

    // Simulate typing "hello"
    textInput.props.onChangeText('h');
    textInput.props.onChangeText('he');
    textInput.props.onChangeText('hel');
    textInput.props.onChangeText('hell');
    textInput.props.onChangeText('hello');

    // Optimization check: persist should NOT be called during typing
    expect(persistMock).toHaveBeenCalledTimes(0);

    // Simulate end editing with the final text
    textInput.props.onEndEditing({nativeEvent: {text: 'hello'}});

    // Validation check: persist should be called ONCE when editing ends
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith('searchText', 'hello');
  });
});
