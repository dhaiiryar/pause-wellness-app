import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Switch, View } from 'react-native';

import {
  Button,
  Card,
  LoadingScreen,
  Screen,
  SettingsRow,
  Text,
} from '../components';
import { openAppNotificationSettings } from '../permissions';
import { statusLine } from '../scheduling/delivery';
import { QUIET_MS } from '../scheduling/mute';
import { useDailyLog } from '../state/DailyLogProvider';
import { useLoop } from '../state/useLoop';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme';
import { RouteNames, type RootStackParamList } from '../navigation/routes';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Home tab: counts as facts, actions at the thumb, pause switches demoted.
 * One-tap log glass stays here.
 */
export function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const { settings, updateSettings } = useSettings();
  const loop = useLoop();
  const {
    eyeBreaks,
    waterGlasses,
    goal,
    loading,
    logGlass,
    undoGlass,
  } = useDailyLog();

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          paddingTop: theme.spacing.xl,
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="display">Pause</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            A calm moment, whenever you need one.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginTop: theme.spacing.xl,
          }}
        >
          <Card style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              Eye breaks
            </Text>
            <Text
              variant="display"
              accessibilityLabel={`${eyeBreaks} eye breaks today`}
            >
              {eyeBreaks}
            </Text>
            <Text variant="caption" tone="muted">
              {statusLine('eye', loop.eye)}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              Water
            </Text>
            <Text accessibilityLabel={`${waterGlasses} of ${goal} glasses`}>
              <Text variant="display">{waterGlasses}</Text>
              <Text variant="title" tone="muted">
                {` / ${goal}`}
              </Text>
            </Text>
            <Text variant="caption" tone="muted">
              {statusLine('water', loop.water)}
            </Text>
          </Card>
        </View>

        <View
          style={{
            marginTop: 'auto',
            gap: theme.spacing.sm,
            paddingTop: theme.spacing.xl,
          }}
        >
          <Button
            label="Start Eye Rest"
            onPress={() => navigation.navigate(RouteNames.EyeRest)}
            accessibilityLabel="Start eye rest"
            accessibilityHint="Opens a 20-second guided eye break"
          />
          <Button
            label="Log a glass"
            variant="secondary"
            onPress={() => {
              void logGlass();
            }}
            accessibilityLabel="Log a glass"
            accessibilityHint="Adds one glass to today's count"
          />
          {waterGlasses > 0 && (
            <Button
              label="Undo"
              variant="ghost"
              onPress={() => {
                void undoGlass();
              }}
              accessibilityLabel="Undo last glass"
              accessibilityHint="Removes the last logged glass"
            />
          )}
          <Button
            label="Open water log"
            variant="ghost"
            onPress={() => navigation.navigate(RouteNames.WaterLog)}
            accessibilityLabel="Open water log"
            accessibilityHint="Opens the full water log"
          />
          <Button
            label="Quiet for 1 hour"
            variant="ghost"
            onPress={() => {
              void loop.quietForAll(QUIET_MS);
            }}
            accessibilityLabel="Quiet reminders for 1 hour"
            accessibilityHint="Silences eye and water reminders for one hour"
          />
          {loop.permission === 'denied' ? (
            <Button
              label="Enable notifications"
              variant="ghost"
              onPress={() => {
                void openAppNotificationSettings();
              }}
              accessibilityLabel="Enable notifications"
              accessibilityHint="Opens system settings so you can enable notifications"
            />
          ) : null}

          <SettingsRow
            label="Pause eye reminders"
            onPress={() => updateSettings({ eyePaused: !settings.eyePaused })}
          >
            <Switch
              value={settings.eyePaused}
              onValueChange={(v) => updateSettings({ eyePaused: v })}
              trackColor={{ true: theme.colors.primary }}
              accessibilityLabel="Pause eye reminders"
              accessibilityHint="Pauses eye-break reminders until turned back on"
            />
          </SettingsRow>
          <SettingsRow
            label="Pause water reminders"
            last
            onPress={() =>
              updateSettings({ waterPaused: !settings.waterPaused })
            }
          >
            <Switch
              value={settings.waterPaused}
              onValueChange={(v) => updateSettings({ waterPaused: v })}
              trackColor={{ true: theme.colors.primary }}
              accessibilityLabel="Pause water reminders"
              accessibilityHint="Pauses water reminders until turned back on"
            />
          </SettingsRow>
        </View>
      </View>
    </Screen>
  );
}
