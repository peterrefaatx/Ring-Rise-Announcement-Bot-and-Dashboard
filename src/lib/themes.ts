export type ThemeId = "classic" | "dark" | "music" | "gaming" | "space" | "nature";

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
    description: "Stage neon & equalizer glow",
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
    description: "Tactical HUD & neon matrix",
    isDark: true,
    swatches: {
      canvas: "#070B12",
      surface: "#0F1724",
      primary: "#00E599",
      secondary: "#06B6D4",
    },
  },
  {
    id: "space",
    name: "Cosmic Nebula",
    category: "Space",
    description: "Deep indigo & solar starlight",
    isDark: true,
    swatches: {
      canvas: "#070A19",
      surface: "#111631",
      primary: "#818CF8",
      secondary: "#F59E0B",
    },
  },
  {
    id: "nature",
    name: "Botanical Zen",
    category: "Nature",
    description: "Fresh sage mist & emerald",
    isDark: false,
    swatches: {
      canvas: "#F2F6F1",
      surface: "#FAFDF9",
      primary: "#15803D",
      secondary: "#10B981",
    },
  },
];

export function isValidThemeId(value: string | null | undefined): value is ThemeId {
  return APP_THEMES.some((theme) => theme.id === value);
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0];
}
