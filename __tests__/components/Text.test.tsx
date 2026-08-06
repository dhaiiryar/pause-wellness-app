/// <reference types="jest" />
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { Text } from '../../src/components/Text';
import { ThemeProvider } from '../../src/theme';
import { lightTheme } from '../../src/theme/tokens';

async function renderText(props: React.ComponentProps<typeof Text> = {}) {
  return render(
    <ThemeProvider mode="light">
      <Text {...props}>Hello</Text>
    </ThemeProvider>,
  );
}

describe('Text', () => {
  it('renders children', async () => {
    const { getByText } = await renderText();
    expect(getByText('Hello')).toBeTruthy();
  });

  it('allows font scaling by default with a 1.5× cap', async () => {
    const { getByText } = await renderText();
    const node = getByText('Hello');
    expect(node.props.allowFontScaling).toBe(true);
    expect(node.props.maxFontSizeMultiplier).toBe(1.5);
  });

  it('applies heading size and muted color for variant+tone', async () => {
    const { getByText } = await renderText({ variant: 'heading', tone: 'muted' });
    const flat = StyleSheet.flatten(getByText('Hello').props.style);
    expect(flat.fontSize).toBe(lightTheme.typography.heading);
    expect(flat.fontFamily).toBe(lightTheme.typography.familyLight);
    expect(flat.color).toBe(lightTheme.colors.textMuted);
  });

  it('defaults to body / default tone styles', async () => {
    const { getByText } = await renderText();
    const flat = StyleSheet.flatten(getByText('Hello').props.style);
    expect(flat.fontSize).toBe(lightTheme.typography.body);
    expect(flat.fontFamily).toBe(lightTheme.typography.familyRegular);
    expect(flat.color).toBe(lightTheme.colors.text);
  });
});
