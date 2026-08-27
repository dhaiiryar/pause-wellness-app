/// <reference types="jest" />
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { RepositoryProvider, InMemoryRepository } from '../../src/data';
import { DailyLogProvider, useDailyLog } from '../../src/state/DailyLogProvider';
import { SchedulingProvider } from '../../src/state/SchedulingProvider';
import { SettingsProvider } from '../../src/state/SettingsProvider';

jest.mock('../../src/scheduling/waterScheduler', () => ({
  rescheduleWaterReminders: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../src/scheduling/eyeScheduler', () => ({
  rescheduleEyeReminders: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../src/permissions/notifications', () => ({
  ensureNotificationChannels: jest.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const waterModule = require('../../src/scheduling/waterScheduler');

function Probe() {
  const { loading, logGlass, undoGlass, waterGlasses, hydrated } = useDailyLog();
  if (loading) return <Text testID="dump">loading</Text>;
  return (
    <>
      <Text testID="dump">{`${waterGlasses}|${hydrated}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => void logGlass()}>
        <Text>log</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void undoGlass()}>
        <Text>undo</Text>
      </Pressable>
    </>
  );
}

describe('DailyLogProvider undoGlass reschedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls reschedule when undo drops below goal', async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 1 });
    const { getByTestId, getByRole } = await render(
      <RepositoryProvider repository={repo}>
        <SettingsProvider>
          <SchedulingProvider>
            <DailyLogProvider>
              <Probe />
            </DailyLogProvider>
          </SchedulingProvider>
        </SettingsProvider>
      </RepositoryProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('dump')).toHaveTextContent('0|false');
    });

    fireEvent.press(getByRole('button', { name: 'log' }));
    await waitFor(() => {
      expect(getByTestId('dump')).toHaveTextContent('1|true');
    });
    await waitFor(() => {
      expect(waterModule.rescheduleWaterReminders).toHaveBeenCalled();
    });

    waterModule.rescheduleWaterReminders.mockClear();
    fireEvent.press(getByRole('button', { name: 'undo' }));
    await waitFor(() => {
      expect(getByTestId('dump')).toHaveTextContent('0|false');
    });
    await waitFor(() => {
      expect(waterModule.rescheduleWaterReminders).toHaveBeenCalled();
    });
  });
});
