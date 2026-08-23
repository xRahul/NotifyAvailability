import React from 'react';
import { Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { WebPlatformType } from '../types';
import {
  WEB_PLATFORM_DESKTOP,
  WEB_PLATFORM_MOBILE,
  WEB_PLATFORM_TABLET,
} from '../constants';
import styles from '../Styles';

interface PlatformPickerProps {
  selectedValue: WebPlatformType;
  onValueChange: (itemValue: WebPlatformType) => void;
}

const PlatformPicker = ({
  selectedValue,
  onValueChange,
}: PlatformPickerProps) => {
  return (
    <View style={styles.pickerOverView}>
      <Text style={styles.pickerText}>Webpage Type:</Text>
      <View style={styles.pickerPicker}>
        <Picker<WebPlatformType>
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          accessibilityLabel="Platform picker"
        >
          <Picker.Item label="Mobile" value={WEB_PLATFORM_MOBILE} />
          <Picker.Item label="Desktop" value={WEB_PLATFORM_DESKTOP} />
          <Picker.Item label="Tablet" value={WEB_PLATFORM_TABLET} />
        </Picker>
      </View>
    </View>
  );
};

export default React.memo(PlatformPicker);
