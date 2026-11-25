/* global __dirname */
const fs = require('node:fs');

// Natywny Firebase (powiadomienia push) jest wpinany do aplikacji tylko wtedy, gdy build ma plik
// GoogleService-Info.plist. Bez niego pakiety @react-native-firebase/* zostają poza projektem iOS —
// inaczej wymagałyby osobnej konfiguracji (linkowanie dynamiczne, [FIRApp configure]) i wywracałyby build.
// Aplikacja radzi sobie wtedy bez powiadomień (patrz src/push/messaging.ts).
const hasFirebase = fs.existsSync(`${__dirname}/GoogleService-Info.plist`);
const off = { platforms: { ios: null, android: null } };

module.exports = {
  dependencies: hasFirebase
    ? {}
    : {
        '@react-native-firebase/app': off,
        '@react-native-firebase/messaging': off,
      },
};
