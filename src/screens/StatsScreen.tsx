import { View } from 'react-native';

import { DotGrid, LoadingScreen, Screen, Text } from '../components';
import { useDailyLog } from '../state/DailyLogProvider';
import { useTheme } from '../theme';

/**
 * Stats tab: today's counts plus soft 7-day dot grids for eye breaks and
 * water glasses. No streak numbers, no targets — just a calm weekly pattern.
 */
export function StatsScreen() {
  const { theme } = useTheme();
  const { loading, date, eyeBreaks, waterGlasses, recent } = useDailyLog();

  if (loading) return <LoadingScreen />;

  return (
    <Screen>
      <View style={{ flex: 1, gap: theme.spacing.xxxl }}>
        {/* ---- today's counts ---- */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.heading,
              fontFamily: theme.typography.familyLight,
            }}
          >
            Today
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.caption,
                  fontFamily: theme.typography.familyRegular,
                }}
              >
                Eye breaks
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.display,
                  fontFamily: theme.typography.familyLight,
                }}
                accessibilityLabel={`${eyeBreaks} eye breaks today`}
              >
                {eyeBreaks}
              </Text>
            </View>

            <View style={{ gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.caption,
                  fontFamily: theme.typography.familyRegular,
                }}
              >
                Water glasses
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.display,
                  fontFamily: theme.typography.familyLight,
                }}
                accessibilityLabel={`${waterGlasses} water glasses today`}
              >
                {waterGlasses}
              </Text>
            </View>
          </View>
        </View>

        {/* ---- 7-day dot grids ---- */}
        <View style={{ gap: theme.spacing.xxl }}>
          <View style={{ gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.title,
                fontFamily: theme.typography.familyRegular,
              }}
            >
              Eye breaks
            </Text>
            <DotGrid feature="eye" today={date} recent={recent} />
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.typography.title,
                fontFamily: theme.typography.familyRegular,
              }}
            >
              Water glasses
            </Text>
            <DotGrid feature="water" today={date} recent={recent} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
