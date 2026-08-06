import { Linking } from "react-native";
import * as Notifications from "expo-notifications";

export type PermissionResult = "granted" | "denied" | "unknown";

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
