### NotifyAvailability

#### Overview
* This app asks the user for a `URL`, `pageType` (Desktop/Mobile) and a `search string`.
* Then it creates a background task to notify the user if that string is present on the web page (case-insensitive).
* This task is executed repeatedly once every ~15 mins depending on the OS.
* It will also show when the it was last checked.

#### Tech Stack
* React Native
  * react-native-background-fetch
  * react-native-background-task
  * react-native-push-notification
* moment.js

#### Testing
* Tested on Android only.
* iOS testing is pending (device unavailable)

#### Use Case
* One use case is that we enter the URL of a movie booking website to get notified when it opens booking for a Cinema on the day we want.



![Movie Booking Use Case](https://github.com/xRahul/NotifyAvailability/raw/e25af47daf950779cc446153e08603fe04cc72fd/screenshots/movie-use-case-notify-availability.jpg)
