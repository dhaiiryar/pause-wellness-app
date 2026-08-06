import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

type SettingsRowProps = {
  /** Primary label text */
  label: string;
  /** Optional secondary line under the label */
  description?: string;
  /** Right-side control (Switch, TextInput, etc.) */
  children: ReactNode;
  /**
   * When set, the row is a Pressable that toggles via this callback
   * (used for Switch rows so the whole row is tappable). When omitted,
   * the row is a non-pressable View (used for TextInput rows).
   */
  onPress?: () => void;
  /** When true, omit the bottom border (last row in a group). Default false. */
  last?: boolean;
};

/**
 * Settings list row: label (+ optional description) on the left, control on the
 * right. Pressable when `onPress` is set so Switch rows can be tapped anywhere.
 */
export function SettingsRow({
  label,
  description,
  children,
  onPress,
  last = false,
}: SettingsRowProps) {
  const { theme } = useTheme();

  const rowStyle = {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  };

  const content = (
    <>
      <View style={{ flexShrink: 1 }}>
        <Text variant="body">{label}</Text>
        {description != null ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </>
  );

  if (onPress != null) {
    return (
      <Pressable onPress={onPress} accessible={false} style={rowStyle}>
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}
