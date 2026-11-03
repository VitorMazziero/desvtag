// Conferência dos campos da calculadora de potência ANTES de chamar o motor (UX44): o motor valida
// do mesmo jeito, mas o usuário vê o problema junto do campo e não um erro genérico. Os códigos são
// os do motor (`power.*`), com texto em `diagnostics`.
export type PowerKind = "anova" | "oneSampleT" | "pairedT" | "twoSampleT";
export type PowerGoalKind = "sampleSizeFor" | "powerAt" | "precisionFor";

export type PowerField = "means" | "difference" | "sigma" | "alpha" | "target" | "n" | "halfWidth";

export interface PowerInputs {
  kind: PowerKind;
  goal: PowerGoalKind;
  means: string;
  difference: string;
  sigma: string;
  alpha: string;
  target: string;
  n: string;
  halfWidth: string;
}

/** Número digitado (vírgula ou ponto decimal); texto vazio ou inválido vira NaN, nunca zero. */
export function parseInput(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

export function parseMeans(text: string): number[] {
  return text
    .split(/[;\n]+/)
    .filter((part) => part.trim() !== "")
    .map(parseInput);
}

const between01 = (v: number) => Number.isFinite(v) && v > 0 && v < 1;

/** Problemas por campo (código `power.*` do motor); vazio quando os campos estão válidos. */
export function validatePower(input: PowerInputs): Partial<Record<PowerField, string>> {
  const problems: Partial<Record<PowerField, string>> = {};
  const sigma = parseInput(input.sigma);
  if (!(Number.isFinite(sigma) && sigma > 0)) problems.sigma = "power.invalid_sigma";
  if (!between01(parseInput(input.alpha))) problems.alpha = "power.invalid_alpha";

  const precision = input.goal === "precisionFor";
  if (input.kind === "anova") {
    const means = parseMeans(input.means);
    if (means.length < 2 || means.some((m) => !Number.isFinite(m)))
      problems.means = "power.invalid_means";
    else if (means.every((m) => m === means[0])) problems.means = "power.no_effect";
  } else if (!precision) {
    const difference = parseInput(input.difference);
    if (!Number.isFinite(difference)) problems.difference = "power.invalid_difference";
    else if (difference === 0) problems.difference = "power.no_effect";
  }

  if (input.goal === "sampleSizeFor" && !between01(parseInput(input.target)))
    problems.target = "power.invalid_target";
  if (input.goal === "powerAt") {
    const n = parseInput(input.n);
    if (!(Number.isFinite(n) && Number.isInteger(n) && n >= 2)) problems.n = "power.invalid_n";
  }
  if (precision) {
    const half = parseInput(input.halfWidth);
    if (!(Number.isFinite(half) && half > 0)) problems.halfWidth = "power.invalid_half_width";
  }
  return problems;
}

/** Assinatura das entradas que importam para o resultado atual (campos escondidos não contam). */
export function powerSignature(input: PowerInputs, twoSided: boolean): string {
  const base = [input.kind, input.goal, input.sigma.trim(), input.alpha.trim()];
  const kindFields = input.kind === "anova" ? [input.means.trim()] : [input.difference.trim()];
  const goalFields =
    input.goal === "sampleSizeFor"
      ? [input.target.trim()]
      : input.goal === "powerAt"
        ? [input.n.trim()]
        : [input.halfWidth.trim()];
  return JSON.stringify([
    ...base,
    ...(input.goal === "precisionFor" ? [] : kindFields),
    ...goalFields,
    twoSided,
  ]);
}
