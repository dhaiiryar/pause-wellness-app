import type { ScheduledNotificationRecord } from '../data/Repository';
import type { PermissionResult } from '../permissions';
import type { Feature } from '../types/feature';
import type { Mute } from './mute';

export type Delivery =
  | { kind: 'denied' }
  | { kind: 'off' }
  | { kind: 'paused' }
  | { kind: 'quiet'; until: Date }
  | { kind: 'hydrated' }
  | { kind: 'next'; at: Date }
  | { kind: 'none' };

export type DeliverySource =
  | {
      feature: 'eye';
      enabled: boolean;
      mute: Mute;
      permission: PermissionResult;
      nextFire: Date | null;
    }
  | {
      feature: 'water';
      enabled: boolean;
      mute: Mute;
      permission: PermissionResult;
      nextFire: Date | null;
      hydrated: boolean;
    };

export function deriveDelivery(source: DeliverySource): Delivery {
  if (source.permission === 'denied') return { kind: 'denied' };
  if (!source.enabled) return { kind: 'off' };

  switch (source.mute.kind) {
    case 'paused':
      return { kind: 'paused' };
    case 'quiet':
      return { kind: 'quiet', until: source.mute.until };
    case 'live':
      break;
    default: {
      const _exhaustive: never = source.mute;
      return _exhaustive;
    }
  }

  if (source.feature === 'water' && source.hydrated) {
    return { kind: 'hydrated' };
  }
  if (source.nextFire) return { kind: 'next', at: source.nextFire };
  return { kind: 'none' };
}

export function statusLine(feature: Feature, delivery: Delivery): string {
  switch (delivery.kind) {
    case 'denied':
      return 'Notifications are off';
    case 'off':
      return feature === 'eye'
        ? 'Eye reminders are off'
        : 'Water reminders are off';
    case 'paused':
      return feature === 'eye'
        ? 'Eye reminders paused'
        : 'Water reminders paused';
    case 'quiet':
      return `Quiet until ${formatClock(delivery.until)}`;
    case 'hydrated':
      return "You're hydrated — well done.";
    case 'next':
      return feature === 'eye'
        ? `Next eye rest ${formatClock(delivery.at)}`
        : `Next glass ${formatClock(delivery.at)}`;
    case 'none':
      return feature === 'eye' ? 'No eye rest due' : 'No glass due';
    default: {
      const _exhaustive: never = delivery;
      return _exhaustive;
    }
  }
}

export function earliestTrigger(
  rows: ScheduledNotificationRecord[],
  now: Date,
): Date | null {
  let earliest: Date | null = null;
  for (const row of rows) {
    const t = new Date(row.triggerTime);
    if (Number.isNaN(t.getTime()) || t.getTime() <= now.getTime()) continue;
    if (!earliest || t.getTime() < earliest.getTime()) earliest = t;
  }
  return earliest;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
