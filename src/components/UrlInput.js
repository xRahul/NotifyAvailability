import React from 'react';
import {TextInput} from 'react-native';

const UrlInput = ({url, setUrl, persist, onSubmitEditing}) => {
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
    />
  );
};

export default UrlInput;
