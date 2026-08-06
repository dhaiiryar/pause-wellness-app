/// <reference types="jest" />
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { RouteNames, type TabsParamList } from '../../src/navigation/routes';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { RepositoryProvider, InMemoryRepository } from '../../src/data';
import { DailyLogProvider } from '../../src/state/DailyLogProvider';
import { SettingsProvider } from '../../src/state/SettingsProvider';
import { ThemeProvider } from '../../src/theme';
import { todayKey } from '../../src/types/log';

const Tabs = createBottomTabNavigator<TabsParamList>();

function TestNavigator() {
  return (
    <NavigationContainer>
      <Tabs.Navigator>
        <Tabs.Screen
          name={RouteNames.Home}
          component={HomeScreen}
          options={{ headerShown: false }}
        />
      </Tabs.Navigator>
    </NavigationContainer>
  );
}

async function renderHome(repo: InMemoryRepository) {
  return render(
    <RepositoryProvider repository={repo}>
      <SettingsProvider>
        <DailyLogProvider>
          <ThemeProvider mode="system">
            <TestNavigator />
          </ThemeProvider>
        </DailyLogProvider>
      </SettingsProvider>
    </RepositoryProvider>
  );
}

describe('HomeScreen', () => {
  it('labels the eye-rest and water buttons with hints', async () => {
    const repo = new InMemoryRepository({});
    const { getByRole } = await renderHome(repo);

    const eyeButton = await waitFor(() =>
      getByRole('button', { name: 'Start eye rest' })
    );
    expect(eyeButton.props.accessibilityHint).toBe(
      'Opens a 20-second guided eye break'
    );

    const logGlassButton = getByRole('button', { name: 'Log a glass' });
    expect(logGlassButton.props.accessibilityHint).toBe(
      "Adds one glass to today's count"
    );

    const openWaterLogButton = getByRole('button', {
      name: 'Open water log',
    });
    expect(openWaterLogButton.props.accessibilityHint).toBe(
      'Opens the full water log'
    );
  });

  it('logs a glass from Home and persists', async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 8 });
    const { getByRole } = await renderHome(repo);

    const logButton = await waitFor(() =>
      getByRole('button', { name: 'Log a glass' })
    );
    fireEvent.press(logButton);

    await waitFor(async () => {
      expect((await repo.getLog(todayKey())).waterGlasses).toBe(1);
    });
  });

  it('undoes a glass from Home', async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 8 });
    const { getByRole, findByRole } = await renderHome(repo);

    fireEvent.press(await findByRole('button', { name: 'Log a glass' }));

    const undoButton = await findByRole('button', { name: 'Undo last glass' });
    expect(undoButton.props.accessibilityHint).toBe(
      'Removes the last logged glass'
    );
    fireEvent.press(undoButton);

    await waitFor(async () => {
      expect((await repo.getLog(todayKey())).waterGlasses).toBe(0);
    });
  });

  it('toggles eye pause via the switch and persists', async () => {
    const repo = new InMemoryRepository({ eyePaused: false });
    const { getByRole } = await renderHome(repo);

    const toggle = await waitFor(() =>
      getByRole('switch', { name: 'Pause eye reminders' })
    );
    expect(toggle.props.accessibilityHint).toBe(
      'Pauses eye-break reminders until turned back on'
    );

    fireEvent(toggle, 'valueChange', true);
    await waitFor(async () => {
      expect((await repo.getSettings()).eyePaused).toBe(true);
    });
  });

  it('toggles water pause via the switch and persists', async () => {
    const repo = new InMemoryRepository({ waterPaused: false });
    const { getByRole } = await renderHome(repo);

    const toggle = await waitFor(() =>
      getByRole('switch', { name: 'Pause water reminders' })
    );
    expect(toggle.props.accessibilityHint).toBe(
      'Pauses water reminders until turned back on'
    );

    fireEvent(toggle, 'valueChange', true);
    await waitFor(async () => {
      expect((await repo.getSettings()).waterPaused).toBe(true);
    });
  });

  it("shows today's eye break count", async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 8 });
    await repo.upsertLog({
      date: todayKey(),
      eyeBreaks: 3,
      waterGlasses: 0,
    });

    const { findByLabelText } = await renderHome(repo);

    await findByLabelText('3 eye breaks today');
  });

  it('shows water count vs goal', async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 8 });
    await repo.upsertLog({
      date: todayKey(),
      eyeBreaks: 0,
      waterGlasses: 2,
    });

    const { findByLabelText } = await renderHome(repo);

    await findByLabelText('2 of 8 glasses');
  });

  it('shows the hydrated message when goal is reached', async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 8 });
    await repo.upsertLog({
      date: todayKey(),
      eyeBreaks: 0,
      waterGlasses: 8,
    });

    const { findByText } = await renderHome(repo);

    await findByText("You're hydrated — well done.");
  });
});
