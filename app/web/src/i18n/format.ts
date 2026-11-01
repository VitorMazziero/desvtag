// Formatação numérica de APRESENTAÇÃO por idioma (U17). O valor calculado não muda:
// o arredondamento vale apenas para o texto exibido.
import type { Language } from "./index";

/** Até 10 algarismos significativos, sem zeros finais, com o separador decimal do idioma. */
export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language, {
    maximumSignificantDigits: 10,
    useGrouping: false,
  }).format(value);
}
