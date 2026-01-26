import React, {forwardRef} from 'react';
import {TextInput} from 'react-native';

const SearchInput = forwardRef(({searchText, setSearchText, persist}, ref) => {
  return (
    <TextInput
      onChangeText={text => {
        setSearchText(text);
      }}
      onEndEditing={e => {
        persist('searchText', e.nativeEvent.text);
      }}
      value={searchText}
      autoCorrect={false}
      enablesReturnKeyAutomatically
      placeholder="Enter Search String"
      ref={ref}
    />
  );
});

export default SearchInput;
