import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { ReactNode } from 'react';

import { useRepository } from '../data';
import { todayKey } from '../types/log';
import type { DailyState } from './dailyLogReducer';
import { dailyReducer, initialStateFromLog, rollover } from './dailyLogReducer';
import { useOptionalScheduling } from './SchedulingProvider';
import { useOptionalSettings } from './SettingsProvider';

/**
 * Value exposed by {@link useDailyLog}.
 *
 * `loading` is `true` until the initial repository load completes.
 * Callers should render nothing (or a backdrop) while loading to avoid a
 * flash of the zero state.
 */
export type DailyLogValue = DailyState & {
  loading: boolean;
  logGlass: () => Promise<void>;
  undoGlass: () => Promise<void>;
  completeBreak: () => Promise<void>;
  /** Reload today from the repository (e.g. after an external write). */
  refresh: () => Promise<void>;
};

const DailyLogContext = createContext<DailyLogValue | undefined>(undefined);

/**
 * Loads today's log + goal from the repository and wires the pure
 * {@link dailyReducer} to persistence side-effects.
 *
 * Listens for `AppState` changes; when the app returns to foreground on a
 * different calendar date, the provider silently reloads today's data
 * (the rollover path — yesterday's row is already archived by its date key).
 */
export function DailyLogProvider({ children }: { children: ReactNode }) {
  const repo = useRepository();
  const [state, setState] = useState<DailyState | null>(null);
  const [loading, setLoading] = useState(true);
  const initChecked = useRef(false);

  const rescheduleWater = useOptionalScheduling()?.rescheduleWater;
  const liveGoal = useOptionalSettings()?.settings.waterGoalGlasses;

  // ---- helpers -------------------------------------------------

  const refreshRecent = useCallback(async () => {
    const recent = await repo.getRecentLogs(7);
    setState((s) => (s ? dailyReducer(s, { type: 'UpdateRecent', recent }) : s));
  }, [repo]);

  const loadToday = useCallback(async () => {
    const [settings, log, recent] = await Promise.all([
      repo.getSettings(),
      repo.getLog(todayKey()),
      repo.getRecentLogs(7),
    ]);
    setState(initialStateFromLog(log, settings.waterGoalGlasses, recent));
    setLoading(false);
  }, [repo]);

  const performRollover = useCallback(
    async (nextDate: string, currentState: DailyState) => {
      // Pure state transition: archive old day, reset today, trim recent.
      const next = rollover(currentState, nextDate);
      setState(next);

      // Persist the new zero-day row so today's actions start from a real log.
      await repo.upsertLog({
        date: next.date,
        eyeBreaks: 0,
        waterGlasses: 0,
      });

      // Sync recent in case the repository has newer rows (multi-day gap).
      await refreshRecent();

      // Hydration was cleared → reschedule today's water reminders.
      if (rescheduleWater) {
        try {
          await rescheduleWater();
        } catch {
          // Best-effort; don't break the rollover.
        }
      }
    },
    [repo, refreshRecent, rescheduleWater],
  );

  // ---- initialise / reload today -------------------------------

  useEffect(() => {
    if (initChecked.current) return;
    initChecked.current = true;

    (async () => {
      await loadToday();

      // Cold-start across a day boundary: the loaded row may be stale.
      const actualToday = todayKey();
      setState((s) => {
        if (!s || s.date === actualToday) return s;

        // Apply the pure rollover now so the UI resets immediately; the
        // side-effects (persist zero row, refresh recent, reschedule water)
        // run concurrently below.
        const next = rollover(s, actualToday);
        performRollover(actualToday, s);
        return next;
      });
    })();
  }, [loadToday, performRollover]);

  if (state && liveGoal !== undefined && liveGoal !== state.goal) {
    setState(dailyReducer(state, { type: 'UpdateSettings', goal: liveGoal }));
  }

  // ---- date-change + external write sync on foreground -----------
  //
  // Rollover when the calendar day advanced while backgrounded.
  // Same-day reload picks up writes that bypassed React (e.g. notification
  // LOG_GLASS action via logGlassViaRepo).

  useEffect(() => {
    const handleChange = (nextStatus: AppStateStatus) => {
      if (nextStatus !== 'active' || !state) return;

      const actualToday = todayKey();
      if (state.date !== actualToday) {
        performRollover(actualToday, state);
      } else {
        void loadToday();
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [state, performRollover, loadToday]);

  // ---- actions (pure reducer → persist → side-effect) ------------

  const logGlass = useCallback(async () => {
    if (!state) return;
    const wasHydrated = state.hydrated;
    const next = dailyReducer(state, { type: 'LogGlass' });
    setState(next);
    await repo.upsertLog({
      date: next.date,
      eyeBreaks: next.eyeBreaks,
      waterGlasses: next.waterGlasses,
    });

    // Goal-hit: hydrated just transitioned false → true → cancel
    // today's remaining water reminders.
    if (!wasHydrated && next.hydrated && rescheduleWater) {
      try {
        await rescheduleWater();
      } catch {
        // Notification cancellation is best-effort; never break the log.
      }
    }
  }, [repo, state, rescheduleWater]);

  const undoGlass = useCallback(async () => {
    if (!state) return;
    const wasHydrated = state.hydrated;
    const next = dailyReducer(state, { type: 'UndoGlass' });
    setState(next);
    await repo.upsertLog({
      date: next.date,
      eyeBreaks: next.eyeBreaks,
      waterGlasses: next.waterGlasses,
    });
    if (wasHydrated && !next.hydrated && rescheduleWater) {
      try {
        await rescheduleWater();
      } catch {
        // Notification reschedule is best-effort; never break the log.
      }
    }
  }, [repo, state, rescheduleWater]);

  const completeBreak = useCallback(async () => {
    if (!state) return;
    const next = dailyReducer(state, { type: 'CompleteBreak' });
    setState(next);
    await repo.upsertLog({
      date: next.date,
      eyeBreaks: next.eyeBreaks,
      waterGlasses: next.waterGlasses,
    });
  }, [repo, state]);

  // ---- context value --------------------------------------------

  const value: DailyLogValue = {
    date: state?.date ?? todayKey(),
    waterGlasses: state?.waterGlasses ?? 0,
    eyeBreaks: state?.eyeBreaks ?? 0,
    goal: state?.goal ?? 8,
    hydrated: state?.hydrated ?? false,
    recent: state?.recent ?? [],
    loading,
    logGlass,
    undoGlass,
    completeBreak,
    refresh: loadToday,
  };

  return (
    <DailyLogContext.Provider value={value}>{children}</DailyLogContext.Provider>
  );
}

/**
 * Returns the current daily-log state and actions.
 *
 * Throws if called outside a {@link DailyLogProvider} — same fail-fast
 * pattern as `useRepository` and `useTheme`.
 */
export function useDailyLog(): DailyLogValue {
  const ctx = useContext(DailyLogContext);
  if (!ctx) {
    throw new Error('useDailyLog must be used within a DailyLogProvider');
  }
  return ctx;
}
