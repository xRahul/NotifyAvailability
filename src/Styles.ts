import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 10,
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    marginTop: 20,
  },
  pickerOverView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {},
  pickerPicker: {
    flex: 1,
  },
  switchOverView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {},
  switchSwitch: {
    flex: 1,
  },
  lastCheckedText: {
    marginBottom: 5,
    textAlign: 'center',
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default styles;
