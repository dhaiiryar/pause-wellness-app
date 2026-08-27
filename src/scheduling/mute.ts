import type { Feature } from '../types/feature';
import type { Settings } from '../types/settings';

export const QUIET_MS = 60 * 60 * 1000;

export type Mute =
  | { kind: 'live' }
  | { kind: 'paused' }
  | { kind: 'quiet'; until: Date };

export function resolveMute(
  paused: boolean,
  quietUntilIso: string,
  now: Date,
): Mute {
  if (paused) return { kind: 'paused' };
  const until = parseFutureUntil(quietUntilIso, now);
  return until ? { kind: 'quiet', until } : { kind: 'live' };
}

export function resolveFeatureMute(
  settings: Settings,
  feature: Feature,
  now: Date,
): Mute {
  switch (feature) {
    case 'eye':
      return resolveMute(settings.eyePaused, settings.eyeQuietUntil, now);
    case 'water':
      return resolveMute(settings.waterPaused, settings.waterQuietUntil, now);
    default: {
      const _exhaustive: never = feature;
      return _exhaustive;
    }
  }
}

export function shouldCancelAll(mute: Mute): boolean {
  return mute.kind === 'paused';
}

export function fireFloor(mute: Mute, now: Date): Date {
  if (mute.kind === 'quiet' && mute.until.getTime() > now.getTime()) {
    return mute.until;
  }
  return now;
}

export function quietPatch(
  settings: Settings,
  feature: Feature,
  durationMs: number,
  now: Date,
): Partial<Settings> {
  const proposed = new Date(now.getTime() + durationMs);
  const existingIso =
    feature === 'eye' ? settings.eyeQuietUntil : settings.waterQuietUntil;
  const existing = parseFutureUntil(existingIso, now);
  const until =
    existing && existing.getTime() > proposed.getTime() ? existing : proposed;
  const iso = until.toISOString();
  switch (feature) {
    case 'eye':
      return { eyePaused: false, eyeQuietUntil: iso };
    case 'water':
      return { waterPaused: false, waterQuietUntil: iso };
    default: {
      const _exhaustive: never = feature;
      return _exhaustive;
    }
  }
}

function parseFutureUntil(iso: string, now: Date): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() <= now.getTime()) return null;
  return d;
}
