import { View } from 'react-native';

import { useTheme } from '../theme';
import { parseDateKey, previousDays, type DailyLog } from '../types/log';
import { Text } from './Text';

type Feature = 'eye' | 'water';

type DotGridProps = {
  feature: Feature;
  today: string;
  recent: DailyLog[];
  accessibilityLabel?: string;
};

const DOT_SIZE = 14;

/**
 * A soft 7-day dot grid for a single feature.
 *
 * - One dot per calendar day for the last 7 days (today-6 .. today), ordered
 *   left-to-right as a timeline.
 * - Filled when there was any activity that day; empty otherwise.
 * - No numbers, no streaks, no targets — just a calm visual pattern.
 * - Single-letter weekday labels under each dot (local timezone via date keys).
 */
export function DotGrid({ feature, today, recent, accessibilityLabel }: DotGridProps) {
  const { theme } = useTheme();
  const logsByDate = new Map(recent.map((log) => [log.date, log]));
  const days = previousDays(today, 7);

  const filledDays = days.filter((date) => {
    const log = logsByDate.get(date);
    if (!log) return false;
    return feature === 'eye' ? log.eyeBreaks > 0 : log.waterGlasses > 0;
  }).length;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={
        accessibilityLabel ??
        `${feature === 'eye' ? 'Eye breaks' : 'Water glasses'}: ${filledDays} of the last 7 days`
      }
      accessibilityValue={{ min: 0, max: 7, now: filledDays }}
      style={{ flexDirection: 'row', gap: theme.spacing.sm }}
    >
      {days.map((date) => {
        const log = logsByDate.get(date);
        const filled = log
          ? feature === 'eye'
            ? log.eyeBreaks > 0
            : log.waterGlasses > 0
          : false;
        const weekday = parseDateKey(date).toLocaleDateString(undefined, {
          weekday: 'narrow',
        });

        return (
          <View
            key={date}
            style={{ alignItems: 'center', gap: theme.spacing.xs }}
          >
            <View
              testID={`${feature}-dot-${date}`}
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
                backgroundColor: filled ? theme.colors.primary : 'transparent',
                borderWidth: 1,
                borderColor: filled ? theme.colors.primary : theme.colors.border,
              }}
            />
            <Text
              variant="caption"
              tone="muted"
              allowFontScaling={false}
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={{ fontSize: 11, lineHeight: 14 }}
            >
              {weekday}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
