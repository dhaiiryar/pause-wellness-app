/**
 * Persisted app settings.
 *
 * This is the forward-looking contract from the PRD. Slice 01 only uses
 * `themeMode` (via the ThemeProvider); the remaining fields are wired up in
 * later slices (onboarding, reminders, scheduling). Defining the full shape
 * now keeps later slices additive.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

export type Settings = {
  activeHoursStart: string; // "08:00"
  activeHoursEnd: string; // "21:00"
  waterGoalGlasses: number; // default 8
  soundEnabled: boolean;
  themeMode: ThemeMode;
  eyeEnabled: boolean;
  eyePaused: boolean;
  waterEnabled: boolean;
  waterPaused: boolean;
  onboardingComplete: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  activeHoursStart: '08:00',
  activeHoursEnd: '21:00',
  waterGoalGlasses: 8,
  soundEnabled: true,
  themeMode: 'system',
  eyeEnabled: true,
  eyePaused: false,
  waterEnabled: true,
  waterPaused: false,
  onboardingComplete: false,
};
