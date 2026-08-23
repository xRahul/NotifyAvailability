import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import UrlInput from '../src/components/UrlInput';
import SearchInput from '../src/components/SearchInput';
import SettingsSwitch from '../src/components/SettingsSwitch';
import PlatformPicker from '../src/components/PlatformPicker';
import { WEB_PLATFORM_DESKTOP, WEB_PLATFORM_MOBILE } from '../src/constants';

describe('persist fires on endEditing, not onChangeText', () => {
  it('UrlInput persists url only at end of editing', async () => {
    const setUrl = jest.fn();
    const persist = jest.fn();
    const onSubmitEditing = jest.fn();
    const screen = await render(
      <UrlInput
        url="https://example.com"
        setUrl={setUrl}
        persist={persist}
        onSubmitEditing={onSubmitEditing}
      />,
    );

    const input = screen.getByLabelText('URL input');
    await fireEvent.changeText(input, 'https://other.example.com/');
    expect(setUrl).toHaveBeenCalledWith('https://other.example.com/');
    expect(persist).not.toHaveBeenCalled();

    await fireEvent(input, 'endEditing', {
      nativeEvent: { text: 'https://other.example.com/' },
    });
    expect(persist).toHaveBeenCalledWith('url', 'https://other.example.com/');
  });

  it('SearchInput persists searchText only at end of editing', async () => {
    const setSearchText = jest.fn();
    const persist = jest.fn();
    const screen = await render(
      <SearchInput
        searchText="needle"
        setSearchText={setSearchText}
        persist={persist}
      />,
    );

    const input = screen.getByLabelText('Search text input');
    await fireEvent.changeText(input, 'haystack');
    expect(setSearchText).toHaveBeenCalledWith('haystack');
    expect(persist).not.toHaveBeenCalled();

    await fireEvent(input, 'endEditing', { nativeEvent: { text: 'haystack' } });
    expect(persist).toHaveBeenCalledWith('searchText', 'haystack');
  });
});

describe('switch toggle invokes callback', () => {
  it('SettingsSwitch forwards new value on toggle', async () => {
    const onValueChange = jest.fn();
    const screen = await render(
      <SettingsSwitch
        label="Case Sensitive"
        value={false}
        onValueChange={onValueChange}
      />,
    );

    await fireEvent(screen.getByLabelText('Case Sensitive'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('picker emits selected values', () => {
  it('PlatformPicker emits selected value and index', async () => {
    const onValueChange = jest.fn();
    const screen = await render(
      <PlatformPicker
        selectedValue={WEB_PLATFORM_MOBILE}
        onValueChange={onValueChange}
      />,
    );

    await fireEvent(screen.getByLabelText('Platform picker'), 'onChange', {
      nativeEvent: { newValue: WEB_PLATFORM_DESKTOP, newIndex: 1 },
    });
    expect(onValueChange).toHaveBeenCalledWith(WEB_PLATFORM_DESKTOP, 1);
  });
});
