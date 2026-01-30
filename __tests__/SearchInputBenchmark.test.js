import React, { useState } from 'react';
import renderer, { act } from 'react-test-renderer';
import SearchInput from '../src/components/SearchInput';
import { TextInput } from 'react-native';

const mockRenderSpy = jest.fn();

// Mock react-native to work with react-test-renderer and spy on TextInput
jest.mock('react-native', () => {
  const ReactMock = require('react');
  const TextInputMock = ReactMock.forwardRef((props, ref) => {
    mockRenderSpy();
    return ReactMock.createElement('TextInput', {...props, ref});
  });
  return {
    TextInput: TextInputMock,
  };
});

describe('SearchInput Re-render Benchmark', () => {
  it('renders SearchInput only once when parent updates with stable props (optimized)', () => {
    const persistMock = jest.fn();
    const setSearchTextMock = jest.fn();

    const Parent = () => {
      const [count, setCount] = useState(0);

      // We simulate a stable persist function here to isolate SearchInput's behavior
      // independent of App.js implementation for now.
      const stablePersist = persistMock;

      return (
        <React.Fragment>
          <SearchInput
            searchText="test"
            setSearchText={setSearchTextMock}
            persist={stablePersist}
          />
          <TextInput testID="updater" onChangeText={() => setCount(count + 1)} />
        </React.Fragment>
      );
    };

    const component = renderer.create(<Parent />);

    // Initial render
    expect(mockRenderSpy).toHaveBeenCalledTimes(2); // SearchInput's TextInput + Updater TextInput

    // Update state in Parent
    const updater = component.root.findAllByType(TextInput)[1]; // The second one is the updater

    mockRenderSpy.mockClear();

    act(() => {
        updater.props.onChangeText('update');
    });

    // With React.memo, SearchInput should NOT re-render because props are stable.
    // SearchInput NO re-render.
    // Updater TextInput re-renders.
    // So we expect 1 render.
    expect(mockRenderSpy).toHaveBeenCalledTimes(1);
  });
});
