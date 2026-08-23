import React from 'react';
import { TextInput } from 'react-native';

interface UrlInputProps {
  url: string;
  setUrl: (text: string) => void;
  persist: (key: string, value: string) => void;
  onSubmitEditing: () => void;
}

const UrlInput = ({ url, setUrl, persist, onSubmitEditing }: UrlInputProps) => {
  return (
    <TextInput
      onChangeText={text => {
        setUrl(text);
      }}
      onEndEditing={e => {
        persist('url', e.nativeEvent.text);
      }}
      value={url}
      autoCorrect={false}
      enablesReturnKeyAutomatically
      keyboardType="url"
      placeholder="Enter URL https://..."
      returnKeyType="next"
      blurOnSubmit={false}
      onSubmitEditing={onSubmitEditing}
      accessibilityLabel="URL input"
    />
  );
};

export default React.memo(UrlInput);
