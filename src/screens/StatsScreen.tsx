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
      <View style={{ flex: 1, gap: theme.spacing.xxxl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="heading">Today</Text>
          <Card>
            <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <Text variant="caption" tone="muted">
                  Eye breaks
                </Text>
                <Text
                  variant="display"
                  accessibilityLabel={`${eyeBreaks} eye breaks today`}
                >
                  {eyeBreaks}
                </Text>
              </View>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <Text variant="caption" tone="muted">
                  Water glasses
                </Text>
                <Text
                  variant="display"
                  accessibilityLabel={`${waterGlasses} water glasses today`}
                >
                  {waterGlasses}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="heading">This week</Text>
          <View style={{ gap: theme.spacing.lg }}>
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
      </View>
    </Screen>
  );
}
