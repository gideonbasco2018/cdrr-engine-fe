/**
 * Central theme tokens for ApplicationCorrection components.
 * All components should import from here instead of hardcoding colors.
 *
 * Dark palette is intentionally muted / low-contrast — easy on the eyes.
 */

export const light = {
  // Page & surfaces
  pageBg:       "#F0EDE8",
  cardBg:       "#FFFFFF",
  cardBorder:   "#E2DDD8",
  cardShadow:   "0 1px 4px rgba(0,0,0,0.06)",
  inputBg:      "#F7F5F1",
  inputBorder:  "#DDD9D4",

  // Text
  textPrimary:   "#1C1A17",
  textSecondary: "#6B6560",
  textTertiary:  "#9E9890",
  textMuted:     "#B8B2AB",

  // Section header
  sectionTitle:  "#9E9890",
  sectionBorder: "#E2DDD8",

  // Fields
  fieldBg:      "#F7F5F1",
  fieldBorder:  "#DDD9D4",
  fieldText:    "#1C1A17",
  fieldNA:      "#B8B2AB",
  labelColor:   "#6B6560",

  // Accent / interactive
  accent:       "#2C5F8A",
  accentHover:  "#1E4A6E",

  // States
  successBg:    "#EAF3DE",
  successBorder:"#C0DD97",
  successText:  "#3B6D11",
  warnBg:       "#FDF3E3",
  warnBorder:   "#F9D88A",
  warnText:     "#7A4A0A",
  errorBg:      "#FEF2F2",
  errorBorder:  "#FCA5A5",
  errorText:    "#B91C1C",
  infoBg:       "#EFF6FF",
  infoBorder:   "#BFDBFE",
  infoText:     "#1D4ED8",

  // Footer / step
  footerBg:     "#FFFFFF",
  stepInactive: "#F0EDE8",
  stepLine:     "#E2DDD8",
};

export const dark = {
  // Page & surfaces — dark but not pitch black, easier on eyes
  pageBg:       "#141414",
  cardBg:       "#1E1E1E",
  cardBorder:   "#2C2C2C",
  cardShadow:   "0 1px 6px rgba(0,0,0,0.35)",
  inputBg:      "#181818",
  inputBorder:  "#2C2C2C",

  // Text — not pure white, softer
  textPrimary:   "#E8E4DF",
  textSecondary: "#9A9087",
  textTertiary:  "#6B6560",
  textMuted:     "#3D3935",

  // Section header
  sectionTitle:  "#585350",
  sectionBorder: "#2C2C2C",

  // Fields
  fieldBg:      "#181818",
  fieldBorder:  "#2C2C2C",
  fieldText:    "#E8E4DF",
  fieldNA:      "#3D3935",
  labelColor:   "#8A8480",

  // Accent / interactive
  accent:       "#4A90C4",
  accentHover:  "#5BA3D8",

  // States — desaturated so they don't scream
  successBg:    "#162212",
  successBorder:"#254D1A",
  successText:  "#6BAA3A",
  warnBg:       "#1E1608",
  warnBorder:   "#4A3510",
  warnText:     "#C49A3A",
  errorBg:      "#1E0E0E",
  errorBorder:  "#4A1A1A",
  errorText:    "#E07070",
  infoBg:       "#0E1825",
  infoBorder:   "#1A3A5C",
  infoText:     "#4A90C4",

  // Footer / step
  footerBg:     "#1E1E1E",
  stepInactive: "#252525",
  stepLine:     "#2C2C2C",
};

/** Returns the right token set based on darkMode boolean */
export const getTheme = (darkMode) => darkMode ? dark : light;