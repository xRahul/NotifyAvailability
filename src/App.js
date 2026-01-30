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

const persist = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.log(error);
  }
};

const App = () => {
  const [url, setUrl] = useState('');
  const [searchText, setSearchText] = useState('');
  const [taskSet, setTaskSet] = useState('no');
  const [loading, setLoading] = useState(false);
  const [webPlatformType, setWebPlatformType] = useState(WEB_PLATFORM_MOBILE);
  const [lastChecked, setLastChecked] = useState('0');
  const [caseSensitiveSearch, setCaseSensitiveSearch] = useState('yes');
  const [searchAbsence, setSearchAbsence] = useState('no');

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

        result.forEach(([key, value]) => {
          if (value !== null) {
            switch (key) {
              case 'url':
                setUrl(value);
                break;
              case 'searchText':
                setSearchText(value);
                break;
              case 'taskSet':
                setTaskSet(value);
                if (value === 'yes') {
                  BackgroundTimer.stopBackgroundTimer();
                  BackgroundTimer.runBackgroundTimer(
                    background_task,
                    1000 * 60 * 15,
                  );
                } else {
                  BackgroundTimer.stopBackgroundTimer();
                }
                break;
              case 'webPlatformType':
                setWebPlatformType(value);
                break;
              case 'lastChecked':
                setLastChecked(value);
                break;
              case 'caseSensitiveSearch':
                setCaseSensitiveSearch(value);
                break;
              case 'searchAbsence':
                setSearchAbsence(value);
                break;
            }
          }
        });
      } catch (error) {
        console.log(error);
      }
    };
    loadState();
  }, []);

  const createPrefetchJobs = async () => {
    try {
      setLoading(true);
      const trimmedUrl = url.trim();
      setUrl(trimmedUrl);

      BackgroundTimer.stopBackgroundTimer();
      BackgroundTimer.runBackgroundTimer(background_task, 1000 * 60 * 15);

      setTaskSet('yes');
      AsyncStorage.multiSet([['url', trimmedUrl], ['taskSet', 'yes']]).catch(
        error => console.log(error),
      );

      const checkUrlForTextData = {
        url: trimmedUrl,
        searchText,
        webPlatformType,
        caseSensitiveSearch,
        searchAbsence,
      };

      await checkUrlForText(checkUrlForTextData);

      const now = moment()
        .valueOf()
        .toString();
      setLastChecked(now);
      persist('lastChecked', now);
    } catch (error) {
      console.log(error);
      BackgroundTimer.stopBackgroundTimer();
      setTaskSet('no');
      persist('taskSet', 'no');
    } finally {
      setLoading(false);
    }
  };

  const deletePrefetchJobs = () => {
    try {
      BackgroundTimer.stopBackgroundTimer();
      setTaskSet('no');
      persist('taskSet', 'no');
    } catch (error) {
      console.log(error);
    }
  };

  const refreshWebView = () => {
    setLoading(true);
    // Temporarily clear URL to force reload
    const currentUrl = url;
    setUrl('');
    // Use timeout to allow render cycle to clear WebView
    setTimeout(() => {
      setUrl(currentUrl);
      setLoading(false);
    }, 50);
  };

  const pickerValueChanged = itemValue => {
    setWebPlatformType(itemValue);
    persist('webPlatformType', itemValue);
    refreshWebView();
  };

  const webViewProps = {};
  if (webPlatformType === WEB_PLATFORM_DESKTOP) {
    webViewProps.userAgent = USER_AGENT_DESKTOP;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="always">
      <UrlInput
        url={url}
        setUrl={setUrl}
        persist={persist}
        onSubmitEditing={() =>
          searchTextInputRef.current && searchTextInputRef.current.focus()
        }
      />

      <SearchInput
        ref={searchTextInputRef}
        searchText={searchText}
        setSearchText={setSearchText}
        persist={persist}
      />

      <SettingsSwitch
        label="Case Sensitive Search:"
        value={caseSensitiveSearch === 'yes'}
        onValueChange={value => {
          const valStr = value ? 'yes' : 'no';
          setCaseSensitiveSearch(valStr);
          persist('caseSensitiveSearch', valStr);
        }}
      />

      <SettingsSwitch
        label="Search Absence of Text:"
        value={searchAbsence === 'yes'}
        onValueChange={value => {
          const valStr = value ? 'yes' : 'no';
          setSearchAbsence(valStr);
          persist('searchAbsence', valStr);
        }}
      />

      <PlatformPicker
        selectedValue={webPlatformType}
        onValueChange={pickerValueChanged}
      />

      <Text style={styles.lastCheckedText}>
        Last Checked:
        {lastChecked === '0'
          ? 'Never'
          : moment(parseFloat(lastChecked)).fromNow()}
      </Text>

      {taskSet === 'no' && (
        <Button
          style={styles.checkingButton}
          title="Start Checking"
          onPress={createPrefetchJobs}
        />
      )}
      {taskSet === 'yes' && (
        <Button
          style={styles.checkingButton}
          title="Stop Checking"
          onPress={deletePrefetchJobs}
        />
      )}

      {loading && <ActivityIndicator size="large" color="#7a42f4" />}

      {taskSet === 'yes' && url !== '' && (
        <WebView
          style={styles.webview}
          source={{uri: url}}
          dataDetectorTypes="all"
          scalesPageToFit={false}
          {...webViewProps}
        />
      )}
    </ScrollView>
  );
};

export default App;
