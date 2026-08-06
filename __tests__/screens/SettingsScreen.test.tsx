/// <reference types="jest" />
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

import { RepositoryProvider, InMemoryRepository } from '../../src/data';
import { SettingsProvider } from '../../src/state/SettingsProvider';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { ThemeProvider } from '../../src/theme';

async function renderSettings(repo: InMemoryRepository) {
  return render(
    <RepositoryProvider repository={repo}>
      <SettingsProvider>
        <ThemeProvider mode="system">
          <SettingsScreen />
        </ThemeProvider>
      </SettingsProvider>
    </RepositoryProvider>,
  );
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'denied',
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('toggles reminder sounds off and persists', async () => {
    const repo = new InMemoryRepository({ soundEnabled: true });
    const { getByRole } = await renderSettings(repo);

    const toggle = getByRole('switch', { name: 'Reminder sounds' });
    expect(toggle.props.value).toBe(true);
    expect(toggle.props.accessibilityHint).toBe(
      'Plays a soft chime with each reminder'
    );

    fireEvent(toggle, 'valueChange', false);
    await waitFor(async () => {
      expect((await repo.getSettings()).soundEnabled).toBe(false);
    });
  });

  it('toggles water reminders off and persists', async () => {
    const repo = new InMemoryRepository({ waterEnabled: true });
    const { getByRole } = await renderSettings(repo);

    const toggle = getByRole('switch', { name: 'Water reminders' });
    expect(toggle.props.accessibilityHint).toBe(
      'Sends gentle hydration nudges during active hours'
    );
    fireEvent(toggle, 'valueChange', false);

    await waitFor(async () => {
      expect((await repo.getSettings()).waterEnabled).toBe(false);
    });
  });

  it('shows the default goal value with a hint', async () => {
    const repo = new InMemoryRepository({ waterGoalGlasses: 6 });
    const { getByDisplayValue } = await renderSettings(repo);

    const input = await waitFor(() => getByDisplayValue('6'));
    expect(input.props.accessibilityHint).toBe('Enter a number from 1 to 20');
  });

  it('shows current active hours', async () => {
    const repo = new InMemoryRepository({
      activeHoursStart: '09:00',
      activeHoursEnd: '18:00',
    });
    const { getByDisplayValue } = await renderSettings(repo);

    await waitFor(() => {
      expect(getByDisplayValue('09:00')).toBeTruthy();
      expect(getByDisplayValue('18:00')).toBeTruthy();
    });
  });

  it('persists theme mode when Light is selected', async () => {
    const repo = new InMemoryRepository({ themeMode: 'system' });
    const { getByLabelText } = await renderSettings(repo);

    const light = await waitFor(() => getByLabelText('Theme light'));
    fireEvent.press(light);

    await waitFor(async () => {
      expect((await repo.getSettings()).themeMode).toBe('light');
    });
  });

  it('shows current theme mode as selected', async () => {
    const repo = new InMemoryRepository({ themeMode: 'dark' });
    const { getByLabelText } = await renderSettings(repo);

    const dark = await waitFor(() => getByLabelText('Theme dark'));
    expect(dark.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );

    const system = getByLabelText('Theme system');
    expect(system.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  describe('notification permission recovery', () => {
    it('shows Open system settings when permission is denied', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        granted: false,
        status: 'denied',
      } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);

      const repo = new InMemoryRepository();
      const { getByLabelText, getByText } = await renderSettings(repo);

      await waitFor(() => {
        expect(getByLabelText('Open system settings')).toBeTruthy();
      });
      expect(
        getByText('Reminders need notification permission to reach you.'),
      ).toBeTruthy();
    });

    it('opens system settings when recovery control is pressed', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        granted: false,
        status: 'denied',
      } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
      const openSettings = jest
        .spyOn(Linking, 'openSettings')
        .mockResolvedValue(undefined);

      const repo = new InMemoryRepository();
      const { getByLabelText } = await renderSettings(repo);

      const cta = await waitFor(() => getByLabelText('Open system settings'));
      fireEvent.press(cta);

      expect(openSettings).toHaveBeenCalled();
    });

    it('shows Allowed and no recovery CTA when permission is granted', async () => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        granted: true,
        status: 'granted',
      } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);

      const repo = new InMemoryRepository();
      const { getByText, queryByLabelText } = await renderSettings(repo);

      await waitFor(() => {
        expect(getByText('Allowed')).toBeTruthy();
      });
      expect(queryByLabelText('Open system settings')).toBeNull();
    });
  });
});
