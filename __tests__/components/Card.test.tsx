/// <reference types="jest" />
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { Card } from '../../src/components/Card';
import { Text } from '../../src/components/Text';
import { ThemeProvider } from '../../src/theme';
import { lightTheme } from '../../src/theme/tokens';

describe('Card', () => {
  it('renders children', async () => {
    const { getByText } = await render(
      <ThemeProvider mode="light">
        <Card>
          <Text>Inside card</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(getByText('Inside card')).toBeTruthy();
  });

  it('applies surface background from the light theme', async () => {
    const { getByLabelText } = await render(
      <ThemeProvider mode="light">
        <Card accessibilityLabel="group">
          <Text>Content</Text>
        </Card>
      </ThemeProvider>,
    );
    const flat = StyleSheet.flatten(getByLabelText('group').props.style);
    expect(flat.backgroundColor).toBe(lightTheme.colors.surface);
    expect(flat.borderRadius).toBe(lightTheme.radii.lg);
  });
});
