
import React, { Component } from 'react'
import {
  Platform,
  StyleSheet,
  Text,
  ScrollView,
  Button,
  Image,
  ActivityIndicator,
  AsyncStorage,
  TextInput,
  WebView,
  Picker,
  PushNotificationIOS
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

const checkUrlForText = async (url, searchText, webPlatformType) => {

  if (!url || !searchText) {
    BackgroundTask.cancel()
    return
  }

  if (url.substring(0, 4) != "http") {
    url = 'https://'+url
  }

  let headers = new Headers()
  if (webPlatformType == WEB_PLATFORM_DESKTOP) {
    headers.set("User-Agent", USER_AGENT_DESKTOP)
  }

  const response = await fetch(url, {
    headers: headers
  })
  console.log({response: response})
  const htmlText = await response.text()
  console.log({htmlText: htmlText})

  if (htmlText.toLowerCase().includes(searchText.toLowerCase())) {
    PushNotification.localNotification({
      message: searchText + ' was found on ' + url
    })
  }

  await AsyncStorage.setItem('lastChecked', moment().valueOf().toString())
}

BackgroundTask.define(async () => {

  const urlBackgroundTask = await AsyncStorage.getItem('url')
  const searchTextBackgroundTask = await AsyncStorage.getItem('searchText')
  const webPlatformTypeBackgroundTask = await AsyncStorage.getItem('webPlatformType')

  await checkUrlForText(urlBackgroundTask, searchTextBackgroundTask, webPlatformTypeBackgroundTask)

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
      lastChecked: '0'
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
        await AsyncStorage.getItem(stateKey)
                      .then((value) => {if (value) this.persistState(stateKey, value)})
                      .catch((error) => console.log(error))
      }
    }
  }

  componentDidMount() {
    // Optional: Check if the device is blocking background tasks or not
    this.checkStatus()

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

  async checkStatus() {
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

  async createPrefetchJobs() {
    this.persistState('loading', true)
    this.persistState('url', this.state.url.trim())
    this.persistState('taskSet', 'yes')

    BackgroundTask.cancel()
    BackgroundTask.schedule()

    await checkUrlForText(this.state.url, this.state.searchText, this.state.webPlatformType)
    this.persistState('lastChecked', moment().valueOf().toString())
    this.persistState('loading', false)
  }

  deletePrefetchJobs() {
    BackgroundTask.cancel()
    this.persistState('taskSet', 'no')
  }

  pickerValueChanged(newValue) {
    this.persistState('webPlatformType', newValue)
    this.refreshWebView()

  }

  async refreshWebView() {
    this.persistState('loading', true)
    const url = this.state.url
    await this.persistState('url', '')
    await this.persistState('url', url)
    this.persistState('loading', false)
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
        <Text>
          Last Checked: {this.state.lastChecked == '0' ? 'Never' : moment(parseFloat(this.state.lastChecked)).fromNow()}
        </Text>
        <TextInput
          onChangeText={(url) => this.persistState('url', url)}
          value={this.state.url}
          autoCorrect={false}
          enablesReturnKeyAutomatically={true}
          keyboardType={'url'}
          placeholder={'Enter URL'}
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
        <Picker
          selectedValue={this.state.webPlatformType}
          onValueChange={(itemValue, itemIndex) => this.pickerValueChanged(itemValue)}>
          <Picker.Item label="Mobile" value={WEB_PLATFORM_MOBILE} />
          <Picker.Item label="Desktop" value={WEB_PLATFORM_DESKTOP} />
          <Picker.Item label="Tablet" value={WEB_PLATFORM_TABLET} />
        </Picker>
        {this.state.taskSet == 'no' && <Button
          title={"Start Checking"}
          onPress={ this.createPrefetchJobs.bind(this) }
        /> }
        {this.state.taskSet == 'yes' && <Button
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

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  webview: {
    height: 1500,
    marginTop: 20
  }
});