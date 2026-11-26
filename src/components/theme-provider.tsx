"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  getThemeDefinition,
  isValidThemeId,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/themes";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  mounted: boolean;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  theme: getThemeDefinition(DEFAULT_THEME_ID),
  mounted: false,
  setThemeId: () => {},
});

function applyThemeToDocument(id: ThemeId) {
  if (typeof document === "undefined") return;
  const def = getThemeDefinition(id);
  const root = document.documentElement;
  root.dataset.theme = def.id;
  root.dataset.themeMode = def.isDark ? "dark" : "light";
  root.classList.toggle("dark", def.isDark);
  root.style.colorScheme = def.isDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with DEFAULT_THEME_ID so SSR and initial client hydration always match.
  // Visual styles are already applied before paint by layout.tsx themeInitScript.
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      const fromDom = document.documentElement.dataset.theme;
      const next = isValidThemeId(saved)
        ? saved
        : isValidThemeId(fromDom)
          ? fromDom
          : DEFAULT_THEME_ID;
      setThemeIdState(next);
      applyThemeToDocument(next);
    } catch {
      applyThemeToDocument(DEFAULT_THEME_ID);
    } finally {
      setMounted(true);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY && isValidThemeId(event.newValue)) {
        setThemeIdState(event.newValue);
        applyThemeToDocument(event.newValue);
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setThemeId = useCallback((nextId: ThemeId) => {
    setThemeIdState(nextId);
    applyThemeToDocument(nextId);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextId);
    } catch {
      // Ignore storage quota / private mode failures
    }
  }, []);

  const theme = useMemo(() => getThemeDefinition(themeId), [themeId]);

  const value = useMemo(
    () => ({
      themeId,
      theme,
      mounted,
      setThemeId,
    }),
    [themeId, theme, mounted, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={5000}
        toastOptions={{ duration: 5000 }}
        theme={mounted && theme.isDark ? "dark" : "light"}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
