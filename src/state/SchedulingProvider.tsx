import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';

import { useRepository } from '../data';
import { ensureNotificationChannels } from '../permissions';
import { rescheduleEyeReminders, rescheduleWaterReminders } from '../scheduling';
import { useSettings } from './SettingsProvider';

export type SchedulingValue = {
  /** Force a full water reschedule (e.g. after goal hit). */
  rescheduleWater: () => Promise<void>;
};

const SchedulingContext = createContext<SchedulingValue | undefined>(undefined);

/**
 * Scheduling lifecycle provider.
 *
 * - Creates all notification channels on mount (idempotent).
 * - Reschedules water and eye reminders on mount (app open) and whenever
 *   settings change (active hours, sound, feature enabled/disabled, pause).
 * - Exposes a `rescheduleWater` imperative handle for callers that need a
 *   manual reschedule (e.g. goal-hit cancellation).
 *
 * Must be placed inside {@link SettingsProvider} (it reads settings
 * reactively) and above {@link DailyLogProvider} (so DailyLogProvider
 * can use `rescheduleWater`).
 */
export function SchedulingProvider({ children }: { children: ReactNode }) {
  const repo = useRepository();
  const { settings } = useSettings();

  const runReschedule = useCallback(async () => {
    try {
      await Promise.allSettled([
        rescheduleWaterReminders({
          repo,
          notifications: Notifications,
        }),
        rescheduleEyeReminders({
          repo,
          notifications: Notifications,
        }),
      ]);
    } catch {
      // Swallow — a scheduling failure shouldn't crash the tree.
    }
  }, [repo]);

  // ---- mount: create channels (idempotent) -----------------------------

  useEffect(() => {
    ensureNotificationChannels().catch(() => {});
  }, []);

  // ---- reschedule on scheduling-relevant settings change ----------------
  //
  // We derive a stable string key rather than using the whole `settings`
  // object so the post-load "same values, new reference" render does NOT
  // trigger a second (concurrent) reschedule on mount. Previously the
  // mount-effect and the settings-effect both fired on the initial commit,
  // causing overlapping cancel+schedule promises — orphaned native
  // notifications whose IDs weren't tracked in the repository and that
  // could fire at unexpected times.

  const schedulingKey = useMemo(
    () =>
      [
        settings.waterEnabled,
        settings.waterPaused,
        settings.eyeEnabled,
        settings.eyePaused,
        settings.activeHoursStart,
        settings.activeHoursEnd,
        settings.waterGoalGlasses,
        settings.soundEnabled,
      ].join('|'),
    [settings],
  );

  useEffect(() => {
    runReschedule();
  }, [runReschedule, schedulingKey]);

  return (
    <SchedulingContext.Provider value={{ rescheduleWater: runReschedule }}>
      {children}
    </SchedulingContext.Provider>
  );
}

/**
 * Returns the scheduling imperative handle.
 *
 * Throws if called outside a {@link SchedulingProvider}.
 */
export function useScheduling(): SchedulingValue {
  const ctx = useContext(SchedulingContext);
  if (!ctx) {
    throw new Error(
      'useScheduling must be used within a SchedulingProvider',
    );
  }
  return ctx;
}
