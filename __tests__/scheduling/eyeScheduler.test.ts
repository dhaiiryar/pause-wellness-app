/// <reference types="jest" />
import type * as Notifications from 'expo-notifications';

import { rescheduleEyeReminders } from '../../src/scheduling/eyeScheduler';
import { InMemoryRepository } from '../../src/data';
import { EYE_CATEGORY_IDENTIFIER } from '../../src/notifications/categoryIds';

type NotificationsApi = typeof Notifications;

/**
 * Compute a `Date` in the test's local timezone.
 */
function dt(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute);
}

function makeNotifications() {
  const scheduleNotificationAsync = jest
    .fn<Promise<string>, [Notifications.NotificationRequestInput]>()
    .mockResolvedValue('nid');
  const cancelScheduledNotificationAsync = jest
    .fn<Promise<void>, [string]>()
    .mockResolvedValue(undefined);

  return {
    scheduleNotificationAsync,
    cancelScheduledNotificationAsync,
  } as unknown as NotificationsApi;
}

describe('rescheduleEyeReminders', () => {
  it('schedules eye reminders for today + next 2 days when enabled and unpaused', async () => {
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      eyePaused: false,
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
      soundEnabled: true,
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleEyeReminders({ repo, notifications, now });

    // 08:00-10:00 → 6 times per day × 3 days = 18 scheduled notifications.
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(18);

    const tracked = await repo.getScheduledIds('eye');
    expect(tracked).toHaveLength(18);

    // First tracked id should be for today at 08:00.
    expect(tracked[0].triggerTime).toBe(dt(2026, 6, 23, 8, 0).toISOString());
    expect(tracked[0].notificationId).toBe('nid');

    // Sound enabled → use the `eye` channel.
    const firstCall = (notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(firstCall.trigger.channelId).toBe('eye');
    expect(firstCall.content.data).toEqual({ feature: 'eye' });
    expect(firstCall.content.categoryIdentifier).toBe(EYE_CATEGORY_IDENTIFIER);
  });

  it('uses the muted channel when sounds are disabled', async () => {
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      eyePaused: false,
      activeHoursStart: '08:00',
      activeHoursEnd: '08:20',
      soundEnabled: false,
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleEyeReminders({ repo, notifications, now });

    const firstCall = (notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(firstCall.trigger.channelId).toBe('eye_muted');
  });

  it('cancels existing eye notifications and schedules nothing when disabled', async () => {
    const repo = new InMemoryRepository({
      eyeEnabled: false,
      eyePaused: false,
    });
    await repo.addScheduledId('eye', '2026-06-23T08:00:00.000Z', 'old-eye');
    const notifications = makeNotifications();

    await rescheduleEyeReminders({ repo, notifications });

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'old-eye',
    );
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await repo.getScheduledIds('eye')).toEqual([]);
  });

  it('cancels existing eye notifications and schedules nothing when paused', async () => {
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      eyePaused: true,
    });
    await repo.addScheduledId('eye', '2026-06-23T08:00:00.000Z', 'old-eye');
    const notifications = makeNotifications();

    await rescheduleEyeReminders({ repo, notifications });

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'old-eye',
    );
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await repo.getScheduledIds('eye')).toEqual([]);
  });

  it('does not touch water scheduled ids', async () => {
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      eyePaused: false,
      activeHoursStart: '08:00',
      activeHoursEnd: '08:20',
      soundEnabled: true,
    });
    await repo.addScheduledId('water', '2026-06-23T08:00:00.000Z', 'water-1');
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleEyeReminders({ repo, notifications, now });

    expect(await repo.getScheduledIds('water')).toHaveLength(1);
    expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('defaults eyePaused to false from DEFAULT_SETTINGS', async () => {
    // Sanity check: InMemoryRepository merges initial over DEFAULT_SETTINGS.
    // If eyePaused were accidentally defaulted to true, scheduling would fail.
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      activeHoursStart: '08:00',
      activeHoursEnd: '08:20',
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleEyeReminders({ repo, notifications, now });

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect((await repo.getSettings()).eyePaused).toBe(false);
  });

  it('floors today at quiet until and still schedules later fires', async () => {
    const until = dt(2026, 6, 23, 9, 0);
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      eyePaused: false,
      eyeQuietUntil: until.toISOString(),
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
      soundEnabled: true,
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 8, 0);

    await rescheduleEyeReminders({ repo, notifications, now });

    const tracked = await repo.getScheduledIds('eye');
    const times = tracked.map((row) => new Date(row.triggerTime).getTime());
    expect(times).not.toContain(dt(2026, 6, 23, 8, 0).getTime());
    expect(times).not.toContain(dt(2026, 6, 23, 8, 20).getTime());
    expect(times).not.toContain(dt(2026, 6, 23, 8, 40).getTime());
    expect(times).not.toContain(dt(2026, 6, 23, 9, 0).getTime());
    expect(times).toContain(dt(2026, 6, 23, 9, 20).getTime());
    expect(times).toContain(dt(2026, 6, 23, 9, 40).getTime());
    expect(times).toContain(dt(2026, 6, 24, 8, 0).getTime());
    expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing when sticky-paused even if a quiet until is set', async () => {
    const repo = new InMemoryRepository({
      eyeEnabled: true,
      eyePaused: true,
      eyeQuietUntil: dt(2026, 6, 23, 9, 0).toISOString(),
    });
    await repo.addScheduledId('eye', '2026-06-23T08:00:00.000Z', 'old-eye');
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 8, 0);

    await rescheduleEyeReminders({ repo, notifications, now });

    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await repo.getScheduledIds('eye')).toEqual([]);
  });
});
