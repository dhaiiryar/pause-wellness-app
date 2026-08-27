import { View } from 'react-native';

import { Card, DotGrid, LoadingScreen, Screen, Text } from '../components';
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
      <View style={{ flex: 1, gap: theme.spacing.xxl, paddingTop: theme.spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.xxxl,
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
              Eye breaks
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Text
              variant="display"
              accessibilityLabel={`${waterGlasses} water glasses today`}
            >
              {waterGlasses}
            </Text>
            <Text variant="caption" tone="muted">
              Water glasses
            </Text>
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="heading">This week</Text>
          <Card>
            <Text variant="title">Eye breaks</Text>
            <DotGrid feature="eye" today={date} recent={recent} />
          </Card>
          <Card>
            <Text variant="title">Water glasses</Text>
            <DotGrid feature="water" today={date} recent={recent} />
          </Card>
        </View>
      </View>
    </Screen>
  );
}
