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
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  theme: getThemeDefinition(DEFAULT_THEME_ID),
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
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof document !== "undefined") {
      const fromDom = document.documentElement.dataset.theme;
      if (isValidThemeId(fromDom)) return fromDom;
    }
    return DEFAULT_THEME_ID;
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      const next = isValidThemeId(saved) ? saved : DEFAULT_THEME_ID;
      setThemeIdState(next);
      applyThemeToDocument(next);
    } catch {
      applyThemeToDocument(DEFAULT_THEME_ID);
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
      setThemeId,
    }),
    [themeId, theme, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme={theme.isDark ? "dark" : "light"}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
