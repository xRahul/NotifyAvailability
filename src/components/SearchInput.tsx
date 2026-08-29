import React, { forwardRef, memo } from 'react';
import { TextInput } from 'react-native';
import styles from '../Styles';

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
          style={styles.textInput}
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
          placeholderTextColor="#64748b"
          accessibilityLabel="Search text input"
          ref={ref}
        />
      );
    },
  ),
);

export default SearchInput;

