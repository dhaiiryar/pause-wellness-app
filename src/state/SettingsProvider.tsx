import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { applySettingsPatch } from '../data/applySettingsPatch';
import { useRepository } from '../data';
import { DEFAULT_SETTINGS, type Settings } from '../types/settings';

export type SettingsValue = {
  settings: Settings;
  loading: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  reload: () => Promise<void>;
};

const SettingsContext = createContext<SettingsValue | undefined>(undefined);

/**
 * Loads settings from the repository on mount and exposes them reactively.
 *
 * `updateSettings(patch)` merges the supplied fields over the current
 * settings and persists via `repo.setSettings` so downstream providers
 * (SchedulingProvider) can observe and react to changes.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const repo = useRepository();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await repo.getSettings();
      setSettings(s);
      setLoading(false);
    })();
  }, [repo]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = await applySettingsPatch(repo, patch);
      setSettings(next);
    },
    [repo],
  );

  const reload = useCallback(async () => {
    const next = await repo.getSettings();
    setSettings(next);
  }, [repo]);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, updateSettings, reload }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Returns the current settings and an update function.
 *
 * Throws if called outside a {@link SettingsProvider}.
 */
export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error(
      'useSettings must be used within a SettingsProvider',
    );
  }
  return ctx;
}

export function useOptionalSettings(): SettingsValue | undefined {
  return useContext(SettingsContext);
}
