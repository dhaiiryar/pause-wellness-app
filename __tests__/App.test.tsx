/// <reference types="jest" />
import { render } from '@testing-library/react-native';

import { InMemoryRepository } from '../src/data';

// Mock the async database factory so App.tsx never tries to open sqlite.
// The mock returns an InMemoryRepository — app code still consumes the
// Repository interface, so this exercises the real composition tree.
const { createRepository } = require('../src/data/createRepository');
jest.mock('../src/data/createRepository', () => ({
  createRepository: jest.fn(),
}));

import App from '../App';

/**
 * Slice 02 App tests. The App now gates on `onboardingComplete` — first
 * launch shows onboarding, subsequent launches go straight to Home.
 *
 * The `createRepository` mock lets us seed the gating decision without
 * touching sqlite.
 */
describe('App', () => {
  it('shows Home when onboarding is already complete', async () => {
    (createRepository as jest.Mock).mockResolvedValue(
      new InMemoryRepository({ onboardingComplete: true })
    );

    const { getByText } = await render(<App />);

    expect(getByText('Start Eye Rest')).toBeTruthy();
    expect(getByText('Log a glass')).toBeTruthy();
  });

  it('shows onboarding when onboarding is not complete', async () => {
    (createRepository as jest.Mock).mockResolvedValue(
      new InMemoryRepository({ onboardingComplete: false })
    );

    const { getByText } = await render(<App />);

    // The first onboarding step has a "Next" button (not "Begin" — the
    // button label is "Next" for steps 0–2).
    expect(getByText('Next')).toBeTruthy();
    // The step-0 title "Pause" is rendered in the heading font.
    expect(getByText('Pause')).toBeTruthy();
  });
});
