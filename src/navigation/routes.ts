import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { Feature } from '../types/feature';

/**
 * Central route names + param list.
 *
 * The bottom tabs (Home / Stats / Settings) live inside the Tabs navigator.
 * EyeRest and WaterLog are modal routes presented over the tabs from the root
 * stack. They accept an optional `feature` param so that, in later slices, a
 * notification response can deep-link straight into the matching modal.
 */
export const RouteNames = {
  Tabs: 'Tabs',
  Home: 'Home',
  Stats: 'Stats',
  Settings: 'Settings',
  Onboarding: 'Onboarding',
  EyeRest: 'EyeRest',
  WaterLog: 'WaterLog',
} as const;

export type { Feature } from '../types/feature';

export type ModalParams = {
  feature?: Feature;
};

export type TabsParamList = {
  Home: undefined;
  Stats: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  // Modal params are optional (the modals open from Home with no params, and
  // from a notification response with a `feature` param in later slices).
  EyeRest: ModalParams | undefined;
  WaterLog: ModalParams | undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabsScreenProps<T extends keyof TabsParamList> =
  NativeStackScreenProps<TabsParamList, T>;
