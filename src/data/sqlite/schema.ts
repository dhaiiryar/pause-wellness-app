import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 5;

/**
 * Static DDL for the `settings` singleton table.
 *
 * Safe for `execAsync` because it contains no user-supplied values.
 * Booleans are stored as INTEGER (0/1) and mapped in `SqliteRepository`.
 * The `CHECK (id = 1)` constraint enforces the singleton-row design.
 */
export const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  activeHoursStart TEXT NOT NULL,
  activeHoursEnd TEXT NOT NULL,
  waterGoalGlasses INTEGER NOT NULL,
  soundEnabled INTEGER NOT NULL,
  themeMode TEXT NOT NULL,
  eyeEnabled INTEGER NOT NULL,
  waterEnabled INTEGER NOT NULL,
  onboardingComplete INTEGER NOT NULL
);
`;

/**
 * Static DDL for the `daily_log` table (slice 03).
 *
 * One row per calendar date (`date` PK, "YYYY-MM-DD").
 * `eyeBreaks` is wired in slice 05; column exists now to avoid a migration later.
 */
export const CREATE_DAILY_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS daily_log (
  date TEXT PRIMARY KEY,
  eyeBreaks INTEGER NOT NULL DEFAULT 0,
  waterGlasses INTEGER NOT NULL DEFAULT 0
);
`;

/**
 * Static DDL for the `scheduled_notifications` table (slice 04).
 *
 * One row per scheduled notification. `feature` is 'eye' or 'water';
 * `triggerTime` is the ISO timestamp of the intended fire time;
 * `notificationId` is the value returned by `scheduleNotificationAsync`.
 *
 * An index on `feature` supports cancel/reschedule by feature.
 */
export const CREATE_SCHEDULED_NOTIFICATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature TEXT NOT NULL,
  triggerTime TEXT NOT NULL,
  notificationId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sched_feature ON scheduled_notifications(feature);
`;

/**
 * Run schema migrations against `db` using `PRAGMA user_version`.
 *
 * Each `< N` guard runs when the DB version is below that milestone so that
 * fresh databases get every step regardless of their starting `user_version`.
 *
 * v0 → v1: enable WAL, create the `settings` table.
 * v1 → v2: create the `daily_log` table.
 * v2 → v3: create the `scheduled_notifications` table.
 * v3 → v4: add `eyePaused` column to `settings`.
 * v4 → v5: add `waterPaused` column to `settings`.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const user_version = row?.user_version ?? 0;
  if (user_version >= DATABASE_VERSION) return;

  if (user_version < 1) {
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    await db.execAsync(CREATE_SETTINGS_TABLE);
  }
  if (user_version < 2) {
    await db.execAsync(CREATE_DAILY_LOG_TABLE);
  }
  if (user_version < 3) {
    await db.execAsync(CREATE_SCHEDULED_NOTIFICATIONS_TABLE);
  }
  if (user_version < 4) {
    await db.execAsync(
      `ALTER TABLE settings ADD COLUMN eyePaused INTEGER NOT NULL DEFAULT 0;`
    );
  }
  if (user_version < 5) {
    await db.execAsync(
      `ALTER TABLE settings ADD COLUMN waterPaused INTEGER NOT NULL DEFAULT 0;`
    );
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
