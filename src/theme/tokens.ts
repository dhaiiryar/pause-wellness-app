/**
 * Pause theme tokens.
 *
 * Light theme: soft sage & warm sand — cream background, sand surfaces,
 * sage primary, terracotta accent, charcoal-green text.
 * Dark theme: charcoal-green background, deeper sage surfaces, light sage text.
 *
 * Tokens are consumed via the ThemeProvider / useTheme. Components read
 * `theme.colors.*`, `theme.spacing.*`, `theme.typography.*`, `theme.radii.*`
 * so that light/dark swap automatically with the system setting.
 */

export const light = {
  colors: {
    // surfaces
    background: '#F4F1EA', // warm cream
    surface: '#EAE3D2', // warm sand
    surfaceAlt: '#E0D8C4', // deeper sand for cards/inputs
    // brand
    primary: '#8EB9A3', // soft sage
    primaryDeep: '#6FA58A', // deeper sage (pressed/active)
    accent: '#C98B6B', // terracotta
    // text
    text: '#2C3A33', // charcoal-green
    textMuted: '#53605A', // muted charcoal-green, 4.5:1 on surfaceAlt
    textOnPrimary: '#1B2A22', // dark text on sage
    primaryText: '#4E6254', // darker sage for text on light backgrounds (5.8:1 on cream, 4.6:1 on surfaceAlt)
    // lines & feedback
    border: '#D8CFBC', // sand border
    overlay: 'rgba(44, 58, 51, 0.35)', // calm scrim for modals
  },
};

export const dark = {
  colors: {
    background: '#1B2A22', // charcoal-green
    surface: '#243629', // deeper charcoal-green
    surfaceAlt: '#2C4233', // deepest sage-tinted surface
    primary: '#8EB9A3', // soft sage (consistent brand)
    primaryDeep: '#A7CDBA', // lighter sage for pressed/active on dark
    accent: '#D6A187', // warm terracotta, lifted for dark
    text: '#E6EDE7', // light sage-white
    textMuted: '#A8B6AC', // muted light sage
    textOnPrimary: '#1B2A22', // dark text on sage stays readable
    primaryText: '#8EB9A3', // soft sage reads well on dark backgrounds
    border: '#3A4F40', // sage-tinted border
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

/** Generous spacing scale — calm, not cramped. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Typography scale tied to Inter. Each weight is a separately-registered font
 * family (expo-font registers one family per file), so components set
 * `fontFamily` rather than `fontWeight`. Families are loaded in App.tsx via
 * `@expo-google-fonts/inter`.
 */
export const typography = {
  // font sizes
  caption: 14,
  body: 16,
  title: 18,
  heading: 24,
  display: 32,
  // font families (loaded in App.tsx) — light 300 / regular 400 / medium 500
  familyLight: 'Inter-Light',
  familyRegular: 'Inter-Regular',
  familyMedium: 'Inter-Medium',
} as const;

/** Corner radii — soft, rounded, calm. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type Theme = {
  colors: typeof light.colors;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
};

/** Build a full theme by merging a color palette with the shared scales. */
const makeTheme = (colors: typeof light.colors): Theme => ({
  colors,
  spacing,
  typography,
  radii,
});

export const lightTheme: Theme = makeTheme(light.colors);
export const darkTheme: Theme = makeTheme(dark.colors);
