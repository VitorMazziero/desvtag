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

/** `digits` algarismos significativos (apresentação em tabelas). */
export function formatSignificant(value: number, language: Language, digits = 6): string {
  return new Intl.NumberFormat(language, {
    maximumSignificantDigits: digits,
    useGrouping: false,
  }).format(value);
}

/** Valor-p: 4 algarismos significativos; abaixo de 1e-4, notação científica com o separador do idioma. */
export function formatP(value: number, language: Language): string {
  if (value === 0) return "0";
  if (value >= 1e-4) return formatSignificant(value, language, 4);
  const [mantissa = "", exponent = ""] = value.toExponential(3).split("e");
  const decimal = new Intl.NumberFormat(language, { useGrouping: false }).format(1.1)[1] ?? ".";
  return `${mantissa.replace(".", decimal)}e${exponent}`;
}
