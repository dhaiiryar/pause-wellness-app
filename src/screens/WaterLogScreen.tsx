import { View } from 'react-native';

import { Button, LoadingScreen, Screen, Text } from '../components';
import { useDailyLog } from '../state/DailyLogProvider';
import { useTheme } from '../theme';

/**
 * Water-log modal: single-tap glass logging, undo, gentle progress toward a
 * daily goal, and a calm "hydrated" state when the goal is reached.
 *
 * Subscribes to the {@link DailyLogProvider} — if the store is still loading
 * (initial repository read), shows a calm themed placeholder under the modal
 * backdrop so the user does not see a blank flash.
 */
export function WaterLogScreen() {
  const { theme } = useTheme();
  const { waterGlasses, goal, hydrated, loading, logGlass, undoGlass } =
    useDailyLog();

  if (loading) return <LoadingScreen />;

  const pct = Math.min(waterGlasses / goal, 1);
  const fillWidth = pct * 100;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xxl }}>

        {/* ---- count ---- */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.heading,
              fontFamily: theme.typography.familyLight,
            }}
          >
            {waterGlasses}{' '}
            <Text style={{ color: theme.colors.textMuted }}>
              / {goal} glasses
            </Text>
          </Text>

          {/* ---- gentle hydrated state ---- */}
          {hydrated && (
          <Text
            style={{
              color: theme.colors.primaryText,
              fontSize: theme.typography.body,
              fontFamily: theme.typography.familyRegular,
            }}
          >
            You're hydrated — well done.
          </Text>
          )}
        </View>

        {/* ---- progress bar ---- */}
        <View
          style={{
            height: 8,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.surface,
            overflow: 'hidden',
          }}
          accessibilityRole="progressbar"
          accessibilityLabel={`${waterGlasses} of ${goal} glasses`}
          accessibilityValue={{
            min: 0,
            max: goal,
            now: waterGlasses,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${fillWidth}%`,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.primary,
            }}
          />
        </View>

        {/* ---- actions ---- */}
        <View style={{ gap: theme.spacing.lg }}>
          <Button
            label={hydrated ? 'Log another glass' : 'Log a glass'}
            onPress={logGlass}
            accessibilityLabel={
              hydrated ? 'Log another glass' : 'Log a glass'
            }
            accessibilityHint="Adds one glass to today's count"
          />
          {waterGlasses > 0 && (
            <Button
              label="Undo"
              variant="secondary"
              onPress={undoGlass}
              accessibilityLabel="Undo last glass"
              accessibilityHint="Removes the last logged glass"
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
