import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { Button, Card, LoadingScreen, Screen, Text } from '../components';
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

  const pct = Math.min(waterGlasses / goal, 1);

  // Animate fill width when waterGlasses/goal change. useNativeDriver: false
  // because we animate layout width (not transform). Accessibility values stay
  // on the real counts, not intermediate animation frames.
  const [fillAnim] = useState(() => new Animated.Value(pct));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(fillAnim, {
      toValue: pct,
      duration: reduceMotion ? 0 : 250,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fillAnim, pct, reduceMotion]);

  if (loading) return <LoadingScreen />;

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xxl }}>

        {/* ---- count + progress ---- */}
        <Card style={{ gap: theme.spacing.lg }}>
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Text
              accessibilityLabel={`${waterGlasses} of ${goal} glasses logged`}
            >
              <Text variant="display">{waterGlasses}</Text>
              <Text variant="title" tone="muted">
                {` / ${goal} glasses`}
              </Text>
            </Text>

            {hydrated && (
              <Text variant="body" tone="primary">
                {"You're hydrated — well done."}
              </Text>
            )}
          </View>

          <View
            style={{
              height: 12,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.colors.border,
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
            <Animated.View
              style={{
                height: '100%',
                width: fillWidth,
                borderRadius: theme.radii.pill,
                // Accent when hydrated — brand cue without changing the primary CTA.
                backgroundColor: hydrated
                  ? theme.colors.accent
                  : theme.colors.primary,
              }}
            />
          </View>
        </Card>

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
