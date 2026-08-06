/// <reference types="jest" />
import type * as Notifications from 'expo-notifications';

import { InMemoryRepository } from '../../src/data';
import { logGlassViaRepo } from '../../src/data/logGlassViaRepo';
import { dateKey } from '../../src/types/log';

type NotificationsApi = typeof Notifications;

function makeNotifications() {
  return {
    scheduleNotificationAsync: jest.fn().mockResolvedValue('nid'),
    cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsApi;
}

describe('logGlassViaRepo', () => {
  it('increments today water glasses and preserves eye breaks', async () => {
    const now = () => new Date(2026, 5, 23, 10, 0);
    const today = dateKey(now());
    const repo = new InMemoryRepository({ waterGoalGlasses: 8 });
    await repo.upsertLog({ date: today, eyeBreaks: 2, waterGlasses: 3 });
    const notifications = makeNotifications();

    const result = await logGlassViaRepo(repo, { notifications, now });

    expect(result).toEqual({
      waterGlasses: 4,
      hydrated: false,
      newlyHydrated: false,
    });
    expect(await repo.getLog(today)).toEqual({
      date: today,
      eyeBreaks: 2,
      waterGlasses: 4,
    });
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('reschedules water when the log newly hits the goal', async () => {
    const now = () => new Date(2026, 5, 23, 7, 0);
    const today = dateKey(now());
    const repo = new InMemoryRepository({
      waterEnabled: true,
      waterPaused: false,
      waterGoalGlasses: 2,
      activeHoursStart: '08:00',
      activeHoursEnd: '10:00',
      soundEnabled: true,
    });
    await repo.upsertLog({ date: today, eyeBreaks: 0, waterGlasses: 1 });
    await repo.addScheduledId('water', '2026-06-23T09:00:00.000Z', 'old');
    const notifications = makeNotifications();

    const result = await logGlassViaRepo(repo, { notifications, now });

    expect(result.newlyHydrated).toBe(true);
    expect(result.hydrated).toBe(true);
    expect(result.waterGlasses).toBe(2);
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'old',
    );
  });
});
