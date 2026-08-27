/// <reference types="jest" />

// Tell React that the test environment supports act() — RNTL wrappers
// (render, fireEvent, waitFor) handle this; the flag silences the warning
// for library-internal state updates like navigation.replace.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * App-specific Jest mocks, run after the test environment is installed.
 *
 * The jest-expo preset already mocks most native modules; these cover the few
 * app dependencies that need deterministic JS behavior in tests:
 *  - Inter fonts: resolve `useFonts` synchronously so App renders immediately.
 *  - expo-splash-screen: no-op the show/hide lifecycle.
 *  - react-native-safe-area-context: pass-through providers + zero insets.
 */
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true, null],
  Inter_300Light: 'Inter-Light',
  Inter_400Regular: 'Inter-Regular',
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

/**
 * expo-sqlite is NOT mocked by jest-expo, so we provide a no-op mock.
 * Tests that need a real sqlite backend must mock `createRepository` to
 * inject an InMemoryRepository instead (see __tests__/App.test.tsx).
 */
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({})),
}));

/**
 * expo-notifications is mocked by jest-expo, but we provide an explicit
 * default so tests get deterministic grant/deny behaviour. Individual
 * tests can override `requestPermissionsAsync` via jest.mock re-import
 * when they need a different resolved value.
 *
 * Extended for slice 04 with the scheduling APIs used by waterScheduler
 * and the notification-response listener used in App.tsx.
 */
jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: false, status: 'undetermined' }),
  ),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: false, status: 'undetermined' }),
  ),
  AndroidImportance: { HIGH: 4 },

  // Scheduling APIs (slice 04)
  scheduleNotificationAsync: jest.fn(() =>
    Promise.resolve('scheduled-id-1'),
  ),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { DATE: 'DATE' },

  // Notification listeners (slice 04)
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  const defaultFrame = { x: 0, y: 0, width: 375, height: 812 };
  // Real context objects so @react-navigation/elements' SafeAreaProviderCompat
  // can useContext them without hitting `undefined`.
  const SafeAreaInsetsContext = React.createContext(defaultInsets);
  const SafeAreaFrameContext = React.createContext(defaultFrame);
  return {
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { style: { flex: 1 } }, children),
    useSafeAreaInsets: () => defaultInsets,
    useSafeAreaFrame: () => defaultFrame,
    useSafeArea: () => ({ insets: defaultInsets, frame: defaultFrame }),
  };
});

// Silence AccessibilityInfo.announceForAccessibility calls from EyeRestScreen tests.
const { AccessibilityInfo } = require('react-native');
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
AccessibilityInfo.isScreenReaderEnabled = jest.fn(() => Promise.resolve(false));
