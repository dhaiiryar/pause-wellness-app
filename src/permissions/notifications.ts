import { Linking } from "react-native";
import * as Notifications from "expo-notifications";

import {
  EYE_CATEGORY_IDENTIFIER,
  LOG_GLASS_ACTION_IDENTIFIER,
  SNOOZE_EYE_ACTION_IDENTIFIER,
  WATER_CATEGORY_IDENTIFIER,
} from "../notifications/categoryIds";

export type PermissionResult = "granted" | "denied" | "unknown";

export {
  WATER_CATEGORY_IDENTIFIER,
  LOG_GLASS_ACTION_IDENTIFIER,
  EYE_CATEGORY_IDENTIFIER,
  SNOOZE_EYE_ACTION_IDENTIFIER,
};

/**
 * Short, low-intensity vibration pattern: wait 0ms, vibrate 80ms, pause 40ms,
 * vibrate 80ms. Designed to be gentle rather than jarring (per PRD § Notifications).
 */
const GENTLE_VIBRATION = [0, 80, 40, 80];

/**
 * Common channel options shared by every reminder channel.
 */
const BASE_CHANNEL_OPTS = {
  importance: Notifications.AndroidImportance.HIGH,
  enableVibrate: true,
  vibrationPattern: GENTLE_VIBRATION,
  showBadge: false,
};

/**
 * Create (or re-create) the four notification channels:
 *
 * - `eye`       — 20-20-20 reminders with chime (wired in slice 06)
 * - `eye_muted` — 20-20-20 reminders, vibration only
 * - `water`     — hydration reminders with chime
 * - `water_muted` — hydration reminders, vibration only
 *
 * Two channels per feature let us mute/unmute by swapping channelId when
 * scheduling (Android channel `sound` is immutable after creation, and
 * `content.sound` does not override it on Android 8.0+).
 *
 * Each `setNotificationChannelAsync` call is wrapped in try/catch so the
 * function is safe on iOS, in headless contexts, and when channels already
 * exist.
 */
export async function ensureNotificationChannels(): Promise<void> {
  const channels: [string, string, string | null][] = [
    ["eye", "Eye reminders", "eye_chime.mp3"],
    ["eye_muted", "Eye reminders (muted)", null],
    ["water", "Water reminders", "water_chime.mp3"],
    ["water_muted", "Water reminders (muted)", null],
  ];

  for (const [id, name, sound] of channels) {
    try {
      await Notifications.setNotificationChannelAsync(id, {
        ...BASE_CHANNEL_OPTS,
        name,
        sound,
      });
    } catch {
      // iOS, headless, or rate-limited — safe to ignore
    }
  }

  await ensureNotificationCategories();
}

/**
 * Register interactive notification categories (action buttons).
 *
 * Water: "Log glass". Eye: "Snooze". Both open the app so the JS listener
 * can persist without expo-task-manager. Eye has no complete-from-shade
 * action (PRD 20s rule).
 *
 * Safe to call repeatedly; failures are swallowed (iOS/headless/unavailable).
 */
export async function ensureNotificationCategories(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(
      WATER_CATEGORY_IDENTIFIER,
      [
        {
          identifier: LOG_GLASS_ACTION_IDENTIFIER,
          buttonTitle: "Log glass",
          options: {
            // Default true; explicit so killed-state listeners still fire.
            opensAppToForeground: true,
          },
        },
      ],
    );
    await Notifications.setNotificationCategoryAsync(
      EYE_CATEGORY_IDENTIFIER,
      [
        {
          identifier: SNOOZE_EYE_ACTION_IDENTIFIER,
          buttonTitle: "Snooze",
          options: {
            opensAppToForeground: true,
          },
        },
      ],
    );
  } catch {
    // Platform/headless — safe to ignore
  }
}

/**
 * Create all notification channels (required on Android 13+ before the
 * `POST_NOTIFICATIONS` prompt will appear) then request permission.
 *
 * Both steps are wrapped in try/catch so the caller can always complete its
 * flow — a deny or an unavailable channel is never a crash.
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  await ensureNotificationChannels();

  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted ? "granted" : "denied";
  } catch {
    return "unknown";
  }
}

/**
 * Read the current notification permission without prompting.
 * Always reads live from the OS — never cached in app storage.
 */
export async function getNotificationPermission(): Promise<PermissionResult> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted ? "granted" : "denied";
  } catch {
    return "unknown";
  }
}

/**
 * Open the app's system settings page so the user can re-enable notifications.
 * Safe no-op if Linking is unavailable.
 */
export async function openAppNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Unavailable in some environments — safe to ignore
  }
}
