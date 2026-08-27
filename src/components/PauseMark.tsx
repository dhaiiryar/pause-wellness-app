import { View } from 'react-native';

import { useTheme } from '../theme';

type PauseMarkSize = 'sm' | 'md' | 'lg';

type PauseMarkProps = {
  color?: string;
  size?: PauseMarkSize;
};

const SIZES: Record<
  PauseMarkSize,
  { width: number; height: number; gap: number; radius: number }
> = {
  sm: { width: 5, height: 18, gap: 4, radius: 2 },
  md: { width: 8, height: 28, gap: 6, radius: 3 },
  lg: { width: 14, height: 48, gap: 10, radius: 6 },
};

/** Two rounded bars. The Pause mark. Decorative, hidden from TalkBack. */
export function PauseMark({ color, size = 'md' }: PauseMarkProps) {
  const { theme } = useTheme();
  const dim = SIZES[size];
  const fill = color ?? theme.colors.primaryDeep;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        gap: dim.gap,
        alignItems: 'center',
        height: dim.height,
      }}
    >
      <View
        style={{
          width: dim.width,
          height: dim.height,
          borderRadius: dim.radius,
          backgroundColor: fill,
        }}
      />
      <View
        style={{
          width: dim.width,
          height: dim.height,
          borderRadius: dim.radius,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}
