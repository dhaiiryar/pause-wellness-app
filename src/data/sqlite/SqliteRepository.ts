import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type ThemeMode,
} from '../../types/settings';
import { emptyLog, type DailyLog } from '../../types/log';
import type { Feature } from '../../types/feature';
import type { Repository, ScheduledNotificationRecord } from '../Repository';

/**
 * Shape of a `settings` row as stored in sqlite.
 *
 * Booleans are INTEGER (0/1); all columns are NOT NULL.
 */
type SettingsRow = {
  activeHoursStart: string;
  activeHoursEnd: string;
  waterGoalGlasses: number;
  soundEnabled: number;
  themeMode: string;
  eyeEnabled: number;
  eyePaused: number;
  waterEnabled: number;
  waterPaused: number;
  onboardingComplete: number;
};

/**
 * Shape of a `daily_log` row as stored in sqlite.
 */
type DailyLogRow = {
  date: string;
  eyeBreaks: number;
  waterGlasses: number;
};

/**
 * Shape of a `scheduled_notifications` row.
 */
type ScheduledNotificationRow = {
  feature: string;
  triggerTime: string;
  notificationId: string;
};

/**
 * Production `Repository` backed by expo-sqlite.
 *
 * Reads and writes a singleton `settings` row keyed `id = 1`.
 * `getSettings` merges the stored row over `DEFAULT_SETTINGS` so new fields
 * added in later slices always receive their defaults (never throws when a
 * column is missing from a future migration).
 */
export class SqliteRepository implements Repository {
  constructor(private db: SQLiteDatabase) {}

  // ---- settings ---------------------------------------------------------

  async getSettings(): Promise<Settings> {
    const row = await this.db.getFirstAsync<SettingsRow>(
      'SELECT * FROM settings WHERE id = 1'
    );
    if (!row) return { ...DEFAULT_SETTINGS };

    return {
      ...DEFAULT_SETTINGS,
      activeHoursStart: row.activeHoursStart,
      activeHoursEnd: row.activeHoursEnd,
      waterGoalGlasses: row.waterGoalGlasses,
      soundEnabled: !!row.soundEnabled,
      themeMode: row.themeMode as ThemeMode,
      eyeEnabled: !!row.eyeEnabled,
      eyePaused: !!row.eyePaused,
      waterEnabled: !!row.waterEnabled,
      waterPaused: !!row.waterPaused,
      onboardingComplete: !!row.onboardingComplete,
    };
  }

  async setSettings(settings: Settings): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO settings
        (id, activeHoursStart, activeHoursEnd, waterGoalGlasses, soundEnabled,
         themeMode, eyeEnabled, eyePaused, waterEnabled, waterPaused,
         onboardingComplete)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      settings.activeHoursStart,
      settings.activeHoursEnd,
      settings.waterGoalGlasses,
      settings.soundEnabled ? 1 : 0,
      settings.themeMode,
      settings.eyeEnabled ? 1 : 0,
      settings.eyePaused ? 1 : 0,
      settings.waterEnabled ? 1 : 0,
      settings.waterPaused ? 1 : 0,
      settings.onboardingComplete ? 1 : 0
    );
  }

  // ---- daily log --------------------------------------------------------

  async getLog(date: string): Promise<DailyLog> {
    const row = await this.db.getFirstAsync<DailyLogRow>(
      'SELECT * FROM daily_log WHERE date = ?',
      date
    );
    if (!row) return emptyLog(date);
    return {
      date: row.date,
      eyeBreaks: row.eyeBreaks,
      waterGlasses: row.waterGlasses,
    };
  }

  async getRecentLogs(days: number): Promise<DailyLog[]> {
    const rows = await this.db.getAllAsync<DailyLogRow>(
      'SELECT * FROM daily_log ORDER BY date DESC LIMIT ?',
      days
    );
    return rows.map((r) => ({
      date: r.date,
      eyeBreaks: r.eyeBreaks,
      waterGlasses: r.waterGlasses,
    }));
  }

  async upsertLog(log: DailyLog): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO daily_log (date, eyeBreaks, waterGlasses)
       VALUES (?, ?, ?)`,
      log.date,
      log.eyeBreaks,
      log.waterGlasses
    );
  }

  // ---- scheduled notifications ------------------------------------------

  async getScheduledIds(
    feature: Feature,
  ): Promise<ScheduledNotificationRecord[]> {
    const rows = await this.db.getAllAsync<ScheduledNotificationRow>(
      'SELECT feature, triggerTime, notificationId FROM scheduled_notifications WHERE feature = ?',
      feature,
    );
    return rows.map((r) => ({
      feature: r.feature as Feature,
      triggerTime: r.triggerTime,
      notificationId: r.notificationId,
    }));
  }

  async addScheduledId(
    feature: Feature,
    triggerTime: string,
    notificationId: string,
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO scheduled_notifications (feature, triggerTime, notificationId)
       VALUES (?, ?, ?)`,
      feature,
      triggerTime,
      notificationId,
    );
  }

  async clearScheduledIds(feature: Feature): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM scheduled_notifications WHERE feature = ?',
      feature,
    );
  }
}
