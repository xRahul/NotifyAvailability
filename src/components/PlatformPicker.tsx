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
          dropdownIconColor="#94a3b8"
          style={styles.pickerItem}
        >
          <Picker.Item label="Mobile" value={WEB_PLATFORM_MOBILE} style={styles.pickerItem} />
          <Picker.Item label="Desktop" value={WEB_PLATFORM_DESKTOP} style={styles.pickerItem} />
          <Picker.Item label="Tablet" value={WEB_PLATFORM_TABLET} style={styles.pickerItem} />
        </Picker>
      </View>
    </View>
  );
};

export default React.memo(PlatformPicker);
