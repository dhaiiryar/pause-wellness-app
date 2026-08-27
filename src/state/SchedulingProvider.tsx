import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';

import { useRepository } from '../data';
import { ensureNotificationChannels } from '../permissions';
import {
  earliestTrigger,
  rescheduleEyeReminders,
  rescheduleWaterReminders,
} from '../scheduling';
import { useSettings } from './SettingsProvider';

export type SchedulingValue = {
  /** Force a full water reschedule (e.g. after goal hit). */
  rescheduleWater: () => Promise<void>;
  nextFire: { eye: Date | null; water: Date | null };
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
  const [nextFire, setNextFire] = useState<{
    eye: Date | null;
    water: Date | null;
  }>({ eye: null, water: null });

  const scheduleAll = useCallback(async () => {
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
  }, [repo]);

  const loadNextFire = useCallback(async () => {
    const clock = new Date();
    const [eyeRows, waterRows] = await Promise.all([
      repo.getScheduledIds('eye'),
      repo.getScheduledIds('water'),
    ]);
    return {
      eye: earliestTrigger(eyeRows, clock),
      water: earliestTrigger(waterRows, clock),
    };
  }, [repo]);

  const runReschedule = useCallback(async () => {
    try {
      await scheduleAll();
      setNextFire(await loadNextFire());
    } catch {
      // Swallow — a scheduling failure shouldn't crash the tree.
    }
  }, [scheduleAll, loadNextFire]);

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
        settings.eyeQuietUntil,
        settings.waterQuietUntil,
        settings.activeHoursStart,
        settings.activeHoursEnd,
        settings.waterGoalGlasses,
        settings.soundEnabled,
      ].join('|'),
    [settings],
  );

  useEffect(() => {
    let cancelled = false;
    void scheduleAll()
      .then(() => loadNextFire())
      .then((next) => {
        if (!cancelled) setNextFire(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [scheduleAll, loadNextFire, schedulingKey]);

  return (
    <SchedulingContext.Provider
      value={{ rescheduleWater: runReschedule, nextFire }}
    >
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

export function useOptionalScheduling(): SchedulingValue | undefined {
  return useContext(SchedulingContext);
}
