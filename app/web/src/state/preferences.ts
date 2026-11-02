// Preferências por dispositivo (idioma e tema). Persistidas em localStorage com
// tolerância a falhas: sem armazenamento, o aplicativo continua funcionando.
import { useCallback, useEffect, useState } from "react";
import { detectLanguage, isLanguage, type Language } from "../i18n";

export const THEMES = [
  "soft-light",
  "modern-dark",
  "professional",
  "industrial",
  "organic",
  "clay",
] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "soft-light";

const LANGUAGE_KEY = "optima.language";
const THEME_KEY = "optima.theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Armazenamento indisponível (modo privado, cota): a preferência vale só nesta sessão.
  }
}

export interface Preferences {
  language: Language;
  theme: Theme;
}

/** Lê as preferências salvas; no primeiro acesso, detecta o idioma do sistema. */
export function loadPreferences(
  systemLanguages: readonly string[] = navigator.languages,
): Preferences {
  const savedLanguage = read(LANGUAGE_KEY);
  const savedTheme = read(THEME_KEY);
  return {
    language: isLanguage(savedLanguage) ? savedLanguage : detectLanguage(systemLanguages),
    theme: isTheme(savedTheme) ? savedTheme : DEFAULT_THEME,
  };
}

/** Aplica idioma e tema ao documento (atributos `lang` e `data-theme`). */
export function applyPreferences(preferences: Preferences): void {
  document.documentElement.lang = preferences.language;
  document.documentElement.dataset.theme = preferences.theme;
}

export function usePreferences(initial: Preferences) {
  const [preferences, setPreferences] = useState<Preferences>(initial);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  const setLanguage = useCallback((language: Language) => {
    write(LANGUAGE_KEY, language);
    setPreferences((p) => ({ ...p, language }));
  }, []);
  const setTheme = useCallback((theme: Theme) => {
    write(THEME_KEY, theme);
    setPreferences((p) => ({ ...p, theme }));
  }, []);

  return { preferences, setLanguage, setTheme };
}
