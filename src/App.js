import React, {useState, useEffect, useRef} from 'react';
import {
  Platform,
  Text,
  ScrollView,
  Button,
  ActivityIndicator,
  PushNotificationIOS,
} from 'react-native';

import {WebView} from 'react-native-webview';
import AsyncStorage from '@react-native-community/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import PushNotification from 'react-native-push-notification';
import moment from 'moment';

import {
  USER_AGENT_DESKTOP,
  WEB_PLATFORM_DESKTOP,
  WEB_PLATFORM_MOBILE,
} from './Constants';
import styles from './Styles';
import {checkUrlForText, background_task} from './services/BackgroundService';
import UrlInput from './components/UrlInput';
import SearchInput from './components/SearchInput';
import SettingsSwitch from './components/SettingsSwitch';
import PlatformPicker from './components/PlatformPicker';

PushNotification.configure({
  // (required) Called when a remote or local notification is opened or received
  onNotification(notification) {
    console.log('NOTIFICATION:', notification);

    // process the notification

    // required on iOS only (see fetchCompletionHandler docs: https://facebook.github.io/react-native/docs/pushnotificationios.html)
    if (Platform.OS === 'ios') {
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    }
  },

  // Should the initial notification be popped automatically
  // default: true
  popInitialNotification: true,
  requestPermissions: true,
});

const App = () => {
  const [config, setConfig] = useState({
    url: '',
    searchText: '',
    taskSet: 'no',
    webPlatformType: WEB_PLATFORM_MOBILE,
    lastChecked: '0',
    caseSensitiveSearch: 'yes',
    searchAbsence: 'no',
  });
  const [loading, setLoading] = useState(false);

  const searchTextInputRef = useRef(null);

  useEffect(() => {
    const loadState = async () => {
      try {
        const keys = [
          'url',
          'searchText',
          'taskSet',
          'webPlatformType',
          'lastChecked',
          'caseSensitiveSearch',
          'searchAbsence',
        ];
        const result = await AsyncStorage.multiGet(keys);

        const updates = {};
        result.forEach(([key, value]) => {
          if (value !== null) {
            updates[key] = value;
          }
        });

        if (updates.taskSet) {
          if (updates.taskSet === 'yes') {
            BackgroundTimer.stopBackgroundTimer();
            BackgroundTimer.runBackgroundTimer(background_task, 1000 * 60 * 15);
          } else {
            BackgroundTimer.stopBackgroundTimer();
          }
        }

        setConfig(prev => ({...prev, ...updates}));
      } catch (error) {
        console.log(error);
      }
    };
    loadState();
  }, []);

  const persist = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log(error);
    }
  };

  const createPrefetchJobs = async () => {
    try {
      setLoading(true);
      const trimmedUrl = config.url.trim();

      setConfig(prev => ({
        ...prev,
        url: trimmedUrl,
        taskSet: 'yes',
      }));

      BackgroundTimer.stopBackgroundTimer();
      BackgroundTimer.runBackgroundTimer(background_task, 1000 * 60 * 15);

      AsyncStorage.multiSet([['url', trimmedUrl], ['taskSet', 'yes']]).catch(
        error => console.log(error),
      );

      const checkUrlForTextData = {
        url: trimmedUrl,
        searchText: config.searchText,
        webPlatformType: config.webPlatformType,
        caseSensitiveSearch: config.caseSensitiveSearch,
        searchAbsence: config.searchAbsence,
      };

      await checkUrlForText(checkUrlForTextData);

      const now = moment()
        .valueOf()
        .toString();

      setConfig(prev => ({...prev, lastChecked: now}));
      persist('lastChecked', now);
    } catch (error) {
      console.log(error);
      BackgroundTimer.stopBackgroundTimer();
      setConfig(prev => ({...prev, taskSet: 'no'}));
      persist('taskSet', 'no');
    } finally {
      setLoading(false);
    }
  };

  const deletePrefetchJobs = () => {
    try {
      BackgroundTimer.stopBackgroundTimer();
      setConfig(prev => ({...prev, taskSet: 'no'}));
      persist('taskSet', 'no');
    } catch (error) {
      console.log(error);
    }
  };

  const refreshWebView = () => {
    setLoading(true);
    // Temporarily clear URL to force reload
    const currentUrl = config.url;
    setConfig(prev => ({...prev, url: ''}));
    // Use timeout to allow render cycle to clear WebView
    setTimeout(() => {
      setConfig(prev => ({...prev, url: currentUrl}));
      setLoading(false);
    }, 50);
  };

  const pickerValueChanged = itemValue => {
    setConfig(prev => ({...prev, webPlatformType: itemValue}));
    persist('webPlatformType', itemValue);
    refreshWebView();
  };

  const webViewProps = {};
  if (config.webPlatformType === WEB_PLATFORM_DESKTOP) {
    webViewProps.userAgent = USER_AGENT_DESKTOP;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="always">
      <UrlInput
        url={config.url}
        setUrl={text => setConfig(prev => ({...prev, url: text}))}
        persist={persist}
        onSubmitEditing={() =>
          searchTextInputRef.current && searchTextInputRef.current.focus()
        }
      />

      <SearchInput
        ref={searchTextInputRef}
        searchText={config.searchText}
        setSearchText={text => setConfig(prev => ({...prev, searchText: text}))}
        persist={persist}
      />

      <SettingsSwitch
        label="Case Sensitive Search:"
        value={config.caseSensitiveSearch === 'yes'}
        onValueChange={value => {
          const valStr = value ? 'yes' : 'no';
          setConfig(prev => ({...prev, caseSensitiveSearch: valStr}));
          persist('caseSensitiveSearch', valStr);
        }}
      />

      <SettingsSwitch
        label="Search Absence of Text:"
        value={config.searchAbsence === 'yes'}
        onValueChange={value => {
          const valStr = value ? 'yes' : 'no';
          setConfig(prev => ({...prev, searchAbsence: valStr}));
          persist('searchAbsence', valStr);
        }}
      />

      <PlatformPicker
        selectedValue={config.webPlatformType}
        onValueChange={pickerValueChanged}
      />

      <Text style={styles.lastCheckedText}>
        Last Checked:
        {config.lastChecked === '0'
          ? 'Never'
          : moment(parseFloat(config.lastChecked)).fromNow()}
      </Text>

      {config.taskSet === 'no' && (
        <Button
          style={styles.checkingButton}
          title="Start Checking"
          onPress={createPrefetchJobs}
        />
      )}
      {config.taskSet === 'yes' && (
        <Button
          style={styles.checkingButton}
          title="Stop Checking"
          onPress={deletePrefetchJobs}
        />
      )}

      {loading && <ActivityIndicator size="large" color="#7a42f4" />}

      {config.taskSet === 'yes' && config.url !== '' && (
        <WebView
          style={styles.webview}
          source={{uri: config.url}}
          dataDetectorTypes="all"
          scalesPageToFit={false}
          {...webViewProps}
        />
      )}
    </ScrollView>
  );
};

export default App;
