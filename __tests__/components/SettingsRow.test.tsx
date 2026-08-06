/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';

import { SettingsRow } from '../../src/components/SettingsRow';
import { ThemeProvider } from '../../src/theme';

async function renderRow(
  props: Partial<React.ComponentProps<typeof SettingsRow>> = {},
) {
  return render(
    <ThemeProvider mode="light">
      <SettingsRow label="Reminder sounds" {...props}>
        {props.children ?? <RNText>control</RNText>}
      </SettingsRow>
    </ThemeProvider>,
  );
}

describe('SettingsRow', () => {
  it('renders the label text', async () => {
    const { getByText } = await renderRow();
    expect(getByText('Reminder sounds')).toBeTruthy();
  });

  it('renders a description when provided', async () => {
    const { getByText } = await renderRow({
      description: 'Gentle 20-20-20 nudges during active hours',
    });
    expect(getByText('Gentle 20-20-20 nudges during active hours')).toBeTruthy();
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await renderRow({ onPress });
    // Pressable with accessible={false} is not found by role; press via label text
    fireEvent.press(getByText('Reminder sounds'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
