import React from 'react';
import { create, act } from 'react-test-renderer';
import UrlInput from '../src/components/UrlInput';
import { Text, View } from 'react-native';

const mockTextInputRender = jest.fn();

// Mock React Native completely to avoid _interopRequireDefault error
jest.mock('react-native', () => {
  const React = require('react');
  const TextInput = React.forwardRef((props, ref) => {
    mockTextInputRender(props); // Spy on render
    return React.createElement('TextInput', {...props, ref});
  });

  const View = (props) => React.createElement('View', props);
  const Text = (props) => React.createElement('Text', props);

  return {
    TextInput,
    View,
    Text,
  };
});

describe('UrlInput Performance', () => {
  beforeEach(() => {
    mockTextInputRender.mockClear();
  });

  it('renders unnecessarily when parent updates unrelated state', () => {
    let setUnrelated;
    const Parent = () => {
      const [unrelated, setUnrelatedState] = React.useState(0);
      setUnrelated = setUnrelatedState;

      // Stable props
      const noop = React.useCallback(() => {}, []);

      return (
        <View>
          <UrlInput
            url="http://example.com"
            setUrl={noop}
            persist={noop}
            onSubmitEditing={noop}
          />
          <Text>{unrelated}</Text>
        </View>
      );
    };

    let root;
    act(() => {
      root = create(<Parent />);
    });

    const initialRenderCount = mockTextInputRender.mock.calls.length;
    console.log(`Initial Renders: ${initialRenderCount}`);

    // Expect 1 render initially
    expect(initialRenderCount).toBe(1);

    act(() => {
      setUnrelated(1);
    });

    const finalRenderCount = mockTextInputRender.mock.calls.length;
    console.log(`Final Renders: ${finalRenderCount}`);

    // With optimization, finalRenderCount should be 1.
    // Without optimization, it should be 2.
    // We want this test to FAIL if optimization is missing (to verify baseline).
    // So we assert the OPTIMIZED behavior.

    // NOTE: This assertion will fail now (Expected 1, Received 2).
    expect(finalRenderCount).toBe(initialRenderCount);
  });
});
