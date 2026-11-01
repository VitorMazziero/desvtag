// Linhas de tabela da comparação de um fator, derivadas do resultado do motor (sem cálculo novo).
// Servem à tela e à exportação CSV, que usa valores numéricos completos.
import type { OneWayResult, Stat } from "../../services/engine";
import type { Cell } from "../../services/export";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function anovaRows(r: OneWayResult): Cell[][] {
  const row = (source: string, a: OneWayResult["anova"]["between"], f?: Stat, p?: Stat): Cell[] => [
    source,
    a.df,
    num(a.sumSquares),
    num(a.meanSquare),
    f ? num(f) : null,
    p ? num(p) : null,
  ];
  return [
    row("between", r.anova.between, r.anova.f, r.anova.pValue),
    row("within", r.anova.within),
    row("total", r.anova.total),
  ];
}

export const ANOVA_HEADER = ["source", "df", "sum_squares", "mean_square", "f", "p_value"];

export function groupRows(r: OneWayResult): Cell[][] {
  return r.groups.map((g, i) => [
    g.label,
    g.n,
    num(g.mean),
    num(g.sd),
    num(g.stdError),
    num(g.ciLower),
    num(g.ciUpper),
    r.letters?.letters[i] ?? null,
  ]);
}

export const GROUP_HEADER = [
  "group",
  "n",
  "mean",
  "sd",
  "std_error",
  "ci_lower_pooled",
  "ci_upper_pooled",
  "letters",
];

export function pairRows(r: OneWayResult): Cell[][] {
  if (!r.tukey) return [];
  return r.tukey.comparisons.map((c) => [
    r.groups[c.groupA]?.label ?? String(c.groupA),
    r.groups[c.groupB]?.label ?? String(c.groupB),
    num(c.difference),
    num(c.stdError),
    num(c.qStatistic),
    num(c.pAdjusted),
    num(c.ciLower),
    num(c.ciUpper),
    c.significant === null ? "not_tested" : c.significant ? "different" : "not_different",
  ]);
}

export const PAIR_HEADER = [
  "group_a",
  "group_b",
  "difference",
  "std_error",
  "q",
  "p_adjusted",
  "ci_lower_simultaneous",
  "ci_upper_simultaneous",
  "result",
];
