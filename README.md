# NotifyAvailability


[![GitHub license](https://img.shields.io/github/license/xRahul/NotifyAvailability.svg)](https://github.com/xRahul/NotifyAvailability/blob/master/License.txt)
[![Build Status](https://travis-ci.org/xRahul/NotifyAvailability.svg?branch=master)](https://travis-ci.org/xRahul/NotifyAvailability)
[![Releases](https://img.shields.io/github/release/xRahul/NotifyAvailability.svg)](https://github.com/xRahul/NotifyAvailability/releases/latest)

[![Greenkeeper badge](https://badges.greenkeeper.io/xRahul/NotifyAvailability.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e1399210d8914483a7d5ecde14665376)](https://www.codacy.com/app/xRahul/NotifyAvailability)
[![Codeclimate Maintainability](https://api.codeclimate.com/v1/badges/5ff836f879789d82ce9b/maintainability)](https://codeclimate.com/github/xRahul/NotifyAvailability/maintainability)
[![CodeFactor](https://www.codefactor.io/repository/github/xrahul/notifyavailability/badge)](https://www.codefactor.io/repository/github/xrahul/notifyavailability)
[![codebeat badge](https://codebeat.co/badges/16954f1e-823a-445e-889f-fa197830b21e)](https://codebeat.co/projects/github-com-xrahul-notifyavailability-master)

[![SonarCloud Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=NotifyAvailability%3Aapp&metric=alert_status)](https://sonarcloud.io/dashboard?id=NotifyAvailability%3Aapp)
[![SonarCloud Bugs](https://sonarcloud.io/api/project_badges/measure?project=NotifyAvailability%3Aapp&metric=bugs)](https://sonarcloud.io/dashboard?id=NotifyAvailability%3Aapp)
[![SonarCloud Maintainability](https://sonarcloud.io/api/project_badges/measure?project=NotifyAvailability%3Aapp&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=NotifyAvailability%3Aapp)
[![SonarCloud Security](https://sonarcloud.io/api/project_badges/measure?project=NotifyAvailability%3Aapp&metric=security_rating)](https://sonarcloud.io/dashboard?id=NotifyAvailability%3Aapp)
[![SonarCloud Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=NotifyAvailability%3Aapp&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=NotifyAvailability%3Aapp)


### Overview

* This app takes input from the user to set up background periodic check of a webpage for a text.
* It creates a background task to notify the user if a text is present on the web page or not.
* This task is executed repeatedly once every ~15 mins depending on the OS.
* It will also show the time check was last made.

#### Input Criteria

* This app asks the user for a `URL` and a `search text`.
* You can also set whether to get notification when search text `is present` on the webpage or when it `is absent`.
* You can set the webpage type to be `desktop` or `mobile` to get different html accordingly.
* You can set the search to be `case sensitive` or `case insensitive`.

### Tech Stack

* React Native
  * react-native-background-fetch
  * react-native-background-task
  * react-native-push-notification
* moment.js

### Testing

* Tested on Android only.
* iOS testing is pending (device unavailable)

### Steps to execute Locally

* You would need android tools and java
* Generate a Key by following: [https://facebook.github.io/react-native/docs/signed-apk-android.html](https://facebook.github.io/react-native/docs/signed-apk-android.html)
* run `yarn` to install dependencies
* run `react-native link` to link the dependencies
* run on connected android device using: `react-native run-android`
* build the signed apks using: `cd android && ./gradlew assembleRelease`

### Use Case

One use case is that we enter the URL of a movie booking website to get notified when it opens booking for a Cinema on the day we want.

![Movie Booking Use Case](screenshots/movie-use-case-notify-availability.jpg)
