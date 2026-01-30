import React from 'react';
import renderer from 'react-test-renderer';
import PlatformPicker from '../src/components/PlatformPicker';

const mockPickerRender = jest.fn();

jest.mock('react-native', () => {
  const React = require('react');
  const View = props => React.createElement('View', props, props.children);
  const Text = props => React.createElement('Text', props, props.children);
  const Picker = props => {
      mockPickerRender();
      return React.createElement('Picker', props, props.children);
  };
  Picker.Item = props => React.createElement('Picker.Item', props);

  return {
    View,
    Text,
    Picker,
    StyleSheet: {
        create: obj => obj,
        flatten: obj => obj,
    },
    Platform: {
      OS: 'ios',
      select: obj => obj.ios,
    }
  };
});

describe('PlatformPicker Performance', () => {
  test('renders repeatedly', () => {
    mockPickerRender.mockClear();
    const handler = () => {};
    const selectedValue = 'mobile';

    // Initial render
    const component = renderer.create(
      <PlatformPicker selectedValue={selectedValue} onValueChange={handler} />
    );

    expect(mockPickerRender).toHaveBeenCalledTimes(1);

    const start = Date.now();

    // Update 5000 times
    for (let i = 0; i < 5000; i++) {
        component.update(
            <PlatformPicker selectedValue={selectedValue} onValueChange={handler} />
        );
    }

    const end = Date.now();
    console.log(`Benchmark Duration: ${end - start}ms`);
    console.log(`Picker Render Count: ${mockPickerRender.mock.calls.length}`);
  });
});
