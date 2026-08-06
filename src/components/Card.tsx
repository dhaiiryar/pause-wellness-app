import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
  /** Optional a11y label for the surface when it groups content */
  accessibilityLabel?: string;
};

/**
 * Flat surface for grouping related content. No elevation/shadow — calm sand
 * fill with generous padding and soft corners.
 */
export function Card({ children, style, accessibilityLabel }: CardProps) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
