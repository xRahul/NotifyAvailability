import React, { forwardRef, memo } from 'react';
import { TextInput } from 'react-native';

interface SearchInputProps {
  searchText: string;
  setSearchText: (text: string) => void;
  persist: (key: string, value: string) => void;
}

const SearchInput = memo(
  forwardRef<React.ComponentRef<typeof TextInput>, SearchInputProps>(
    function SearchInputInner({ searchText, setSearchText, persist }, ref) {
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
          accessibilityLabel="Search text input"
          ref={ref}
        />
      );
    },
  ),
);

export default SearchInput;
