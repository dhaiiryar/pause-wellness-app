/**
 * Notification category / action identifiers.
 *
 * Expo forbids `:` and `-` in category identifiers.
 * Keep in sync with registered categories in `ensureNotificationCategories`.
 */

/** Water reminders with a "Log glass" action button. */
export const WATER_CATEGORY_IDENTIFIER = 'water_actions';

/** Shade action: increment today's glass count via the repository. */
export const LOG_GLASS_ACTION_IDENTIFIER = 'LOG_GLASS';

/**
 * Expo default body-tap action id (mirrors
 * `Notifications.DEFAULT_ACTION_IDENTIFIER` without importing the OS module).
 */
export const DEFAULT_ACTION_IDENTIFIER =
  'expo.modules.notifications.actions.DEFAULT';
