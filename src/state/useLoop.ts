import { useCallback, useEffect, useState } from 'react';

import { useNotificationPermission } from '../permissions';
import type { PermissionResult } from '../permissions';
import {
  deriveDelivery,
  type Delivery,
} from '../scheduling/delivery';
import { quietPatch, resolveFeatureMute } from '../scheduling/mute';
import type { Feature } from '../types/feature';
import { useDailyLog } from './DailyLogProvider';
import { useOptionalScheduling } from './SchedulingProvider';
import { useSettings } from './SettingsProvider';

export type LoopValue = {
  eye: Delivery;
  water: Delivery;
  permission: PermissionResult | 'loading';
  quietFor: (feature: Feature, durationMs: number) => Promise<void>;
  quietForAll: (durationMs: number) => Promise<void>;
};

export function useLoop(): LoopValue {
  const { settings, updateSettings } = useSettings();
  const { hydrated } = useDailyLog();
  const permission = useNotificationPermission();
  const nextFire = useOptionalScheduling()?.nextFire ?? {
    eye: null,
    water: null,
  };
  const [tick, setTick] = useState(0);

  const now = new Date();
  const livePermission: PermissionResult =
    permission === 'loading' ? 'unknown' : permission;

  const eye = deriveDelivery({
    feature: 'eye',
    enabled: settings.eyeEnabled,
    mute: resolveFeatureMute(settings, 'eye', now),
    permission: livePermission,
    nextFire: nextFire.eye,
  });
  const water = deriveDelivery({
    feature: 'water',
    enabled: settings.waterEnabled,
    mute: resolveFeatureMute(settings, 'water', now),
    permission: livePermission,
    nextFire: nextFire.water,
    hydrated,
  });

  useEffect(() => {
    const nowMs = Date.now();
    const candidates = [settings.eyeQuietUntil, settings.waterQuietUntil]
      .map((iso) => {
        if (!iso) return null;
        const t = Date.parse(iso);
        return Number.isNaN(t) || t <= nowMs ? null : t;
      })
      .filter((t): t is number => t != null);
    if (candidates.length === 0) return;
    const delay = Math.min(...candidates) - nowMs;
    const id = setTimeout(() => setTick((n) => n + 1), delay);
    return () => clearTimeout(id);
  }, [settings.eyeQuietUntil, settings.waterQuietUntil, tick]);

  const quietFor = useCallback(
    async (feature: Feature, durationMs: number) => {
      await updateSettings(
        quietPatch(settings, feature, durationMs, new Date()),
      );
    },
    [updateSettings, settings],
  );

  const quietForAll = useCallback(
    async (durationMs: number) => {
      const now = new Date();
      await updateSettings({
        ...quietPatch(settings, 'eye', durationMs, now),
        ...quietPatch(settings, 'water', durationMs, now),
      });
    },
    [updateSettings, settings],
  );

  return { eye, water, permission, quietFor, quietForAll };
}
