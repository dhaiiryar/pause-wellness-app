import * as Notifications from 'expo-notifications';

import { rescheduleWaterReminders } from '../scheduling/waterScheduler';
import {
  dailyReducer,
  initialStateFromLog,
} from '../state/dailyLogReducer';
import { dateKey } from '../types/log';
import type { Repository } from './Repository';

export type LogGlassViaRepoResult = {
  waterGlasses: number;
  hydrated: boolean;
  newlyHydrated: boolean;
};

/**
 * Increment today's water glass count outside React (e.g. notification action).
 *
 * Mirrors {@link DailyLogProvider}'s logGlass path: load → reducer LogGlass →
 * upsertLog → reschedule water when hydration flips false → true.
 * No undo. Best-effort reschedule failures never throw.
 */
export async function logGlassViaRepo(
  repo: Repository,
  deps: {
    notifications?: typeof Notifications;
    now?: () => Date;
  } = {},
): Promise<LogGlassViaRepoResult> {
  const notifications = deps.notifications ?? Notifications;
  const settings = await repo.getSettings();
  const log = await repo.getLog(dateKey(deps.now?.() ?? new Date()));
  const state = initialStateFromLog(log, settings.waterGoalGlasses);
  const wasHydrated = state.hydrated;
  const next = dailyReducer(state, { type: 'LogGlass' });

  await repo.upsertLog({
    date: next.date,
    eyeBreaks: next.eyeBreaks,
    waterGlasses: next.waterGlasses,
  });

  const newlyHydrated = !wasHydrated && next.hydrated;
  if (newlyHydrated) {
    try {
      await rescheduleWaterReminders({
        repo,
        notifications,
        now: deps.now,
      });
    } catch {
      // Notification cancellation is best-effort; never break the log.
    }
  }

  return {
    waterGlasses: next.waterGlasses,
    hydrated: next.hydrated,
    newlyHydrated,
  };
}
