import AsyncStorage from '@react-native-community/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import PushNotification from 'react-native-push-notification';
import moment from 'moment';
import {USER_AGENT_DESKTOP, WEB_PLATFORM_DESKTOP} from '../Constants';

export const checkUrlForText = async checkUrlForTextData => {
  const {
    url,
    searchText,
    webPlatformType,
    caseSensitiveSearch,
    searchAbsence,
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

    if (searchAbsence === 'yes') {
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

export const background_task = async () => {
  try {
    const values = await AsyncStorage.multiGet([
      'url',
      'searchText',
      'webPlatformType',
      'caseSensitiveSearch',
      'searchAbsence',
    ]);

    const data = {};
    values.forEach(([key, value]) => {
      data[key] = value;
    });

    const checkUrlForTextData = {
      url: data.url,
      searchText: data.searchText,
      webPlatformType: data.webPlatformType,
      caseSensitiveSearch: data.caseSensitiveSearch,
      searchAbsence: data.searchAbsence,
    };

    await checkUrlForText(checkUrlForTextData);
  } catch (error) {
    console.log(error);
  }
};
