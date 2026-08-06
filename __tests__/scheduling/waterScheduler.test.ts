/// <reference types="jest" />
import type * as Notifications from 'expo-notifications';

import { rescheduleWaterReminders } from '../../src/scheduling/waterScheduler';
import { InMemoryRepository } from '../../src/data';
import { WATER_CATEGORY_IDENTIFIER } from '../../src/notifications/categoryIds';

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

describe('rescheduleWaterReminders', () => {
  it('schedules water reminders for today + next 2 days when enabled and unpaused', async () => {
    // goal 2 over 08:00–10:00 → interval 60 min → 08:00, 09:00 per day × 3 = 6
    const repo = new InMemoryRepository({
      waterEnabled: true,
      waterPaused: false,
      waterGoalGlasses: 2,
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
      soundEnabled: true,
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleWaterReminders({ repo, notifications, now });

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);

    const tracked = await repo.getScheduledIds('water');
    expect(tracked).toHaveLength(6);

    expect(tracked[0].triggerTime).toBe(dt(2026, 6, 23, 8, 0).toISOString());
    expect(tracked[0].notificationId).toBe('nid');

    const firstCall = (notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(firstCall.trigger.channelId).toBe('water');
    expect(firstCall.content.data).toEqual({ feature: 'water' });
    expect(firstCall.content.categoryIdentifier).toBe(
      WATER_CATEGORY_IDENTIFIER,
    );
  });

  it('uses the muted channel when sounds are disabled', async () => {
    const repo = new InMemoryRepository({
      waterEnabled: true,
      waterPaused: false,
      waterGoalGlasses: 1,
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
      soundEnabled: false,
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleWaterReminders({ repo, notifications, now });

    const firstCall = (notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0];
    expect(firstCall.trigger.channelId).toBe('water_muted');
  });

  it('cancels existing water notifications and schedules nothing when disabled', async () => {
    const repo = new InMemoryRepository({
      waterEnabled: false,
      waterPaused: false,
    });
    await repo.addScheduledId('water', '2026-06-23T08:00:00.000Z', 'old-water');
    const notifications = makeNotifications();

    await rescheduleWaterReminders({ repo, notifications });

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'old-water',
    );
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await repo.getScheduledIds('water')).toEqual([]);
  });

  it('cancels existing water notifications and schedules nothing when paused', async () => {
    const repo = new InMemoryRepository({
      waterEnabled: true,
      waterPaused: true,
    });
    await repo.addScheduledId('water', '2026-06-23T08:00:00.000Z', 'old-water');
    const notifications = makeNotifications();

    await rescheduleWaterReminders({ repo, notifications });

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'old-water',
    );
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await repo.getScheduledIds('water')).toEqual([]);
  });

  it('does not touch eye scheduled ids', async () => {
    const repo = new InMemoryRepository({
      waterEnabled: true,
      waterPaused: false,
      waterGoalGlasses: 1,
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
      soundEnabled: true,
    });
    await repo.addScheduledId('eye', '2026-06-23T08:00:00.000Z', 'eye-1');
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleWaterReminders({ repo, notifications, now });

    expect(await repo.getScheduledIds('eye')).toHaveLength(1);
    expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('defaults waterPaused to false from DEFAULT_SETTINGS', async () => {
    const repo = new InMemoryRepository({
      waterEnabled: true,
      waterGoalGlasses: 1,
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
    });
    const notifications = makeNotifications();
    const now = () => dt(2026, 6, 23, 7, 0);

    await rescheduleWaterReminders({ repo, notifications, now });

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect((await repo.getSettings()).waterPaused).toBe(false);
  });
});
