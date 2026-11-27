export type ThemeId =
  | "classic"
  | "dark"
  | "music"
  | "gaming"
  | "blush"
  | "meme"
  | "breaking-bad";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  category: string;
  description: string;
  isDark: boolean;
  swatches: {
    canvas: string;
    surface: string;
    primary: string;
    secondary: string;
  };
}

export const THEME_STORAGE_KEY = "ringrise-theme";
export const DEFAULT_THEME_ID: ThemeId = "classic";

export const APP_THEMES: ThemeDefinition[] = [
  {
    id: "classic",
    name: "Classic Light",
    category: "Default",
    description: "Clean crisp light workspace",
    isDark: false,
    swatches: {
      canvas: "#F6F9FC",
      surface: "#FFFFFF",
      primary: "#0077B6",
      secondary: "#0A2540",
    },
  },
  {
    id: "dark",
    name: "Midnight Dark",
    category: "Dark",
    description: "Sleek obsidian dark mode",
    isDark: true,
    swatches: {
      canvas: "#090E1A",
      surface: "#111827",
      primary: "#38BDF8",
      secondary: "#6366F1",
    },
  },
  {
    id: "music",
    name: "Vinyl Studio",
    category: "Music",
    description: "Vinyl deck backdrop & stage neon",
    isDark: true,
    swatches: {
      canvas: "#0E0918",
      surface: "#171126",
      primary: "#EC4899",
      secondary: "#8B5CF6",
    },
  },
  {
    id: "gaming",
    name: "Cyber Arcade",
    category: "Gaming",
    description: "GTA 6 backdrop & cyber neon",
    isDark: true,
    swatches: {
      canvas: "#070B12",
      surface: "#0F1724",
      primary: "#00E599",
      secondary: "#06B6D4",
    },
  },
  {
    id: "blush",
    name: "Sakura Blush",
    category: "Rose",
    description: "Sakura blossom pattern & rose glow",
    isDark: false,
    swatches: {
      canvas: "#FFF6F9",
      surface: "#FFFFFF",
      primary: "#E11D74",
      secondary: "#F472B6",
    },
  },
  {
    id: "meme",
    name: "Tom & Jerry",
    category: "Memes",
    description: "Tom & Jerry memes backdrop",
    isDark: true,
    swatches: {
      canvas: "#0D0F14",
      surface: "#161922",
      primary: "#84CC16",
      secondary: "#FACC15",
    },
  },
  {
    id: "breaking-bad",
    name: "Breaking Bad",
    category: "TV",
    description: "Heisenberg lab, hazmat gold & crystal",
    isDark: true,
    swatches: {
      canvas: "#090C0A",
      surface: "#121814",
      primary: "#22C55E",
      secondary: "#EAB308",
    },
  },
];

export function isValidThemeId(value: string | null | undefined): value is ThemeId {
  return APP_THEMES.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0];
}
