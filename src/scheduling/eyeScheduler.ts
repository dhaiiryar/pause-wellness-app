import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import type { Repository } from '../data/Repository';
import { EYE_CATEGORY_IDENTIFIER } from '../notifications/categoryIds';
import { computeEyeBreakTimes } from './eyeReminders';
import { fireFloor, resolveFeatureMute, shouldCancelAll } from './mute';

export type EyeSchedulerDeps = {
  repo: Repository;
  notifications: typeof Notifications;
  now?: () => Date;
};

/**
 * Cancel all currently scheduled eye notifications and re-queue them for
 * today + the next 2 days using inexact `Date` triggers.
 *
 * - Reads settings from the repository; if `eyeEnabled` is false or mute is
 *   sticky-paused, cancels all eye notifications and returns immediately.
 *   Timed quiet is a floor on fire times, not a cancel-all.
 * - Each notification carries `data: { feature: 'eye' }` and
 *   `categoryIdentifier: eye_actions` so the response listener can route
 *   the tap to the EyeRest modal and show Snooze.
 * - The `channelId` is `'eye'` (chime + vibration) when
 *   `settings.soundEnabled === true`; `'eye_muted'` (vibration only)
 *   otherwise.
 *
 * On Android 12+ (API 31+) without `SCHEDULE_EXACT_ALARM`, `Date` triggers
 * are inexact (up to ~1 min drift) — exactly the timing the PRD calls for.
 */
export async function rescheduleEyeReminders(
  deps: EyeSchedulerDeps,
): Promise<void> {
  const { repo, notifications, now } = deps;
  const settings = await repo.getSettings();
  const clock = now?.() ?? new Date();
  const mute = resolveFeatureMute(settings, 'eye', clock);

  if (!settings.eyeEnabled || shouldCancelAll(mute)) {
    await cancelAllEye(repo, notifications);
    return;
  }

  await cancelAllEye(repo, notifications);

  const floor = fireFloor(mute, clock);
  const activeHours = {
    start: settings.activeHoursStart,
    end: settings.activeHoursEnd,
  };
  const channelId = settings.soundEnabled ? 'eye' : 'eye_muted';

  for (let offset = 0; offset <= 2; offset++) {
    const anchor = new Date(clock.getTime());
    anchor.setDate(anchor.getDate() + offset);

    const times = computeEyeBreakTimes(activeHours, anchor, floor);

    for (const t of times) {
      try {
        const id = await notifications.scheduleNotificationAsync({
          content: {
            title: 'Pause · Eye',
            body: 'Time to rest your eyes',
            data: { feature: 'eye' },
            categoryIdentifier: EYE_CATEGORY_IDENTIFIER,
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: t.getTime(),
            channelId,
          },
        });
        await repo.addScheduledId('eye', t.toISOString(), id);
      } catch {
        // Individual notification scheduling failure (e.g. platform limit) —
        // continue with the remaining fire times.
      }
    }
  }
}

/**
 * Cancel every scheduled eye notification (via the OS) and clear the
 * tracking rows from the repository. Idempotent — safe to call even when
 * there are none.
 */
async function cancelAllEye(
  repo: Repository,
  notifications: typeof Notifications,
): Promise<void> {
  const rows = await repo.getScheduledIds('eye');

  for (const row of rows) {
    try {
      await notifications.cancelScheduledNotificationAsync(
        row.notificationId,
      );
    } catch {
      // Already cancelled or invalid — ignore and continue.
    }
  }

  await repo.clearScheduledIds('eye');
}
