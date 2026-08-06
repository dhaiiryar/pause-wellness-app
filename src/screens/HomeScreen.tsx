import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Pressable, Switch, View } from 'react-native';

import { Button, Card, LoadingScreen, Screen, Text } from '../components';
import { useDailyLog } from '../state/DailyLogProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme';
import { RouteNames, type RootStackParamList } from '../navigation/routes';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Home tab: calm daily dashboard with today's eye/water counts, per-feature
 * pause controls, and quick entry into Eye Rest and Water Log.
 */
export function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const { settings, updateSettings } = useSettings();
  const { eyeBreaks, waterGlasses, goal, hydrated, loading } = useDailyLog();

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-start',
          paddingTop: theme.spacing.xl,
          gap: theme.spacing.xl,
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="display">Pause</Text>
          <Text variant="body" tone="muted">
            A calm moment, whenever you need one.
          </Text>
        </View>

        <Card>
          <Text variant="title">Eye breaks</Text>
          <Text
            variant="display"
            accessibilityLabel={`${eyeBreaks} eye breaks today`}
          >
            {eyeBreaks}
          </Text>

          <Pressable
            onPress={() => updateSettings({ eyePaused: !settings.eyePaused })}
            accessible={false}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <Text variant="body" style={{ flexShrink: 1 }}>
              Pause eye reminders
            </Text>
            <Switch
              value={settings.eyePaused}
              onValueChange={(v) => updateSettings({ eyePaused: v })}
              trackColor={{ true: theme.colors.primary }}
              accessibilityLabel="Pause eye reminders"
              accessibilityHint="Pauses eye-break reminders until turned back on"
            />
          </Pressable>

          <Button
            label="Start Eye Rest"
            onPress={() => navigation.navigate(RouteNames.EyeRest)}
            accessibilityLabel="Start eye rest"
            accessibilityHint="Opens a 20-second guided eye break"
          />
        </Card>

        <Card>
          <Text variant="title">Water</Text>
          <Text
            accessibilityLabel={`${waterGlasses} of ${goal} glasses`}
          >
            <Text variant="display">{waterGlasses}</Text>
            <Text variant="title" tone="muted">
              {` / ${goal}`}
            </Text>
          </Text>

          {hydrated && (
            <Text variant="body" tone="primary">
              {"You're hydrated — well done."}
            </Text>
          )}

          <Pressable
            onPress={() =>
              updateSettings({ waterPaused: !settings.waterPaused })
            }
            accessible={false}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <Text variant="body" style={{ flexShrink: 1 }}>
              Pause water reminders
            </Text>
            <Switch
              value={settings.waterPaused}
              onValueChange={(v) => updateSettings({ waterPaused: v })}
              trackColor={{ true: theme.colors.primary }}
              accessibilityLabel="Pause water reminders"
              accessibilityHint="Pauses water reminders until turned back on"
            />
          </Pressable>

          <Button
            label="Log Water"
            variant="secondary"
            onPress={() => navigation.navigate(RouteNames.WaterLog)}
            accessibilityLabel="Log water"
            accessibilityHint="Opens the water log"
          />
        </Card>
      </View>
    </Screen>
  );
}
