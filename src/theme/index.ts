import {
  createDarkTheme,
  createLightTheme,
  teamsHighContrastTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";

/** Arctic Mint. Step 100 is #70A995 (the primary brand surface, 6.9:1 with Carbon text); step 140 is Mint Light #CFECE4. */
export const lifeOSBrand: BrandVariants = {
  10: "#08120F",
  20: "#0E201B",
  30: "#152E26",
  40: "#1D3E34",
  50: "#274F42",
  60: "#316353",
  70: "#3C7763",
  80: "#4B8B76",
  90: "#5B9F88",
  100: "#70A995",
  110: "#83B9A6",
  120: "#95CBB8",
  130: "#ADDCCB",
  140: "#CFECE4",
  150: "#E1F4ED",
  160: "#F0F9F6",
};

/** Cool mint-tinted canvas (#F2F5F3) with white cards. Mint surfaces carry Carbon text; mint text uses the deeper steps. */
export const lifeOSLightTheme: Theme = {
  ...createLightTheme(lifeOSBrand),
  colorNeutralBackground1: "#FFFFFF",
  colorNeutralBackground2: "#F2F5F3",
  colorNeutralBackground3: "#E6EEEA",
  colorNeutralBackground4: "#DCE6E1",
  colorNeutralBackground5: "#D0DCD6",
  colorNeutralBackground6: "#C4D2CB",
  colorNeutralForeground1: "#0F1413",
  colorNeutralForeground2: "#3A4540",
  colorNeutralForeground3: "#55625C",
  colorNeutralStroke1: "#C7D4CE",
  colorNeutralStroke2: "#DDE7E2",
  colorNeutralStroke3: "#E6EEEA",
  colorNeutralForegroundOnBrand: "#0F1413",
  colorBrandBackground: "#70A995",
  colorBrandBackgroundHover: "#5F9C86",
  colorBrandBackgroundPressed: "#4E8873",
  colorBrandBackgroundSelected: "#5F9C86",
  colorBrandBackground2: "#DCEFE8",
  colorBrandForeground1: "#2B6A57",
  colorBrandForeground2: "#235A49",
  colorBrandForegroundLink: "#2B6A57",
  colorBrandStroke1: "#4E8873",
  colorCompoundBrandStroke: "#4E8873",
};

/** Carbon canvas (#0F1413) with Surface cards (#171C1B) and Arctic Mint accents. */
export const lifeOSDarkTheme: Theme = {
  ...createDarkTheme(lifeOSBrand),
  colorNeutralBackground1: "#171C1B",
  colorNeutralBackground2: "#0F1413",
  colorNeutralBackground3: "#0B1110",
  colorNeutralBackground4: "#080C0B",
  colorNeutralBackground5: "#050807",
  colorNeutralBackground6: "#2A3330",
  colorNeutralForeground1: "#EEF5F2",
  colorNeutralForeground2: "#BFCCC6",
  colorNeutralForeground3: "#93A29B",
  colorNeutralStroke1: "#2A3330",
  colorNeutralStroke2: "#222B28",
  colorNeutralStroke3: "#1B2321",
  colorNeutralForegroundOnBrand: "#0F1413",
  colorBrandBackground: "#70A995",
  colorBrandBackgroundHover: "#82B9A5",
  colorBrandBackgroundPressed: "#5F9C86",
  colorBrandBackgroundSelected: "#82B9A5",
  colorBrandBackground2: "#1B2E27",
  colorBrandForeground1: "#8EC5B0",
  colorBrandForeground2: "#A7D6C5",
  colorBrandForegroundLink: "#8EC5B0",
  colorBrandStroke1: "#70A995",
  colorCompoundBrandStroke: "#70A995",
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
