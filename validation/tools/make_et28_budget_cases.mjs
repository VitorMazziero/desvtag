// ET28 T04 (AU-P05): casos de carga das operações das ET25/ET26 para `measure_et24.mjs`.
// Só constrói dados (determinísticos); toda análise roda no motor real. Uso:
//   node make_et28_budget_cases.mjs <arquivo-de-saída.json>
// e depois `ET24_BENCH_CASES_FILE=<arquivo> node measure_et24.mjs web <pasta>` (WASM) ou o
// roteiro nativo com `NATIVE_PERFORMANCE_EVIDENCE`.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const json = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));

// Gerador pseudoaleatório determinístico (mulberry32): os casos são idênticos em toda execução.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cases = [];

// ---- ANOVA multifatorial com estimabilidade (AU-B20/B21) ----
const estimability = json("validation/cases/factorial_anova/estimability.json").cases[0];
cases.push({ name: "anova-small-2x3", operation: { type: "anovaFactorial", ...estimability.request } });

function anovaRequest({ levels, rows, order, marginals, contrasts = [], seed }) {
  const random = rng(seed);
  const factors = levels.map((count, i) => ({
    id: `F${i + 1}`,
    name: `F${i + 1}`,
    kind: "categorical",
    unit: null,
    levels: Array.from({ length: count }, (_, j) => `l${j + 1}`),
  }));
  const observations = Array.from({ length: rows }, (_, r) => {
    // Primeiras linhas percorrem as células na ordem para que cada nível apareça.
    const cell = levels.map((count, i) => (r < count ? r : Math.floor(random() * count)));
    const effect = cell.reduce((sum, level, i) => sum + Math.sin((i + 1) * (level + 1)), 0);
    return {
      id: `o${r + 1}`,
      unitId: null,
      factors: cell.map((level, i) => `l${level + 1}`),
      responses: [10 + effect + (random() - 0.5)],
    };
  });
  return {
    dataset: { factors, responses: [{ id: "y", name: "y", unit: null }], observations },
    responseId: "y",
    factorIds: factors.map((f) => f.id),
    blockId: null,
    interactionOrder: order,
    ssType: "typeIII",
    alpha: 0.05,
    marginals,
    contrasts,
  };
}
const mainFamilies = (count) =>
  Array.from({ length: count }, (_, i) => ({ factors: [`F${i + 1}`], adjustment: "tukey" }));
const pairFamilies = (count) =>
  Array.from({ length: count }, (_, i) =>
    Array.from({ length: count - i - 1 }, (_, k) => ({
      factors: [`F${i + 1}`, `F${i + k + 2}`],
      adjustment: "holm",
    })),
  ).flat();

cases.push({
  name: "anova-typical-4x3x3-order2",
  operation: {
    type: "anovaFactorial",
    ...anovaRequest({
      levels: [4, 3, 3],
      rows: 72,
      order: 2,
      marginals: [...mainFamilies(3), ...pairFamilies(3)],
      seed: 101,
    }),
  },
});
cases.push({
  name: "anova-limit-6-factors-additive",
  operation: {
    type: "anovaFactorial",
    ...anovaRequest({
      levels: [3, 3, 3, 3, 3, 3],
      rows: 1458,
      order: 1,
      marginals: [...mainFamilies(6), ...pairFamilies(6)],
      seed: 102,
    }),
  },
});
// Grade dos demais fatores de ~3 milhões de combinações: a média uniforme é fatorada, sem enumerar.
cases.push({
  name: "anova-limit-nuisance-grid-12to6",
  operation: {
    type: "anovaFactorial",
    ...anovaRequest({
      levels: [12, 12, 12, 12, 12, 12],
      rows: 600,
      order: 1,
      marginals: mainFamilies(6),
      seed: 103,
    }),
  },
});
// Limite de colunas (400) e de linhas (262.144/400): 20×20 com interação completa.
cases.push({
  name: "anova-limit-400-columns",
  operation: {
    type: "anovaFactorial",
    ...anovaRequest({
      levels: [20, 20],
      rows: 640,
      order: 2,
      marginals: mainFamilies(2),
      seed: 104,
    }),
  },
});
// Pedido além do orçamento: deve ser recusado de forma explícita e rápida, sem alocar a grade.
cases.push({
  name: "anova-over-budget-pairs",
  expectedIssue: "anova.resource_limit",
  operation: {
    type: "anovaFactorial",
    ...anovaRequest({
      levels: [20, 20],
      rows: 640,
      order: 2,
      marginals: [{ factors: ["F1", "F2"], adjustment: "holm" }],
      seed: 105,
    }),
  },
});

