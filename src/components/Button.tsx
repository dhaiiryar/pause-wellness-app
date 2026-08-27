import { type ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** accessibilityLabel defaults to label; pass an explicit one when the
   * visible label is ambiguous (e.g. an icon-only button). */
  accessibilityLabel?: string;
  /** Spoken after the label/state, describing what the button does. */
  accessibilityHint?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  children?: ReactNode;
};

/**
 * Calm, rounded, on-theme button. `primary` uses sage; `secondary` uses the
 * sand surface with a border; `ghost` is text-only. Press scales to 0.97.
 */
export function Button({
  label,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'primary',
  style,
  children,
}: ButtonProps) {
  const { theme } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        {
          backgroundColor: isGhost
            ? 'transparent'
            : isPrimary
              ? theme.colors.primary
              : theme.colors.surface,
          borderColor: isPrimary || isGhost ? 'transparent' : theme.colors.border,
          borderWidth: isPrimary || isGhost ? 0 : 1,
          borderRadius: theme.radii.lg,
          paddingVertical: isGhost ? theme.spacing.md : theme.spacing.lg,
          paddingHorizontal: theme.spacing.xl,
          alignItems: 'center',
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {children ?? (
        <Text
          style={{
            color: isGhost
              ? theme.colors.primaryText
              : isPrimary
                ? theme.colors.textOnPrimary
                : theme.colors.text,
            fontSize: theme.typography.body,
            fontFamily: theme.typography.familyMedium,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
