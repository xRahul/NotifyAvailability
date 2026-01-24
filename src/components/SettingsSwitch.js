import React from 'react';
import {View, Text, Switch} from 'react-native';
import styles from '../Styles';

const SettingsSwitch = ({label, value, onValueChange}) => {
  return (
    <View style={styles.switchOverView}>
      <Text style={styles.switchText}>{label}</Text>
      <View style={styles.switchSwitch}>
        <Switch onValueChange={onValueChange} value={value} />
      </View>
    </View>
  );
};

export default SettingsSwitch;