// ---- Misturas: modelo, traço de Cox e otimização no simplex (ET25 T03–T05) ----
const coxFixture = json("validation/cases/mixture_model/cox.json").cases[0].request;
cases.push({ name: "mixture-small-q2-cox", operation: { type: "mixtureAnalyze", ...coxFixture } });
const optimizationFixture = json("validation/cases/mixture_model/optimization.json").cases[0].request;
cases.push({ name: "mixture-typical-q3-optimum", operation: { type: "mixtureAnalyze", ...optimizationFixture } });

function mixtureRequest(q, points, model, seed, optimize) {
  const random = rng(seed);
  const proportions = Array.from({ length: q }, (_, i) =>
    Array.from({ length: q }, (_, j) => (i === j ? 1 : 0)),
  );
  while (proportions.length < points) {
    const draw = Array.from({ length: q }, () => -Math.log(1 - random()));
    const total = draw.reduce((a, b) => a + b, 0);
    proportions.push(draw.map((v) => v / total));
  }
  const response = proportions.map(
    (p) =>
      p.reduce((s, v, i) => s + (i + 1) * v, 0) +
      2 * p[0] * (p[1] ?? 0) -
      1.5 * p[q - 1] * p[q - 2] +
      0.05 * (random() - 0.5),
  );
  const request = {
    componentNames: Array.from({ length: q }, (_, i) => `C${i + 1}`),
    lowerBounds: Array(q).fill(0),
    upperBounds: Array(q).fill(1),
    coxReference: Array(q).fill(1 / q),
    proportions,
    response,
    model,
    alpha: 0.05,
  };
  if (optimize)
    request.optimization = {
      setup: {
        responses: [
          {
            responseId: "y1",
            terms: [],
            goal: { type: "maximize", low: 0, target: Math.max(...response), shape: 1.0 },
            importance: 1.0,
          },
        ],
        limits: [],
        domain: { type: "region" },
        search: { starts: 40, seed: 20261104, maxCandidates: 5, clusterTolerance: 0.01 },
        alpha: 0.05,
      },
      data: [{ responseId: "y1", name: "Y1", proportions, response }],
    };
  return request;
}
cases.push({ name: "mixture-typical-q5-quadratic", operation: { type: "mixtureAnalyze", ...mixtureRequest(5, 60, "quadratic", 201, false) } });
cases.push({ name: "mixture-limit-q8-quadratic", operation: { type: "mixtureAnalyze", ...mixtureRequest(8, 120, "quadratic", 202, false) } });
cases.push({ name: "mixture-limit-q8-optimum", operation: { type: "mixtureAnalyze", ...mixtureRequest(8, 120, "quadratic", 203, true) } });

// ---- Variância de predição (ET25 T07) e seleção de modelos de dois níveis (ET14/ET28 T03) ----
const variance = json("validation/cases/optimal_design/variance.json").cases;
const largest = variance.reduce((best, c) => (c.request.runsReal.length > best.request.runsReal.length ? c : best));
cases.push({ name: `variance-${largest.name}`, operation: { type: "designOptimalVariance", ...largest.request } });

const selection = json("validation/cases/two_level_model_selection/selection.json").cases;
for (const c of selection.filter((c) => /plackett-burman-12-quatro|fracionario-2-5-1/.test(c.id))) {
  const factors = Array.from({ length: c.k }, (_, i) => ({ id: `f${i + 1}`, name: `x${i + 1}`, low: c.low[i], high: c.high[i], unit: null }));
  cases.push({
    name: `selection-${c.id}`,
    operation: {
      type: "designSelectModel",
      dataset: {
        factors: factors.map((f) => ({ id: f.id, name: f.name, kind: "numeric", unit: null, levels: [] })),
        responses: [{ id: "y", name: "y", unit: null }],
        observations: c.real.map((row, i) => ({ id: `o${i + 1}`, unitId: null, factors: row, responses: [c.y[i]] })),
      },
      responseId: "y",
      spec: {
        kind: c.kind?.type === "fractional" ? { type: "fractional", generators: c.kind.generators } : c.kind?.type === "plackett_burman" ? { type: "plackettBurman", runs: c.kind.runs } : { type: "fullFactorial" },
        factors, replicates: 1, centerPoints: 0, randomize: false, seed: 1,
      },
      terms: [],
      alpha: c.alpha,
      includeCurvature: c.curvature,
    },
  });
}

const output = process.argv[2];
if (!output) throw new Error("Uso: node make_et28_budget_cases.mjs <saída.json>");
writeFileSync(resolve(output), JSON.stringify(cases));
console.log(`${cases.length} casos em ${output}: ${cases.map((c) => c.name).join(", ")}`);
