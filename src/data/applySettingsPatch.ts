import type { Settings } from '../types/settings';
import type { Repository } from './Repository';

let writeChain: Promise<void> = Promise.resolve();

export async function applySettingsPatch(
  repo: Repository,
  patch: Partial<Settings> | ((current: Settings) => Partial<Settings>),
): Promise<Settings> {
  const run = async (): Promise<Settings> => {
    const current = await repo.getSettings();
    const next = {
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    };
    await repo.setSettings(next);
    return next;
  };
  const queued = writeChain.then(run, run);
  writeChain = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}
