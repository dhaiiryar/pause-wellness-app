/// <reference types="jest" />

import { DEFAULT_SETTINGS } from '../../src/types/settings';
import {
  fireFloor,
  quietPatch,
  resolveFeatureMute,
  resolveMute,
  shouldCancelAll,
} from '../../src/scheduling/mute';

function dt(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute);
}

describe('resolveMute', () => {
  const now = dt(2026, 6, 23, 8, 0);

  it('paused wins over a future quiet until', () => {
    const mute = resolveMute(true, dt(2026, 6, 23, 10, 0).toISOString(), now);
    expect(mute).toEqual({ kind: 'paused' });
  });

  it('treats a past ISO as live', () => {
    const mute = resolveMute(false, dt(2026, 6, 23, 7, 0).toISOString(), now);
    expect(mute).toEqual({ kind: 'live' });
  });

  it('treats empty and unreadable ISO as live', () => {
    expect(resolveMute(false, '', now)).toEqual({ kind: 'live' });
    expect(resolveMute(false, 'not-a-date', now)).toEqual({ kind: 'live' });
  });

  it('returns quiet when until is in the future', () => {
    const until = dt(2026, 6, 23, 9, 0);
    expect(resolveMute(false, until.toISOString(), now)).toEqual({
      kind: 'quiet',
      until,
    });
  });
});

describe('resolveFeatureMute', () => {
  const now = dt(2026, 6, 23, 8, 0);

  it('reads eye fields', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      eyePaused: true,
      waterPaused: false,
    };
    expect(resolveFeatureMute(settings, 'eye', now)).toEqual({
      kind: 'paused',
    });
    expect(resolveFeatureMute(settings, 'water', now)).toEqual({
      kind: 'live',
    });
  });
});

describe('shouldCancelAll', () => {
  it('is true only for sticky pause', () => {
    expect(shouldCancelAll({ kind: 'paused' })).toBe(true);
    expect(shouldCancelAll({ kind: 'live' })).toBe(false);
    expect(
      shouldCancelAll({ kind: 'quiet', until: dt(2026, 6, 23, 9, 0) }),
    ).toBe(false);
  });
});

describe('fireFloor', () => {
  const now = dt(2026, 6, 23, 8, 0);

  it('returns the until instant for quiet', () => {
    const until = dt(2026, 6, 23, 9, 0);
    expect(fireFloor({ kind: 'quiet', until }, now)).toBe(until);
  });

  it('returns the clock for live and paused', () => {
    expect(fireFloor({ kind: 'live' }, now)).toBe(now);
    expect(fireFloor({ kind: 'paused' }, now)).toBe(now);
  });
});

describe('quietPatch', () => {
  const now = dt(2026, 6, 23, 8, 0);
  const hour = 60 * 60 * 1000;

  it('clears sticky pause for that feature', () => {
    const settings = { ...DEFAULT_SETTINGS, eyePaused: true };
    const patch = quietPatch(settings, 'eye', hour, now);
    expect(patch.eyePaused).toBe(false);
    expect(patch.eyeQuietUntil).toBe(dt(2026, 6, 23, 9, 0).toISOString());
  });

  it('keeps the later of existing-if-future and now+ms', () => {
    const existing = dt(2026, 6, 23, 11, 0);
    const settings = {
      ...DEFAULT_SETTINGS,
      eyeQuietUntil: existing.toISOString(),
    };
    const patch = quietPatch(settings, 'eye', hour, now);
    expect(patch.eyeQuietUntil).toBe(existing.toISOString());
  });

  it('extends when the existing until is sooner than now+ms', () => {
    const existing = dt(2026, 6, 23, 8, 20);
    const settings = {
      ...DEFAULT_SETTINGS,
      waterQuietUntil: existing.toISOString(),
    };
    const patch = quietPatch(settings, 'water', hour, now);
    expect(patch.waterQuietUntil).toBe(dt(2026, 6, 23, 9, 0).toISOString());
    expect(patch.waterPaused).toBe(false);
  });
});
