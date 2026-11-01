// Idiomas da interface (U17). Chaves em inglês estável; valores em pt-BR e en.
import i18next, { type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import ptCommon from "./locales/pt-BR/common.json";

export const LANGUAGES = ["pt-BR", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const resources = {
  "pt-BR": { common: ptCommon },
  en: { common: enCommon },
} as const;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** Idioma do sistema no primeiro acesso: português do Brasil ou inglês. */
export function detectLanguage(systemLanguages: readonly string[]): Language {
  for (const tag of systemLanguages) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("pt")) return "pt-BR";
    if (lower.startsWith("en")) return "en";
  }
  return "en";
}

export function createI18n(language: Language): I18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}
