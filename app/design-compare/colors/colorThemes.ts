/**
 * Color theme presets for design-compare. Pick one to apply site-wide later.
 */
export type ColorThemeId =
  | "current"
  | "forest"
  | "ocean"
  | "amber"
  | "slate"
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "pink"
  | "brown"
  | "gray"
  | "black"
  | "white";

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
  {
    id: "red",
    name: "Red",
    nameZh: "紅色",
    description: "Red accent; passionate and energetic.",
    primary: "#b91c1c",
    primaryHover: "#991b1b",
    surface: "#fafaf9",
    footerStart: "#7f1d1d",
    footerEnd: "#b91c1c",
  },
  {
    id: "blue",
    name: "Blue",
    nameZh: "藍色",
    description: "Blue accent; professional and calm.",
    primary: "#1e40af",
    primaryHover: "#1e3a8a",
    surface: "#fafaf9",
    footerStart: "#1e3a8a",
    footerEnd: "#1e40af",
  },
  {
    id: "green",
    name: "Green",
    nameZh: "綠色",
    description: "Green accent; natural and refreshing.",
    primary: "#166534",
    primaryHover: "#14532d",
    surface: "#fafaf9",
    footerStart: "#14532d",
    footerEnd: "#166534",
  },
  {
    id: "yellow",
    name: "Yellow",
    nameZh: "黃色",
    description: "Yellow accent; cheerful and warm.",
    primary: "#d97706",
    primaryHover: "#b45309",
    surface: "#fafaf9",
    footerStart: "#b45309",
    footerEnd: "#d97706",
  },
  {
    id: "purple",
    name: "Purple",
    nameZh: "紫色",
    description: "Purple accent; elegant and sophisticated.",
    primary: "#6b21a8",
    primaryHover: "#581c87",
    surface: "#fafaf9",
    footerStart: "#581c87",
    footerEnd: "#6b21a8",
  },  
  {
    id: "orange",
    name: "Orange",
    nameZh: "橙色",
    description: "Orange accent; warm and inviting.",
    primary: "#d97706",
    primaryHover: "#b45309",
    surface: "#fafaf9",
    footerStart: "#b45309",
    footerEnd: "#d97706",
  },
  {
    id: "pink",
    name: "Pink",
    nameZh: "粉色",
    description: "Pink accent; soft and feminine.",
    primary: "#db2777",
    primaryHover: "#be185d",
    surface: "#fdf2f8",
    footerStart: "#9d174d",
    footerEnd: "#db2777",
  },
  {
    id: "brown",
    name: "Brown",
    nameZh: "棕色",
    description: "Brown accent; natural and earthy.",
    primary: "#78350f",
    primaryHover: "#92400e",
    surface: "#fafaf9",
    footerStart: "#451a03",
    footerEnd: "#78350f",
  },
  {
    id: "gray",
    name: "Gray",
    nameZh: "灰色",
    description: "Gray accent; neutral and subtle.",
    primary: "#4b5563",
    primaryHover: "#374151",
    surface: "#f9fafb",
    footerStart: "#1f2937",
    footerEnd: "#4b5563",
  },
  {
    id: "black",
    name: "Black",
    nameZh: "黑色",
    description: "Black accent; bold and dramatic.",
    primary: "#171717",
    primaryHover: "#262626",
    surface: "#fafafa",
    footerStart: "#0a0a0a",
    footerEnd: "#171717",
  },
  {
    id: "white",
    name: "White",
    nameZh: "白色",
    description: "White accent; clean and minimal.",
    primary: "#fafafa",
    primaryHover: "#e5e7eb",
    surface: "#ffffff",
    footerStart: "#e5e7eb",
    footerEnd: "#fafafa",
  },
];

export function getColorTheme(id: string): ColorTheme | undefined {
  return COLOR_THEMES.find((t) => t.id === id);
}

/** Hex with alpha (e.g. #00694E -> #00694E1a for 10%). */
function hexWithAlpha(hex: string, alphaHex: string): string {
  return hex.length === 7 ? hex + alphaHex : hex;
}

/** Generate CSS to override ntu-green with theme primary (for design-compare demos). */
export function getThemeOverrideCss(theme: ColorTheme): string {
  const p10 = hexWithAlpha(theme.primary, "1a");
  const p20 = hexWithAlpha(theme.primary, "33");
  const p80 = hexWithAlpha(theme.primary, "cc");
  return `
[data-color-theme="${theme.id}"] .bg-ntu-green { background-color: ${theme.primary} !important; }
[data-color-theme="${theme.id}"] .bg-ntu-green\\/10 { background-color: ${p10} !important; }
[data-color-theme="${theme.id}"] .bg-ntu-green\\/20 { background-color: ${p20} !important; }
[data-color-theme="${theme.id}"] .bg-ntu-green\\/80 { background-color: ${p80} !important; }
[data-color-theme="${theme.id}"] .text-ntu-green { color: ${theme.primary} !important; }
[data-color-theme="${theme.id}"] .border-ntu-green,
[data-color-theme="${theme.id}"] .border-ntu-green\\/20 { border-color: ${theme.primary} !important; }
[data-color-theme="${theme.id}"] .from-ntu-green,
[data-color-theme="${theme.id}"] .from-ntu-green\\/20,
[data-color-theme="${theme.id}"] .from-ntu-green\\/80 { --tw-gradient-from: ${theme.primary} !important; --tw-gradient-to: ${theme.footerEnd} !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
[data-color-theme="${theme.id}"] .to-green-700,
[data-color-theme="${theme.id}"] .to-green-600,
[data-color-theme="${theme.id}"] .to-green-900 { --tw-gradient-to: ${theme.footerEnd} !important; }
[data-color-theme="${theme.id}"] .hover\\:text-ntu-green:hover { color: ${theme.primary} !important; }
[data-color-theme="${theme.id}"] .hover\\:border-ntu-green:hover { border-color: ${theme.primary} !important; }
`.trim();
}
