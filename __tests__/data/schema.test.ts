import { migrate } from '../../src/data/sqlite/schema';

/**
 * Minimal fake of expo-sqlite's `SQLiteDatabase` good enough to drive `migrate`.
 *
 * - `getFirstAsync('PRAGMA user_version')` returns the seeded version, then
 *   reflects any version we set via `execAsync('PRAGMA user_version = N')`.
 * - `execAsync(sql)` records the statement verbatim. CREATE TABLE / ALTER
 *   statements are also parsed into a tiny in-memory schema so that duplicates
 *   raise the same `duplicate column name` error a real SQLite would — which
 *   is the entire failure mode under test here.
 */
function fakeDb(initialVersion = 0) {
  let user_version = initialVersion;
  const statements: string[] = [];
  const columns: Record<string, Set<string>> = {};

  const exec = (sql: string) => {
    statements.push(sql);
    const createMatch = sql.match(
      /CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)\s*\(([\s\S]*)\)/i
    );
    if (createMatch) {
      const [, table, body] = createMatch;
      const cols = new Set<string>();
      for (const line of body.split(',')) {
        const m = line.trim().match(/^(\w+)/);
        if (m) cols.add(m[1]);
      }
      columns[table] = cols;
      return Promise.resolve();
    }
    const alterMatch = sql.match(
      /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i
    );
    if (alterMatch) {
      const [, table, col] = alterMatch;
      cols = columns[table] ||= new Set();
      if (cols.has(col)) {
        return Promise.reject(new Error(`duplicate column name: ${col}`));
      }
      cols.add(col);
      return Promise.resolve();
    }
    const versionMatch = sql.match(/PRAGMA user_version\s*=\s*(\d+)/i);
    if (versionMatch) {
      user_version = Number(versionMatch[1]);
      return Promise.resolve();
    }
    return Promise.resolve();
  };
  let cols: Set<string>;

  return {
    statements,
    columns,
    get version() {
      return user_version;
    },
    getFirstAsync: <T = unknown>(_sql: string) =>
      Promise.resolve({ user_version } as unknown as T),
    execAsync: (sql: string) => exec(sql),
  };
}

describe('migrate()', () => {
  it('creates the settings table with pause columns on a fresh DB', async () => {
    const db = fakeDb(0);
    await expect(migrate(db as never)).resolves.not.toThrow();
    expect(db.version).toBe(5);
    expect(db.columns.settings).toBeDefined();
    expect(db.columns.settings!.has('eyePaused')).toBe(true);
    expect(db.columns.settings!.has('waterPaused')).toBe(true);
  });

  it('upgrades an existing v3 DB by adding eyePaused then waterPaused via ALTER', async () => {
    const db = fakeDb(3);
    (db.columns as Record<string, Set<string>>).settings = new Set([
      'id',
      'activeHoursStart',
      'activeHoursEnd',
      'waterGoalGlasses',
      'soundEnabled',
      'themeMode',
      'eyeEnabled',
      'waterEnabled',
      'onboardingComplete',
    ]);
    await expect(migrate(db as never)).resolves.not.toThrow();
    expect(db.columns.settings!.has('eyePaused')).toBe(true);
    expect(db.columns.settings!.has('waterPaused')).toBe(true);
    expect(db.version).toBe(5);
  });

  it('upgrades an existing v4 DB by adding waterPaused via ALTER', async () => {
    const db = fakeDb(4);
    (db.columns as Record<string, Set<string>>).settings = new Set([
      'id',
      'activeHoursStart',
      'activeHoursEnd',
      'waterGoalGlasses',
      'soundEnabled',
      'themeMode',
      'eyeEnabled',
      'eyePaused',
      'waterEnabled',
      'onboardingComplete',
    ]);
    await expect(migrate(db as never)).resolves.not.toThrow();
    expect(db.columns.settings!.has('waterPaused')).toBe(true);
    expect(db.version).toBe(5);
  });
});
