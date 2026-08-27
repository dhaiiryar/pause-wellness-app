import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme';

export type TextVariant = 'display' | 'heading' | 'title' | 'body' | 'caption';
export type TextTone = 'default' | 'muted' | 'primary' | 'onPrimary';

type TextProps = RNTextProps & {
  /** Typography scale key. Defaults to `body` so unstyled call sites stay calm. */
  variant?: TextVariant;
  /** Color role. Defaults to `default` (`colors.text`). */
  tone?: TextTone;
};

/**
 * Themed text wrapper that respects the user's system font scale.
 *
 * - `allowFontScaling` defaults to `true` so users with larger accessibility
 *   font sizes can read app copy.
 * - `maxFontSizeMultiplier` caps growth at 1.5× to keep the calm single-screen
 *   layouts from breaking at extreme font sizes.
 * - Optional `variant` / `tone` map onto theme typography and color tokens.
 *   Caller `style` wins last so existing styled call sites stay backward compatible.
 */
export function Text({
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.5,
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps) {
  const { theme } = useTheme();

  const fontSize =
    variant === 'display'
      ? theme.typography.display
      : variant === 'heading'
        ? theme.typography.heading
        : variant === 'title'
          ? theme.typography.title
          : variant === 'caption'
            ? theme.typography.caption
            : theme.typography.body;

  const fontFamily =
    variant === 'display' || variant === 'heading'
      ? theme.typography.familyLight
      : variant === 'title'
        ? theme.typography.familyMedium
        : theme.typography.familyRegular;

  const color =
    tone === 'muted'
      ? theme.colors.textMuted
      : tone === 'primary'
        ? theme.colors.primaryText
        : tone === 'onPrimary'
          ? theme.colors.textOnPrimary
          : theme.colors.text;

  const baseStyle: TextStyle = {
    fontSize,
    fontFamily,
    color,
  };

  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[baseStyle, style]}
      {...rest}
    />
  );
}
