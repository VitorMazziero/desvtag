// Texto da equação do modelo (apresentação). Os coeficientes vêm do motor; aqui só há formatação.
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { EquationTerm } from "../../services/engine";

function termLabel(term: EquationTerm, names: string[]): string {
  const name = (i: number | undefined) => names[i ?? -1] ?? "?";
  switch (term.kind) {
    case "intercept":
      return "";
    case "linear":
      return name(term.factors[0]);
    case "square":
      return `${name(term.factors[0])}²`;
    case "interaction":
      return `${name(term.factors[0])}·${name(term.factors[1])}`;
  }
}

/** `ŷ = b0 + b1·A − b2·B² …`; termos indefinidos aparecem como «?». */
export function formatEquation(
  terms: EquationTerm[],
  names: string[],
  language: Language,
  prefix: string,
): string {
  const parts: string[] = [];
  for (const term of terms) {
    const c = term.coefficient.status === "defined" ? term.coefficient.value : null;
    if (term.kind === "intercept") {
      parts.push(c === null ? "?" : formatSignificant(c, language, 5));
      continue;
    }
    const sign = c !== null && c < 0 ? "−" : "+";
    const magnitude = c === null ? "?" : formatSignificant(Math.abs(c), language, 5);
    parts.push(`${sign} ${magnitude}·${termLabel(term, names)}`);
  }
  return `${prefix} = ${parts.join(" ")}`;
}
