import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { LoadingScreen, Screen, TicksRing, Text } from '../components';
import { useDailyLog } from '../state/DailyLogProvider';
import { useTheme } from '../theme';

const DURATION_S = 20;
const RING = 200;
const BREATHE_CIRCLE = 80;

/**
 * Calm guided 20-second eye-rest experience.
 *
 * - A `setInterval`-driven countdown ticks every second; when it reaches 0
 *   `completeBreak` is called (logs one `eyeBreak` via the daily state machine)
 *   and the modal dismisses.
 * - A slow breathing animation (~5s in / ~5s out) plays on a centered circle
 *   via native-driver scale transforms only.
 * - A multi-layer calm wash (primary + accent soft circles) sets atmosphere.
 * - Early dismissal (Close button / back gesture) logs nothing.
 */
export function EyeRestScreen() {
  const { theme, scheme } = useTheme();
  const navigation = useNavigation();
  const { loading, completeBreak } = useDailyLog();

  // ---- countdown timer ------------------------------------------------

  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const completedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Announce completion, persist, and dismiss exactly once when the countdown
  // reaches 0. The short delay lets the assertive announcement finish before
  // the modal disappears.
  useEffect(() => {
    if (secondsLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      AccessibilityInfo.announceForAccessibility('Eye rest complete');
      const t = setTimeout(() => {
        (async () => {
          await completeBreak();
          navigation.goBack();
        })();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [secondsLeft, completeBreak, navigation]);

  // ---- breathing animation (scale-only, native driver) ----------------
  // Lazy useState keeps a stable Animated.Value without reading a ref in render
  // (satisfies react-hooks/refs while preserving the classic RN pattern).

  const [breatheAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 5000,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 5000,
          easing,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breatheAnim]);

  const breatheScale = useMemo(
    () =>
      breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1.15],
      }),
    [breatheAnim],
  );

  // Soft primary wash is slightly stronger in dark mode so the sage tint reads.
  const primaryWashOpacity = scheme === 'dark' ? 0.22 : 0.16;
  const primaryWashSize = RING * 1.4;
  const accentWashSize = RING * 1.1;

  // ---- render ---------------------------------------------------------

  if (loading) return <LoadingScreen />;

  return (
    <Screen scroll={false}>
      {/* ---- calm atmosphere (layered washes; pointerEvents none) ---- */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.surface,
          opacity: 0.2,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: primaryWashSize,
          height: primaryWashSize,
          marginTop: -primaryWashSize / 2 - 24,
          marginLeft: -primaryWashSize / 2,
          borderRadius: primaryWashSize / 2,
          backgroundColor: theme.colors.primary,
          opacity: primaryWashOpacity,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: accentWashSize,
          height: accentWashSize,
          marginTop: -accentWashSize / 2 + 48,
          marginLeft: -accentWashSize / 2 + 20,
          borderRadius: accentWashSize / 2,
          backgroundColor: theme.colors.accent,
          opacity: 0.08,
        }}
      />

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: theme.spacing.xxl,
        }}
      >
        {/* ---- countdown ring ---- */}
        <View
          accessibilityLabel={`${secondsLeft} seconds remaining`}
          accessibilityLiveRegion="polite"
        >
          <TicksRing lit={secondsLeft} total={DURATION_S} size={RING} />

          {/* Center content: breathing circle + countdown number */}
          <View
            style={{
              position: 'absolute',
              top: RING / 2 - BREATHE_CIRCLE / 2,
              left: RING / 2 - BREATHE_CIRCLE / 2,
              width: BREATHE_CIRCLE,
              height: BREATHE_CIRCLE,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/*
              Outer node: scale-only transform (native driver).
              Inner node: static fill + countdown text (no animated props).
            */}
            <Animated.View
              style={{
                width: BREATHE_CIRCLE,
                height: BREATHE_CIRCLE,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ scale: breatheScale }],
              }}
              accessibilityLabel="Breathing guide"
            >
              <View
                style={{
                  width: BREATHE_CIRCLE,
                  height: BREATHE_CIRCLE,
                  borderRadius: BREATHE_CIRCLE / 2,
                  backgroundColor: theme.colors.surface,
                  opacity: 0.9,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text variant="heading">{secondsLeft}</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* ---- prompt ---- */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            look 20 ft away · breathe
          </Text>
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Close or go back to skip
          </Text>
        </View>
      </View>
    </Screen>
  );
}
