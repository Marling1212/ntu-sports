/**
 * Color theme presets for design-compare. Pick one to apply site-wide later.
 */
export type ColorThemeId = "current" | "forest" | "ocean" | "amber" | "slate";

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  nameZh: string;
  description: string;
  primary: string;
  primaryHover: string;
  surface: string;
  footerStart: string;
  footerEnd: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "current",
    name: "Current (NTU Green)",
    nameZh: "目前（NTU 綠）",
    description: "Existing palette: #00694E with darker footer.",
    primary: "#00694E",
    primaryHover: "#005a40",
    surface: "#f8faf9",
    footerStart: "#004d38",
    footerEnd: "#00694E",
  },
  {
    id: "forest",
    name: "Softer Forest",
    nameZh: "柔和森林綠",
    description: "Slightly lighter, calmer green.",
    primary: "#0d7a5c",
    primaryHover: "#0a6349",
    surface: "#f4f9f7",
    footerStart: "#065a44",
    footerEnd: "#0d7a5c",
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    nameZh: "海洋藍",
    description: "Blue accent; professional and calm.",
    primary: "#0e639c",
    primaryHover: "#0b4f7a",
    surface: "#f4f8fb",
    footerStart: "#0a4d73",
    footerEnd: "#0e639c",
  },
  {
    id: "amber",
    name: "Warm Amber",
    nameZh: "暖琥珀",
    description: "Warm, energetic; good for sports.",
    primary: "#b45309",
    primaryHover: "#924308",
    surface: "#faf8f5",
    footerStart: "#783a06",
    footerEnd: "#b45309",
  },
  {
    id: "slate",
    name: "Slate Neutral",
    nameZh: "石板灰",
    description: "Neutral gray; minimal and modern.",
    primary: "#475569",
    primaryHover: "#334155",
    surface: "#f8fafc",
    footerStart: "#1e293b",
    footerEnd: "#475569",
  },
];

export function getColorTheme(id: string): ColorTheme | undefined {
  return COLOR_THEMES.find((t) => t.id === id);
}
