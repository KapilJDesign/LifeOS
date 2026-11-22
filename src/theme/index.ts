import {
  createDarkTheme,
  createLightTheme,
  teamsHighContrastTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";

/** Electric violet to deep indigo. Step 80 is the primary brand surface and keeps 4.5:1 with white text. */
export const lifeOSBrand: BrandVariants = {
  10: "#0B0623",
  20: "#160C42",
  30: "#1F1060",
  40: "#2A1580",
  50: "#361B9E",
  60: "#4421BB",
  70: "#5128D6",
  80: "#5B33E8",
  90: "#6B45F0",
  100: "#7B5BF3",
  110: "#8B71F5",
  120: "#9C88F7",
  130: "#AD9FF9",
  140: "#C0B6FA",
  150: "#D6CFFC",
  160: "#ECE8FE",
};

/** Warm off-white canvas with soft neutral card surfaces. */
export const lifeOSLightTheme: Theme = {
  ...createLightTheme(lifeOSBrand),
  colorNeutralBackground1: "#FFFFFF",
  colorNeutralBackground2: "#FAF8F5",
  colorNeutralBackground3: "#F4F1EC",
  colorNeutralBackground4: "#EFEBE5",
  colorNeutralBackground5: "#E9E4DD",
  colorNeutralBackground6: "#E3DDD5",
  colorNeutralForeground1: "#16141C",
  colorNeutralForeground2: "#3B3846",
  colorNeutralForeground3: "#5A5667",
};

/** Very dark charcoal canvas with a slight violet cast. */
export const lifeOSDarkTheme: Theme = {
  ...createDarkTheme(lifeOSBrand),
  colorNeutralBackground1: "#1A1920",
  colorNeutralBackground2: "#141319",
  colorNeutralBackground3: "#101015",
  colorNeutralBackground4: "#0C0C10",
  colorNeutralBackground5: "#08080B",
  colorNeutralBackground6: "#222129",
  colorNeutralForeground1: "#F4F2F8",
  colorNeutralForeground2: "#D2CFDA",
  colorNeutralForeground3: "#ADA9B8",
};

/** Fluent's built-in high-contrast theme; use it when `forced-colors: active` or the user chooses it. */
export const lifeOSHighContrastTheme: Theme = teamsHighContrastTheme;

export type ThemeName = "light" | "dark" | "high-contrast";

export const themes: Record<ThemeName, Theme> = {
  light: lifeOSLightTheme,
  dark: lifeOSDarkTheme,
  "high-contrast": lifeOSHighContrastTheme,
};

export interface ThemeEnvironment {
  prefersDark: boolean;
  forcedColors: boolean;
}

/** Forced colors always wins, then the explicit preference, then the OS setting. */
export function resolveThemeName(preference: "system" | "light" | "dark", env: ThemeEnvironment): ThemeName {
  if (env.forcedColors) return "high-contrast";
  if (preference === "system") return env.prefersDark ? "dark" : "light";
  return preference;
}
