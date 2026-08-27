import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';

import {
  RootNavigator,
  linking,
  RouteNames,
  handleNotificationResponse,
  type RootStackParamList,
} from './src/navigation';
import { ThemeProvider, useTheme } from './src/theme';
import {
  type Repository,
  RepositoryProvider,
  createRepository,
  logGlassViaRepo,
  quietViaRepo,
} from './src/data';
import {
  SettingsProvider,
  useSettings,
} from './src/state/SettingsProvider';
import { SchedulingProvider } from './src/state/SchedulingProvider';
import {
  DailyLogProvider,
  useDailyLog,
} from './src/state/DailyLogProvider';
import { ensureNotificationChannels } from './src/permissions';
import { subscribeNotificationResponses } from './src/notifications/intake';
import { QUIET_MS } from './src/scheduling/mute';
import './src/notifications/presentation';

// Keep the splash visible until fonts + repository are ready.
SplashScreen.preventAutoHideAsync().catch(() => {
  // In some environments (tests) this is a no-op; ignore.
});

const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

/** Bridges persisted themeMode into ThemeProvider (must sit under SettingsProvider). */
function SettingsBackedThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  return <ThemeProvider mode={settings.themeMode}>{children}</ThemeProvider>;
}

function ThemedApp({
  initialRouteName,
  repository,
}: {
  initialRouteName: keyof RootStackParamList;
  repository: Repository;
}) {
  const { theme, scheme } = useTheme();
  const { refresh: refreshDailyLog } = useDailyLog();
  const { reload: reloadSettings } = useSettings();

  // Drain last-response then listen. Dedupe is inside intake so a cold-start
  // tap cannot log or snooze twice.
  useEffect(() => {
    return subscribeNotificationResponses({
      getLast: () => Notifications.getLastNotificationResponse(),
      clearLast: () => Notifications.clearLastNotificationResponse(),
      addListener: (cb) =>
        Notifications.addNotificationResponseReceivedListener(cb),
      handle: (response) =>
        handleNotificationResponse(response, {
          navigate: (route, params) => {
            if (navigationRef.isReady()) {
              (
                navigationRef.navigate as (
                  name: string,
                  params?: unknown,
                ) => void
              )(route, params);
            }
          },
          logGlass: async () => {
            await logGlassViaRepo(repository);
            await refreshDailyLog();
          },
          snoozeEye: async () => {
            await quietViaRepo(repository, 'eye', QUIET_MS);
            await reloadSettings();
          },
        }),
    });
  }, [repository, refreshDailyLog, reloadSettings]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} linking={linking}>
        <RootNavigator initialRouteName={initialRouteName} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Light': Inter_300Light,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
  });
  const [repo, setRepo] = useState<Repository | null>(null);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | null>(null);

  // Bootstrap the database, channels, and initial route before showing UI.
  useEffect(() => {
    (async () => {
      const r = await createRepository();
      setRepo(r);

      try {
        // Idempotent — ensure channels exist so returning users who
        // completed onboarding before channels were introduced get them.
        await ensureNotificationChannels();
      } catch {
        // Best-effort; non-fatal.
      }

      const settings = await r.getSettings();
      setInitialRoute(
        settings.onboardingComplete ? RouteNames.Tabs : RouteNames.Onboarding,
      );
    })();
  }, []);

  const ready = (fontsLoaded || fontError) && repo && initialRoute;

  const hideSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {
      // ignore — splash may already be hidden
    }
  }, []);

  useEffect(() => {
    if (ready) {
      hideSplash();
    }
  }, [ready, hideSplash]);

  if (!ready) {
    // Splash still covering; render nothing underneath to avoid a flash.
    return null;
  }

  return (
    <SafeAreaProvider>
      <RepositoryProvider repository={repo}>
        <SettingsProvider>
          <SchedulingProvider>
            <DailyLogProvider>
              <SettingsBackedThemeProvider>
                <ThemedApp
                  initialRouteName={initialRoute}
                  repository={repo}
                />
              </SettingsBackedThemeProvider>
            </DailyLogProvider>
          </SchedulingProvider>
        </SettingsProvider>
      </RepositoryProvider>
    </SafeAreaProvider>
  );
}
