
import React, { Component } from 'react'
import {
  Platform,
  Text,
  ScrollView,
  Button,
  ActivityIndicator,
  AsyncStorage,
  TextInput,
  WebView,
  Picker,
  PushNotificationIOS,
  View,
  Switch,
  Alert
} from 'react-native'

import BackgroundTask from 'react-native-background-task'
import PushNotification from 'react-native-push-notification'
import moment from 'moment'

import {
  USER_AGENT_DESKTOP,
  WEB_PLATFORM_DESKTOP,
  WEB_PLATFORM_MOBILE,
  WEB_PLATFORM_TABLET
} from './Constants'
import { styles } from './Styles'


PushNotification.configure({
  // (required) Called when a remote or local notification is opened or received
  onNotification: function(notification) {
    console.log( 'NOTIFICATION:', notification );

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
})

const checkStatus = async () => {
  const status = await BackgroundTask.statusAsync()

  if (status.available) {
    // Everything's fine
    console.log("BackgroundTask check Success")
    return
  }

  const reason = status.unavailableReason

  if (reason === BackgroundTask.UNAVAILABLE_DENIED) {
    Alert.alert('Denied', 'Please enable background "Background App Refresh" for this app')

  } else if (reason === BackgroundTask.UNAVAILABLE_RESTRICTED) {
    Alert.alert('Restricted', 'Background tasks are restricted on your device')
  }
}

const checkUrlForText = async (checkUrlForTextData) => {

  const url = checkUrlForTextData.url
  const searchText = checkUrlForTextData.searchText
  const webPlatformType = checkUrlForTextData.webPlatformType
  const caseSensitiveSearch = checkUrlForTextData.caseSensitiveSearch
  const searchAbsense = checkUrlForTextData.searchAbsense
  let headers = new Headers()
  let textFound
  let showNotification
  let notificationText

  if (!url || !searchText) {
    BackgroundTask.cancel()
    return
  }

  if (webPlatformType == WEB_PLATFORM_DESKTOP) {
    headers.set("User-Agent", USER_AGENT_DESKTOP)
  }

  try {
    const response = await fetch(url, {headers: headers})
    const htmlText = await response.text()

    if (caseSensitiveSearch === 'yes') {
      textFound = htmlText.includes(searchText);
    } else {
      textFound = htmlText.toLowerCase().includes(searchText.toLowerCase())
    }

    if (searchAbsense === 'yes') {
      showNotification = !textFound;
      notificationText = searchText + ' was not found on ' + url
    } else {
      showNotification = textFound;
      notificationText = searchText + ' was found on ' + url
    }

    if (showNotification) {
      PushNotification.localNotification({
        message: notificationText
      })
    }

    await AsyncStorage.setItem('lastChecked', moment().valueOf().toString())

  } catch (error) {
    console.log(error)
  }
}

BackgroundTask.define(async () => {

  try {
    const urlBackgroundTask = await AsyncStorage.getItem('url')
    const searchTextBackgroundTask = await AsyncStorage.getItem('searchText')
    const webPlatformTypeBackgroundTask = await AsyncStorage.getItem('webPlatformType')
    const caseSensitiveSearchBackgroundTask = await AsyncStorage.getItem('caseSensitiveSearch')
    const searchAbsenseBackgroundTask = await AsyncStorage.getItem('searchAbsense')

    const checkUrlForTextData = {
      url: urlBackgroundTask,
      searchText: searchTextBackgroundTask,
      webPlatformType: webPlatformTypeBackgroundTask,
      caseSensitiveSearch: caseSensitiveSearchBackgroundTask,
      searchAbsense: searchAbsenseBackgroundTask
    }

    await checkUrlForText(checkUrlForTextData)

  } catch(error) {
    console.log(error)
  }

  // finish() must be called before OS hits timeout.
  BackgroundTask.finish();

});

export default class App extends Component {


  constructor(props) {
    super(props);

    this.state = {
      url: '',
      searchText: '',
      taskSet: 'no',
      loading: false,
      webPlatformType: WEB_PLATFORM_MOBILE,
      lastChecked: '0',
      caseSensitiveSearch: 'yes',
      searchAbsense: 'no'
    };

    this.initAsyncStorage()
  }


  shouldUseAsyncStorage(stateKey) {
    if (typeof this.state[stateKey] != 'boolean' && stateKey != 'loading') {
      return true;
    }
    return false;
  }


  async initAsyncStorage() {
    for (var stateKey in this.state) {
      if (this.state.hasOwnProperty(stateKey) && this.shouldUseAsyncStorage(stateKey)) {
        try {
          const value = await AsyncStorage.getItem(stateKey)

          if (value) {
            this.persistState(stateKey, value)
          }

        } catch (error) {
          console.log(error)
        }
      }
    }
  }


  componentDidMount() {
    // Optional: Check if the device is blocking background tasks or not
    checkStatus()

    if (this.state.taskSet == 'yes') {
      // Schedule the task to run every ~15 min if app is closed.
      BackgroundTask.cancel()
      BackgroundTask.schedule()

    } else {
      BackgroundTask.cancel()
    }
  }


  persistState(key, value) {
    var obj  = {}
    obj[key] = value
    this.setState(obj)

    if (this.shouldUseAsyncStorage(key)) {
      AsyncStorage.setItem(key, value)
    }

    return Promise.resolve()
  }


  async createPrefetchJobs() {
    try {
      this.persistState('loading', true)
      this.persistState('url', this.state.url.trim())

      BackgroundTask.cancel()
      BackgroundTask.schedule()

      this.persistState('taskSet', 'yes')

      await checkUrlForText(this.state)

      this.persistState('lastChecked', moment().valueOf().toString())

    } catch (error) {
      console.log(error)
      BackgroundTask.cancel()
      this.persistState('taskSet', 'no')

    } finally {
      this.persistState('loading', false)
    }
  }


  deletePrefetchJobs() {
    try {
      BackgroundTask.cancel()
      this.persistState('taskSet', 'no')
    } catch (error) {
      console.log(error)
    }
  }


  pickerValueChanged(newValue) {
    this.persistState('webPlatformType', newValue)
    this.refreshWebView()
  }


  async refreshWebView() {
    try {
      this.persistState('loading', true)
      const url = this.state.url
      await this.persistState('url', '')
      await this.persistState('url', url)
      this.persistState('loading', false)
    } catch (error) {
      console.log(error)
    }
  }


  switchValueChanged(switchName, newValue) {
    if (newValue) {
      this.persistState(switchName, 'yes')
    } else {
      this.persistState(switchName, 'no')
    }
  }


  render() {
    console.log(this.state)

    const webViewProps = {}
    if (this.state.webPlatformType === WEB_PLATFORM_DESKTOP) {
      webViewProps.userAgent = USER_AGENT_DESKTOP;
    }

    return (
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps={'always'}
      >

        <TextInput
          onChangeText={(url) => this.persistState('url', url)}
          value={this.state.url}
          autoCorrect={false}
          enablesReturnKeyAutomatically={true}
          keyboardType={'url'}
          placeholder={'Enter URL https://...'}
          returnKeyType={'next'}
          blurOnSubmit={false}
          onSubmitEditing={() => this.searchTextInput.focus() }
        />

        <TextInput
          onChangeText={(searchText) => this.persistState('searchText', searchText)}
          value={this.state.searchText}
          autoCorrect={false}
          enablesReturnKeyAutomatically={true}
          placeholder={'Enter Search String'}
          ref={(input) => this.searchTextInput = input }
        />

        <View style={styles.switchOverView}>
          <Text style={styles.switchText}>{"Case Sensitive Search: "}</Text>
          <View style={styles.switchSwitch}>
            <Switch
              onValueChange={(value) => this.switchValueChanged('caseSensitiveSearch', value)}
              value={this.state.caseSensitiveSearch === 'yes' ? true : false}
            />
          </View>
        </View>

        <View style={styles.switchOverView}>
          <Text style={styles.switchText}>{"Search Absense of Text: "}</Text>
          <View style={styles.switchSwitch}>
            <Switch
              onValueChange={(value) => this.switchValueChanged('searchAbsense', value)}
              value={this.state.searchAbsense === 'yes' ? true : false}
            />
          </View>
        </View>

        <View style={styles.pickerOverView}>
          <Text style={styles.pickerText}>{"Webpage Type: "}</Text>
          <View style={styles.pickerPicker}>
            <Picker
              selectedValue={this.state.webPlatformType}
              onValueChange={(itemValue, itemIndex) => this.pickerValueChanged(itemValue)}>
              <Picker.Item label="Mobile" value={WEB_PLATFORM_MOBILE} />
              <Picker.Item label="Desktop" value={WEB_PLATFORM_DESKTOP} />
              <Picker.Item label="Tablet" value={WEB_PLATFORM_TABLET} />
            </Picker>
          </View>
        </View>

        <Text style={styles.lastCheckedText}>
          Last Checked: {this.state.lastChecked == '0' ? 'Never' : moment(parseFloat(this.state.lastChecked)).fromNow()}
        </Text>

        {this.state.taskSet == 'no' && <Button
          style={styles.checkingButton}
          title={"Start Checking"}
          onPress={ this.createPrefetchJobs.bind(this) }
        /> }
        {this.state.taskSet == 'yes' && <Button
          style={styles.checkingButton}
          title={"Stop Checking"}
          onPress={ this.deletePrefetchJobs.bind(this) }
        /> }

        {this.state.loading  && <ActivityIndicator size="large" color="#7a42f4" /> }

        {this.state.taskSet == 'yes' && this.state.url != '' &&
          <WebView
            style={styles.webview}
            source={{ uri: this.state.url }}
            dataDetectorTypes={'all'}
            scalesPageToFit={false}
            { ...webViewProps }
            />
        }

      </ScrollView>
    );
  }
}