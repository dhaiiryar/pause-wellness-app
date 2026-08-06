import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import type { Repository } from '../data/Repository';
import { shouldCancelRemainingWater } from '../state/dailyLogReducer';
import { todayKey } from '../types/log';
import { computeWaterReminderTimes } from './waterReminders';

export type WaterSchedulerDeps = {
  repo: Repository;
  notifications: typeof Notifications;
  now?: () => Date;
};

/**
 * Cancel all currently scheduled water notifications and re-queue them for
 * today + the next 2 days using inexact `Date` triggers.
 *
 * - Reads settings from the repository; if `waterEnabled` is false or
 *   `waterPaused` is true, cancels all water notifications and returns
 *   immediately.
 * - For today, if the daily log already shows glasses ≥ goal (hydrated),
 *   today's batch is skipped — remaining today's reminders won't re-fire.
 * - Each notification carries `data: { feature: 'water' }` so the
 *   response listener can route the tap to the WaterLog modal.
 * - The `channelId` is `'water'` (chime + vibration) when
 *   `settings.soundEnabled === true`; `'water_muted'` (vibration only)
 *   otherwise.
 *
 * On Android 12+ (API 31+) without `SCHEDULE_EXACT_ALARM`, `Date` triggers
 * are inexact (up to ~1 min drift) — exactly the timing the PRD calls for.
 */
export async function rescheduleWaterReminders(
  deps: WaterSchedulerDeps,
): Promise<void> {
  const { repo, notifications, now } = deps;
  const settings = await repo.getSettings();

  // ---- feature disabled or paused → cancel everything ------------------

  if (!settings.waterEnabled || settings.waterPaused) {
    await cancelAllWater(repo, notifications);
    return;
  }

  // ---- cancel + re-queue -----------------------------------------------

  await cancelAllWater(repo, notifications);

  const currentMs = (now?.() ?? new Date()).getTime();
  const goal = settings.waterGoalGlasses;
  const activeHours = {
    start: settings.activeHoursStart,
    end: settings.activeHoursEnd,
  };
  const channelId = settings.soundEnabled ? 'water' : 'water_muted';

  for (let offset = 0; offset <= 2; offset++) {
    const anchor = new Date(currentMs);
    anchor.setDate(anchor.getDate() + offset);

    // Goal already met today? Skip today's batch.
    if (offset === 0) {
      const log = await repo.getLog(todayKey());
      if (shouldCancelRemainingWater({ hydrated: log.waterGlasses >= goal, goal })) {
        continue;
      }
    }

    const times = computeWaterReminderTimes(
      activeHours,
      goal,
      anchor,
      offset === 0 ? new Date(currentMs) : new Date(0), // "now" only matters for today
    );

    for (const t of times) {
      try {
        const id = await notifications.scheduleNotificationAsync({
          content: {
            title: 'Pause · Water',
            body: 'Time for a glass of water',
            data: { feature: 'water' },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: t.getTime(),
            channelId,
          },
        });
        await repo.addScheduledId('water', t.toISOString(), id);
      } catch {
        // Individual notification scheduling failure (e.g. platform limit) —
        // continue with the remaining fire times.
      }
    }
  }
}

/**
 * Cancel every scheduled water notification (via the OS) and clear the
 * tracking rows from the repository. Idempotent — safe to call even when
 * there are none.
 */
async function cancelAllWater(
  repo: Repository,
  notifications: typeof Notifications,
): Promise<void> {
  const rows = await repo.getScheduledIds('water');

  for (const row of rows) {
    try {
      await notifications.cancelScheduledNotificationAsync(
        row.notificationId,
      );
    } catch {
      // Already cancelled or invalid — ignore and continue.
    }
  }

  await repo.clearScheduledIds('water');
}
