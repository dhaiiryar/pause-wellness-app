import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Switch, View } from 'react-native';

import {
  Button,
  LoadingScreen,
  PauseMark,
  Screen,
  SettingsRow,
  Text,
} from '../components';
import { useDailyLog } from '../state/DailyLogProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme';
import { RouteNames, type RootStackParamList } from '../navigation/routes';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Home tab: pause mark, today's counts, thumb-zone actions for the two
 * rituals, then demoted pause switches. One-tap log glass stays here.
 */
export function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const { settings, updateSettings } = useSettings();
  const {
    eyeBreaks,
    waterGlasses,
    goal,
    hydrated,
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
          paddingTop: theme.spacing.lg,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -80,
            left: -48,
            right: -48,
            height: 280,
            borderRadius: 160,
            backgroundColor: theme.colors.primary,
            opacity: 0.14,
          }}
        />

        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <PauseMark size="lg" />
          <Text variant="heading" style={{ textAlign: 'center' }}>
            look 20 ft away
          </Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            A calm moment, whenever you need one.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.xxxl,
            marginTop: theme.spacing.xxl,
          }}
        >
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Text
              variant="display"
              accessibilityLabel={`${eyeBreaks} eye breaks today`}
            >
              {eyeBreaks}
            </Text>
            <Text variant="caption" tone="muted">
              breaks
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Text
              accessibilityLabel={`${waterGlasses} of ${goal} glasses`}
            >
              <Text variant="display">{waterGlasses}</Text>
            </Text>
            <Text variant="caption" tone="muted">
              {`of ${goal} glasses`}
            </Text>
          </View>
        </View>

        {hydrated && (
          <Text
            variant="body"
            tone="primary"
            style={{ textAlign: 'center', marginTop: theme.spacing.md }}
          >
            {"You're hydrated — well done."}
          </Text>
        )}

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
