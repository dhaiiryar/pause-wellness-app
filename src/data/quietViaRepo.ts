import * as Notifications from 'expo-notifications';

import { quietPatch } from '../scheduling/mute';
import { rescheduleEyeReminders } from '../scheduling/eyeScheduler';
import { rescheduleWaterReminders } from '../scheduling/waterScheduler';
import type { Feature } from '../types/feature';
import { applySettingsPatch } from './applySettingsPatch';
import type { Repository } from './Repository';

export async function quietViaRepo(
  repo: Repository,
  feature: Feature,
  durationMs: number,
  now: () => Date = () => new Date(),
): Promise<void> {
  await applySettingsPatch(repo, (current) =>
    quietPatch(current, feature, durationMs, now()),
  );
  try {
    await Promise.allSettled([
      rescheduleEyeReminders({ repo, notifications: Notifications }),
      rescheduleWaterReminders({ repo, notifications: Notifications }),
    ]);
  } catch {
    // Shade must persist the floor even if React never remounts.
  }
}
