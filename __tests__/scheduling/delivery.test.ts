/// <reference types="jest" />

import {
  deriveDelivery,
  earliestTrigger,
  type DeliverySource,
} from '../../src/scheduling/delivery';

function dt(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute);
}

const nextAt = dt(2026, 6, 23, 9, 20);

function eye(over: Partial<DeliverySource> & { feature?: 'eye' }): DeliverySource {
  return {
    feature: 'eye',
    enabled: true,
    mute: { kind: 'live' },
    permission: 'granted',
    nextFire: nextAt,
    ...over,
  };
}

function water(
  over: Partial<Extract<DeliverySource, { feature: 'water' }>>,
): DeliverySource {
  return {
    feature: 'water',
    enabled: true,
    mute: { kind: 'live' },
    permission: 'granted',
    nextFire: nextAt,
    hydrated: false,
    ...over,
  };
}

describe('deriveDelivery', () => {
  it('folds denied before off, paused, quiet, next', () => {
    expect(
      deriveDelivery(
        eye({
          permission: 'denied',
          enabled: false,
          mute: { kind: 'paused' },
        }),
      ),
    ).toEqual({ kind: 'denied' });
  });

  it('folds off before paused', () => {
    expect(
      deriveDelivery(eye({ enabled: false, mute: { kind: 'paused' } })),
    ).toEqual({ kind: 'off' });
  });

  it('folds paused before quiet', () => {
    expect(
      deriveDelivery(
        eye({
          mute: { kind: 'paused' },
        }),
      ),
    ).toEqual({ kind: 'paused' });
  });

  it('folds quiet before next', () => {
    const until = dt(2026, 6, 23, 9, 0);
    expect(deriveDelivery(eye({ mute: { kind: 'quiet', until } }))).toEqual({
      kind: 'quiet',
      until,
    });
  });

  it('folds water hydrated before next', () => {
    expect(deriveDelivery(water({ hydrated: true }))).toEqual({
      kind: 'hydrated',
    });
  });

  it('never emits hydrated for eye', () => {
    expect(deriveDelivery(eye({ nextFire: null }))).toEqual({ kind: 'none' });
    expect(deriveDelivery(eye({ nextFire: nextAt }))).toEqual({
      kind: 'next',
      at: nextAt,
    });
  });

  it('does not deny when permission is unknown', () => {
    expect(deriveDelivery(eye({ permission: 'unknown' }))).toEqual({
      kind: 'next',
      at: nextAt,
    });
  });

  it('returns next when live with a tracked fire', () => {
    expect(deriveDelivery(water({}))).toEqual({ kind: 'next', at: nextAt });
  });

  it('returns none when live with no tracked fire', () => {
    expect(deriveDelivery(water({ nextFire: null }))).toEqual({ kind: 'none' });
  });
});

describe('earliestTrigger', () => {
  const now = dt(2026, 6, 23, 8, 0);

  it('returns the soonest trigger after now and skips invalid ISO', () => {
    const result = earliestTrigger(
      [
        {
          feature: 'eye',
          triggerTime: 'not-a-date',
          notificationId: 'bad',
        },
        {
          feature: 'eye',
          triggerTime: dt(2026, 6, 23, 7, 40).toISOString(),
          notificationId: 'past',
        },
        {
          feature: 'eye',
          triggerTime: dt(2026, 6, 23, 9, 20).toISOString(),
          notificationId: 'later',
        },
        {
          feature: 'eye',
          triggerTime: dt(2026, 6, 23, 8, 20).toISOString(),
          notificationId: 'soon',
        },
      ],
      now,
    );
    expect(result?.toISOString()).toBe(dt(2026, 6, 23, 8, 20).toISOString());
  });

  it('returns null when nothing is in the future', () => {
    expect(earliestTrigger([], now)).toBeNull();
    expect(
      earliestTrigger(
        [
          {
            feature: 'water',
            triggerTime: dt(2026, 6, 23, 7, 0).toISOString(),
            notificationId: 'past',
          },
        ],
        now,
      ),
    ).toBeNull();
  });
});
