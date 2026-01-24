import React from 'react';
import {View, Text, Picker} from 'react-native';
import styles from '../Styles';
import {
  WEB_PLATFORM_MOBILE,
  WEB_PLATFORM_DESKTOP,
  WEB_PLATFORM_TABLET,
} from '../Constants';

const PlatformPicker = ({selectedValue, onValueChange}) => {
  return (
    <View style={styles.pickerOverView}>
      <Text style={styles.pickerText}>Webpage Type:</Text>
      <View style={styles.pickerPicker}>
        <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
          <Picker.Item label="Mobile" value={WEB_PLATFORM_MOBILE} />
          <Picker.Item label="Desktop" value={WEB_PLATFORM_DESKTOP} />
          <Picker.Item label="Tablet" value={WEB_PLATFORM_TABLET} />
        </Picker>
      </View>
    </View>
  );
};

export default PlatformPicker;
