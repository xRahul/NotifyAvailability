import React from 'react';
import { Switch, Text, View } from 'react-native';
import styles from '../Styles';

interface SettingsSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingsSwitch = ({
  label,
  value,
  onValueChange,
}: SettingsSwitchProps) => {
  return (
    <View style={styles.switchOverView}>
      <Text style={styles.switchText}>{label}</Text>
      <View style={styles.switchSwitch}>
        <Switch
          onValueChange={onValueChange}
          value={value}
          trackColor={{ false: '#334155', true: '#2563eb' }}
          thumbColor={value ? '#ffffff' : '#94a3b8'}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
};

const arePropsEqual = (
  prevProps: SettingsSwitchProps,
  nextProps: SettingsSwitchProps,
) => {
  return (
    prevProps.label === nextProps.label && prevProps.value === nextProps.value
  );
};

export default React.memo(SettingsSwitch, arePropsEqual);
