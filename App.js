
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
  TextInput
} from 'react-native'

import BackgroundTask from 'react-native-background-task'
import queueFactory from 'react-native-queue'
import PushNotification from 'react-native-push-notification'


PushNotification.configure({
  // (required) Called when a remote or local notification is opened or received
  onNotification: function(notification) {
    console.log( 'NOTIFICATION:', notification );

    // process the notification

    // required on iOS only (see fetchCompletionHandler docs: https://facebook.github.io/react-native/docs/pushnotificationios.html)
    notification.finish(PushNotificationIOS.FetchResult.NoData);
  },

  // Should the initial notification be popped automatically
  // default: true
  popInitialNotification: true,
  requestPermissions: true,
})

const checkUrlForText = async (url, searchText) => {
  if (url.substring(0, 4) != "http") {
    url = 'https://'+url
  }

  const response = await fetch(url)
  console.log({response: response})
  const htmlText = await response.text()
  console.log({htmlText: htmlText})

  if (htmlText.includes(searchText)) {
    PushNotification.localNotification({
      message: searchText + ' was found on ' + url
    })
  }
}

BackgroundTask.define(async () => {

  // Init queue
  queue = await queueFactory();

  // Register job worker
  queue.addWorker('background-check-url-for-search-text', async (id, payload) => {

    checkUrlForText(payload.url, payload.searchText)

    queue.createJob(
      'background-check-url-for-search-text',
      { url: payload.url, searchText: payload.searchText }, // Supply the image url we want prefetched in this job to the payload.
      { attempts: 5, timeout: 23000 }, // Retry job on failure up to 5 times. Timeout job in 15 sec (prefetch is probably hanging if it takes that long).
      false // Must pass false as the last param so the queue starts up in the background task instead of immediately.
    );
  });

  // Start the queue with a lifespan
  // IMPORTANT: OS background tasks are limited to 30 seconds or less.
  // NOTE: Queue lifespan logic will attempt to stop queue processing 500ms less than passed lifespan for a healthy shutdown buffer.
  // IMPORTANT: Queue processing started with a lifespan will ONLY process jobs that have a defined timeout set.
  // Additionally, lifespan processing will only process next job if job.timeout < (remainingLifespan - 500).
  await queue.start(25000); // Run queue for at most 25 seconds.

  // finish() must be called before OS hits timeout.
  BackgroundTask.finish();

});

export default class App extends Component<{}> {

  constructor(props) {
    super(props);

    this.state = {
      url: '',
      searchText: '',
      taskSet: 'no',
      queue: null,
      loading: false
    };

    queueFactory()
      .then(queue => {
        this.setState({queue});
      })

    this.initAsyncStorage()
  }

  initAsyncStorage() {
    AsyncStorage.getItem('url').then((value) => {if (value) this.persistState('url', value)}).catch((error) => console.log(error))
    AsyncStorage.getItem('searchText').then((value) => {if (value) this.persistState('searchText', value)}).catch((error) => console.log(error))
    AsyncStorage.getItem('taskSet').then((value) => {if (value) this.persistState('taskSet', value)}).catch((error) => console.log(error))
    // AsyncStorage.getItem('queue').then((value) => {if (value) this.persistState('queue', value)}).catch((error) => console.log(error))
    // AsyncStorage.getItem('loading').then((value) => {if (value) this.persistState('loading', value)}).catch((error) => console.log(error))
  }

  componentDidMount() {
    // Optional: Check if the device is blocking background tasks or not
    this.checkStatus()
    BackgroundTask.schedule(); // Schedule the task to run every ~15 min if app is closed.
  }

  async persistState(key, value) {
    var obj  = {}
    obj[key] = value
    this.setState(obj)
    if (typeof value != 'boolean') {
      await AsyncStorage.setItem(key, value)
    }
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

  createPrefetchJobs() {
    this.persistState('loading', true)
    this.persistState('url', this.state.url.trim())

    // Create the prefetch job for the first <Image> component.
    this.state.queue.createJob(
      'background-check-url-for-search-text',
      { url: this.state.url, searchText: this.state.searchText }, // Supply the image url we want prefetched in this job to the payload.
      { attempts: 5, timeout: 23000 }, // Retry job on failure up to 5 times. Timeout job in 15 sec (prefetch is probably hanging if it takes that long).
      false // Must pass false as the last param so the queue starts up in the background task instead of immediately.
    );

    this.persistState('taskSet', 'yes')
    this.persistState('loading', false)

    checkUrlForText(this.state.url, this.state.searchText)
  }

  deletePrefetchJobs() {
    BackgroundTask.cancel()
    this.persistState('taskSet', 'no')
  }

  render() {
    console.log(this.state)
    return (
      <ScrollView contentContainerStyle={styles.container}>
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
        {this.state.taskSet == 'no' && <Button
          title={"Start Checking"}
          onPress={ this.createPrefetchJobs.bind(this) }
          disabled={!this.state.queue}
        /> }
        {this.state.taskSet == 'yes' && <Button
          title={"Stop Checking"}
          onPress={ this.deletePrefetchJobs.bind(this) }
          disabled={!this.state.queue}
        /> }
        {!this.state.queue || this.state.loading  && <ActivityIndicator size="large" color="#7a42f4" /> }
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
  }
});