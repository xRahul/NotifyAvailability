import React, {useState, useEffect, useRef} from 'react';
import {
  Platform,
  Text,
  ScrollView,
  Button,
  ActivityIndicator,
  TextInput,
  Picker,
  PushNotificationIOS,
  View,
  Switch,
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
  WEB_PLATFORM_TABLET,
} from './Constants';
import styles from './Styles';

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

const checkUrlForText = async checkUrlForTextData => {
  const {
    url,
    searchText,
    webPlatformType,
    caseSensitiveSearch,
    searchAbsense,
  } = checkUrlForTextData;

  // eslint-disable-next-line no-undef
  const headers = new Headers();
  let textFound;
  let showNotification;
  let notificationText;

  if (!url || !searchText) {
    BackgroundTimer.stopBackgroundTimer();
    return;
  }

  if (webPlatformType === WEB_PLATFORM_DESKTOP) {
    headers.set('User-Agent', USER_AGENT_DESKTOP);
  }

  try {
    const response = await fetch(url, {headers});
    const htmlText = await response.text();

    if (caseSensitiveSearch === 'yes') {
      textFound = htmlText.includes(searchText);
    } else {
      textFound = htmlText.toLowerCase().includes(searchText.toLowerCase());
    }

    if (searchAbsense === 'yes') {
      showNotification = !textFound;
      notificationText = `${searchText} was not found on ${url}`;
    } else {
      showNotification = textFound;
      notificationText = `${searchText} was found on ${url}`;
    }

    if (showNotification) {
      PushNotification.localNotification({
        message: notificationText,
      });
    }

    await AsyncStorage.setItem(
      'lastChecked',
      moment()
        .valueOf()
        .toString(),
    );
  } catch (error) {
    console.log(error);
  }
};

const background_task = async () => {
  try {
    const values = await AsyncStorage.multiGet([
      'url',
      'searchText',
      'webPlatformType',
      'caseSensitiveSearch',
      'searchAbsense',
    ]);

    const data = {};
    values.forEach(([key, value]) => {
      data[key] = value;
    });

    // Handle missing keys if necessary, but multiGet returns null for missing
    // checkUrlForTextData needs specific keys.
    // The keys from AsyncStorage match the keys needed for checkUrlForTextData object except they are not an object yet.

    // Construct the object
    const checkUrlForTextData = {
      url: data.url,
      searchText: data.searchText,
      webPlatformType: data.webPlatformType,
      caseSensitiveSearch: data.caseSensitiveSearch,
      searchAbsense: data.searchAbsense,
    };

    await checkUrlForText(checkUrlForTextData);
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
  const [searchAbsense, setSearchAbsense] = useState('no');

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
          'searchAbsense',
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
              case 'searchAbsense':
                setSearchAbsense(value);
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
      const trimmedUrl = url.trim();
      setUrl(trimmedUrl);
      persist('url', trimmedUrl);

      BackgroundTimer.stopBackgroundTimer();
      BackgroundTimer.runBackgroundTimer(background_task, 1000 * 60 * 15);

      setTaskSet('yes');
      persist('taskSet', 'yes');

      const checkUrlForTextData = {
        url: trimmedUrl,
        searchText,
        webPlatformType,
        caseSensitiveSearch,
        searchAbsense,
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
    // We need to trigger refresh logic.
    // Since setting state is async, we can't rely on `webPlatformType` being updated immediately if we used it in refreshWebView (if it used state directly).
    // But `refreshWebView` uses `url`. `webPlatformType` affects `webViewProps` in render.
    // To force reload, we call refreshWebView.
    // However, we want the reload to happen with the NEW `webPlatformType`.
    // Since `refreshWebView` does `setUrl('')` then `setUrl(currentUrl)`, the re-render will pick up the new `webPlatformType`.
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
      <TextInput
        onChangeText={text => {
          setUrl(text);
          persist('url', text);
        }}
        value={url}
        autoCorrect={false}
        enablesReturnKeyAutomatically
        keyboardType="url"
        placeholder="Enter URL https://..."
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() =>
          searchTextInputRef.current && searchTextInputRef.current.focus()
        }
      />

      <TextInput
        onChangeText={text => {
          setSearchText(text);
          persist('searchText', text);
        }}
        value={searchText}
        autoCorrect={false}
        enablesReturnKeyAutomatically
        placeholder="Enter Search String"
        ref={searchTextInputRef}
      />

      <View style={styles.switchOverView}>
        <Text style={styles.switchText}>Case Sensitive Search: </Text>
        <View style={styles.switchSwitch}>
          <Switch
            onValueChange={value => {
              const valStr = value ? 'yes' : 'no';
              setCaseSensitiveSearch(valStr);
              persist('caseSensitiveSearch', valStr);
            }}
            value={caseSensitiveSearch === 'yes'}
          />
        </View>
      </View>

      <View style={styles.switchOverView}>
        <Text style={styles.switchText}>Search Absense of Text: </Text>
        <View style={styles.switchSwitch}>
          <Switch
            onValueChange={value => {
              const valStr = value ? 'yes' : 'no';
              setSearchAbsense(valStr);
              persist('searchAbsense', valStr);
            }}
            value={searchAbsense === 'yes'}
          />
        </View>
      </View>

      <View style={styles.pickerOverView}>
        <Text style={styles.pickerText}>Webpage Type: </Text>
        <View style={styles.pickerPicker}>
          <Picker
            selectedValue={webPlatformType}
            onValueChange={itemValue => pickerValueChanged(itemValue)}>
            <Picker.Item label="Mobile" value={WEB_PLATFORM_MOBILE} />
            <Picker.Item label="Desktop" value={WEB_PLATFORM_DESKTOP} />
            <Picker.Item label="Tablet" value={WEB_PLATFORM_TABLET} />
          </Picker>
        </View>
      </View>

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
