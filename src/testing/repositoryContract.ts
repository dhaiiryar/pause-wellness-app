import { DEFAULT_SETTINGS } from '../types/settings';
import type { Repository } from '../data/Repository';

/**
 * Shared contract test factory — runs the standard settings + daily-log
 * assertions against any {@link Repository} implementation.
 *
 * The same factory is used for the in-memory fake (this slice) and, later,
 * a sqlite-backed implementation. Assertions are on read-after-write VALUES
 * only (per project test philosophy).
 */
export function runRepositoryContract(
  name: string,
  makeRepo: () => Repository | Promise<Repository>
) {
  describe(`${name} Repository contract`, () => {
    // ---- settings (slice 02) --------------------------------------------

    it('returns DEFAULT_SETTINGS when empty', async () => {
      const repo = await makeRepo();
      const settings = await repo.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('persists a full settings round-trip', async () => {
      const repo = await makeRepo();
      const next = {
        ...DEFAULT_SETTINGS,
        waterGoalGlasses: 10,
        soundEnabled: false,
        themeMode: 'dark' as const,
        onboardingComplete: true,
      };
      await repo.setSettings(next);
      expect(await repo.getSettings()).toEqual(next);
    });

    it('persists eyeQuietUntil and waterQuietUntil', async () => {
      const repo = await makeRepo();
      const until = '2026-06-23T10:00:00.000Z';
      await repo.setSettings({
        ...DEFAULT_SETTINGS,
        eyeQuietUntil: until,
        waterQuietUntil: until,
      });
      const settings = await repo.getSettings();
      expect(settings.eyeQuietUntil).toBe(until);
      expect(settings.waterQuietUntil).toBe(until);
    });

    it('persists onboardingComplete across reads', async () => {
      const repo = await makeRepo();
      await repo.setSettings({
        ...DEFAULT_SETTINGS,
        onboardingComplete: true,
      });
      expect((await repo.getSettings()).onboardingComplete).toBe(true);

      // Toggle off to make sure it's not sticky
      await repo.setSettings({
        ...DEFAULT_SETTINGS,
        onboardingComplete: false,
      });
      expect((await repo.getSettings()).onboardingComplete).toBe(false);
    });

    // ---- daily log (slice 03) -------------------------------------------

    it('returns an empty log for a date that has not been stored', async () => {
      const repo = await makeRepo();
      const log = await repo.getLog('2026-06-23');
      expect(log).toEqual({
        date: '2026-06-23',
        eyeBreaks: 0,
        waterGlasses: 0,
      });
    });

    it('round-trips a daily log via upsert + get', async () => {
      const repo = await makeRepo();
      await repo.upsertLog({
        date: '2026-06-23',
        eyeBreaks: 2,
        waterGlasses: 5,
      });
      const log = await repo.getLog('2026-06-23');
      expect(log).toEqual({
        date: '2026-06-23',
        eyeBreaks: 2,
        waterGlasses: 5,
      });
    });

    it('upsert replaces an existing log for the same date', async () => {
      const repo = await makeRepo();
      await repo.upsertLog({
        date: '2026-06-23',
        eyeBreaks: 0,
        waterGlasses: 3,
      });
      await repo.upsertLog({
        date: '2026-06-23',
        eyeBreaks: 0,
        waterGlasses: 4,
      });
      const log = await repo.getLog('2026-06-23');
      expect(log.waterGlasses).toBe(4);
      expect(log.eyeBreaks).toBe(0);
    });

    it('getRecentLogs returns at most N most-recent logs', async () => {
      const repo = await makeRepo();
      await repo.upsertLog({ date: '2026-06-21', eyeBreaks: 0, waterGlasses: 1 });
      await repo.upsertLog({ date: '2026-06-22', eyeBreaks: 0, waterGlasses: 2 });
      await repo.upsertLog({ date: '2026-06-23', eyeBreaks: 0, waterGlasses: 3 });

      const recent = await repo.getRecentLogs(2);
      expect(recent).toHaveLength(2);
      // Most-recent first
      expect(recent[0].date).toBe('2026-06-23');
      expect(recent[1].date).toBe('2026-06-22');
    });

    // ---- scheduled notifications (slice 04) -----------------------------

    it('getScheduledIds returns empty before any adds', async () => {
      const repo = await makeRepo();
      const ids = await repo.getScheduledIds('water');
      expect(ids).toEqual([]);
    });

    it('round-trips an addScheduledId via getScheduledIds', async () => {
      const repo = await makeRepo();
      await repo.addScheduledId('water', '2026-06-23T08:00:00.000Z', 'nid-abc');
      const ids = await repo.getScheduledIds('water');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toEqual({
        feature: 'water',
        triggerTime: '2026-06-23T08:00:00.000Z',
        notificationId: 'nid-abc',
      });
    });

    it('isolates water and eye scheduled ids', async () => {
      const repo = await makeRepo();
      await repo.addScheduledId('water', '2026-06-23T08:00:00.000Z', 'w-1');
      await repo.addScheduledId('eye', '2026-06-23T08:20:00.000Z', 'e-1');

      const water = await repo.getScheduledIds('water');
      expect(water).toHaveLength(1);
      expect(water[0].feature).toBe('water');

      const eye = await repo.getScheduledIds('eye');
      expect(eye).toHaveLength(1);
      expect(eye[0].feature).toBe('eye');
    });

    it('clearScheduledIds removes water but leaves eye intact', async () => {
      const repo = await makeRepo();
      await repo.addScheduledId('water', '2026-06-23T08:00:00.000Z', 'w-1');
      await repo.addScheduledId('eye', '2026-06-23T08:20:00.000Z', 'e-1');

      await repo.clearScheduledIds('water');
      expect(await repo.getScheduledIds('water')).toEqual([]);
      expect(await repo.getScheduledIds('eye')).toHaveLength(1);
    });

    it('clearScheduledIds is idempotent', async () => {
      const repo = await makeRepo();
      await repo.clearScheduledIds('water');
      await repo.clearScheduledIds('water');
      expect(await repo.getScheduledIds('water')).toEqual([]);
    });
  });
}
