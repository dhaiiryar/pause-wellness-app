/// <reference types="jest" />
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RouteNames, type RootStackParamList } from '../../src/navigation/routes';
import { OnboardingScreen } from '../../src/screens/OnboardingScreen';
import { RepositoryProvider, InMemoryRepository } from '../../src/data';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { DailyLogProvider } from '../../src/state/DailyLogProvider';
import { SettingsProvider } from '../../src/state/SettingsProvider';
import { ThemeProvider } from '../../src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Minimal navigator so `navigation.replace(RouteNames.Tabs)` has a real
 * target. The Tabs screen renders `HomeScreen` so we can assert that
 * navigation actually happened (the "Start Eye Rest" button appears after
 * a successful replace).
 */
function TestNavigator({ initial }: { initial: string }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initial as keyof RootStackParamList}>
        <Stack.Screen
          name={RouteNames.Onboarding}
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={RouteNames.Tabs}
          component={HomeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

async function renderOnboarding(repo: InMemoryRepository) {
  return render(
    <RepositoryProvider repository={repo}>
      <SettingsProvider>
        <DailyLogProvider>
          <ThemeProvider mode="system">
            <TestNavigator initial={RouteNames.Onboarding} />
          </ThemeProvider>
        </DailyLogProvider>
      </SettingsProvider>
    </RepositoryProvider>
  );
}

describe('OnboardingScreen', () => {
  it('renders the first onboarding step with a hint', async () => {
    const repo = new InMemoryRepository({
      onboardingComplete: false,
    });
    const { getByText, getByRole } = await renderOnboarding(repo);

    expect(getByText('Pause')).toBeTruthy();

    const nextButton = getByRole('button', { name: 'Next' });
    expect(nextButton.props.accessibilityHint).toBe(
      'Continue to the next onboarding step'
    );
  });

  it('steps through all 4 steps and marks onboarding complete', async () => {
    const repo = new InMemoryRepository({
      onboardingComplete: false,
    });
    const { getByText, getByRole, findByText } = await renderOnboarding(repo);

    // Step 0 → 1
    fireEvent.press(getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(getByText('20-20-20')).toBeTruthy());

    // Step 1 → 2
    fireEvent.press(getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(getByText('Water')).toBeTruthy());

    // Step 2 → 3
    fireEvent.press(getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(getByText('Reminders')).toBeTruthy());

    // Step 3: "Allow reminders" → writes onboardingComplete, navigates to Tabs
    fireEvent.press(getByRole('button', { name: 'Allow reminders' }));

    // After navigation.replace(RouteNames.Tabs), HomeScreen should be visible.
    const homeButton = await findByText('Start Eye Rest');
    expect(homeButton).toBeTruthy();

    // onboardingComplete must be persisted in the repository.
    const settings = await repo.getSettings();
    expect(settings.onboardingComplete).toBe(true);
  });
});
