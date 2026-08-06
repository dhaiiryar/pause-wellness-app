import type { ExpoConfig } from "expo/config";

/**
 * Pause app config. Android-first; iOS deferred (see PRD). The dev client is
 * required for the notification scheduling path (slices 04/06) — Expo Go is
 * not sufficient — so `expo-dev-client` is wired as a plugin here.
 *
 * `userInterfaceStyle: 'automatic'` lets the app follow the system light/dark
 * setting (the ThemeProvider defaults to `mode: 'system'`).
 *
 * The expo-notifications `sounds` array registers bundled audio for
 * notification channels on Android; these are referenced by base filename
 * in the per-channel `sound` option.
 */
const config: ExpoConfig = {
  name: "Pause",
  slug: "pause",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "pause",
  android: {
    package: "com.pause.app", // placeholder — confirm before launch
    adaptiveIcon: {
      backgroundColor: "#F4F1EA",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-dev-client",
    "expo-sqlite",
    [
      "expo-notifications",
      {
        sounds: ["./assets/sounds/water_chime.mp3", "./assets/sounds/eye_chime.mp3"],
      },
    ],
    ["expo-build-properties", { android: { minSdkVersion: 26 } }],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F4F1EA",
        image: "./assets/splash-icon.png",
        resizeMode: "contain" as const,
        imageWidth: 200,
        dark: { backgroundColor: "#1B2A22" },
      },
    ],
    // Required by `npx expo install @react-native-community/datetimepicker`
    // (dynamic app.config.ts cannot be auto-patched). Native rebuild needed.
    "@react-native-community/datetimepicker",
  ],
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "19c3ffe7-db31-4868-b064-8534260260c3",
    },
  },
};

export default config;
