/// <reference types="jest" />
import { render } from '@testing-library/react-native';

import { LoadingScreen } from '../../src/components/LoadingScreen';
import { ThemeProvider } from '../../src/theme';

describe('LoadingScreen', () => {
  it('renders the default message', async () => {
    const { getByText } = await render(
      <ThemeProvider mode="light">
        <LoadingScreen />
      </ThemeProvider>,
    );
    expect(getByText('Just a moment')).toBeTruthy();
  });

  it('renders a custom message', async () => {
    const { getByText } = await render(
      <ThemeProvider mode="light">
        <LoadingScreen message="Loading stats" />
      </ThemeProvider>,
    );
    expect(getByText('Loading stats')).toBeTruthy();
  });
});
