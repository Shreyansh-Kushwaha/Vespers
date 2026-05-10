/**
 * Vespers — design tokens.
 *
 * Mirrors frontend/tailwind.config.ts and frontend/app/globals.css. The palette
 * is "peach paper + deep navy ink": a warm, lit page set against a navy brand
 * that doubles as the calligraphic accent color (the script "Vespers" wordmark
 * is rendered in this navy, gradient-clipped to a slightly darker navy on web).
 *
 * Mobile drops the gradient and uses the solid navy for the wordmark — visually
 * indistinguishable on a phone, and avoids a SkiaText/SVG mask dependency.
 */
export const colors = {
  paper: "#FFE6C9", // warm peach-orange page
  paperDeep: "#FBD3A8", // deeper peach for surfaces and hover
  ink: "#0B1A33", // primary navy text
  inkSoft: "#1F2B47", // secondary text
  margin: "#7A6651", // warm brown-grey for margin notes / eyebrows
  rule: "rgba(11,26,51,0.12)", // hairline divider
  ruleStrong: "rgba(11,26,51,0.22)", // chat scrollbar tone, stronger separators
  aubergine: "#0B2545", // BRAND deep navy — used for script wordmark and accents
  violetInk: "#061633", // darker navy for pressed state
  blush: "#F4C9B5", // warm peach accent surface
} as const;

/**
 * Typography. The four families load through expo-google-fonts at runtime;
 * the names below match the keys exported by those packages so RN's
 * `fontFamily` prop accepts them directly.
 *
 * Weight is encoded in the family name (e.g. Fraunces_500Medium) rather than
 * via fontWeight, because react-native does not consistently resolve weight
 * across loaded variants on Android.
 */
export const fonts = {
  // Allura — calligraphic script. Wordmark + accent words ("weighing", "quiet", "yours").
  script: "Allura_400Regular",
  // Fraunces — serif display. Headings, body, italic emphasis.
  display: "Fraunces_400Regular",
  displayItalic: "Fraunces_400Regular_Italic",
  displayMedium: "Fraunces_500Medium",
  // Inter — sans body and small UI labels.
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  // JetBrains Mono — eyebrows (uppercase, letter-spaced) and the recovery code.
  mono: "JetBrainsMono_400Regular",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

/**
 * Eyebrow recipe. Mirrors `.eyebrow` in globals.css:
 *   font-family: var(--font-mono)
 *   font-size: 11px
 *   letter-spacing: 0.22em
 *   text-transform: uppercase
 *   color: #7A6651
 */
export const eyebrow = {
  fontFamily: fonts.mono,
  fontSize: 11,
  letterSpacing: 2.4, // ~0.22em at 11px
  textTransform: "uppercase" as const,
  color: colors.margin,
};
