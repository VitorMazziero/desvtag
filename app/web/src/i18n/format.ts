// Formatação numérica de APRESENTAÇÃO por idioma (U17). O valor calculado não muda:
// o arredondamento vale apenas para o texto exibido.
import type { Language } from "./index";

const formatters = new Map<string, Intl.NumberFormat>();
function formatter(
  language: Language,
  digits: number,
  notation: "standard" | "scientific" = "standard",
) {
  const key = `${language}:${digits}:${notation}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.NumberFormat(language, {
      maximumSignificantDigits: digits,
      useGrouping: false,
      notation,
    });
    if (formatters.size >= 64) {
      const oldest = formatters.keys().next().value;
      if (oldest !== undefined) formatters.delete(oldest);
    }
    formatters.set(key, found);
  }
  return found;
}

/** Até 10 algarismos significativos, sem zeros finais, com o separador decimal do idioma. */
export function formatNumber(value: number, language: Language): string {
  return formatter(language, 10).format(value);
}

/** Tooltip/accessibility precision; same presentation as the original 17-digit formatter. */
export function formatFull(value: number, language: Language): string {
  return formatter(language, 17).format(value);
}

/** `digits` algarismos significativos (apresentação em tabelas). */
export function formatSignificant(value: number, language: Language, digits = 6): string {
  // Scientific notation is presentation only; raw values and exports retain full precision.
  const magnitude = Math.abs(value);
  const scientific = magnitude >= 1e12 || (magnitude > 0 && magnitude < 1e-6);
  return formatter(language, digits, scientific ? "scientific" : "standard")
    .format(value)
    .replace("E", "e");
}

/** Valor-p: 4 algarismos significativos; abaixo de 1e-4, notação científica com o separador do idioma. */
export function formatP(value: number, language: Language): string {
  if (value === 0) return "0";
  if (value >= 1e-4) return formatSignificant(value, language, 4);
  const [mantissa = "", exponent = ""] = value.toExponential(3).split("e");
  const decimal = formatter(language, 10).format(1.1)[1] ?? ".";
  return `${mantissa.replace(".", decimal)}e${exponent}`;
}

/** Estatística de teste ou resumo: quatro algarismos, sem alterar o valor guardado. */
export function formatStatistic(value: number, language: Language): string {
  return formatSignificant(value, language, 4);
}
