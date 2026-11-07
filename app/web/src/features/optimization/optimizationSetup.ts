// Montagem do pedido de otimização a partir do estado digitado (sem estatística): objetivos padrão
// a partir do menor e do maior valor observado, pedido ao motor, assinatura e linhas de confirmação.
import type {
  ConfirmationPlan,
  Evaluation,
  Goal,
  OptimizationRequest,
  OptimizationSetup,
  ResponseGoal,
} from "../../services/engine";
import type { ProjectState, RowDraft } from "../../state/project";
import { buildDataset, responseTerms, surfaceFactors } from "../analysis";

export type GoalType = Goal["type"];
export const GOAL_TYPES: GoalType[] = ["maximize", "minimize", "target", "range"];

/** Menor e maior valor digitado de uma resposta (apenas para sugerir limites do objetivo). */
export function observedRange(state: ProjectState, responseId: string): [number, number] {
  const { dataset } = buildDataset(state);
  const index = dataset.responses.findIndex((r) => r.id === responseId);
  const values = dataset.observations
    .map((o) => o.responses[index])
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return [0, 1];
  const [low, high] = [Math.min(...values), Math.max(...values)];
  return high > low ? [low, high] : [low, low + 1];
}

/** Objetivo padrão de um tipo, com limites sugeridos pelo intervalo observado da resposta. */
export function defaultGoal(type: GoalType, range: [number, number]): Goal {
  const [low, high] = range;
  const mid = (low + high) / 2;
  switch (type) {
    case "maximize":
      return { type, low, target: high, shape: 1 };
    case "minimize":
      return { type, target: low, high, shape: 1 };
    case "target":
      return { type, low, target: mid, high, shapeLow: 1, shapeHigh: 1 };
    case "range":
      return { type, low: low + (high - low) / 4, high: high - (high - low) / 4 };
  }
}

/** Configuração inicial: a resposta analisada, maximizar, região experimental, 40 inícios. */
export function defaultSetup(state: ProjectState): OptimizationSetup {
  const first = state.analysis.responseId ?? state.responses[0]?.id ?? null;
  return {
    responses: first
      ? [
          {
            responseId: first,
            terms: [],
            goal: defaultGoal("maximize", observedRange(state, first)),
            importance: 1,
          },
        ]
      : [],
    limits: [],
    domain: { type: "region" },
    search: { starts: 40, seed: 20261101, maxCandidates: 5, clusterTolerance: 0.05 },
    alpha: state.analysis.alpha,
  };
}

/** A configuração com o modelo escolhido de cada resposta (a otimização usa o modelo da análise). */
export function effectiveSetup(state: ProjectState, setup: OptimizationSetup): OptimizationSetup {
  return {
    ...setup,
    responses: setup.responses.map((g) => ({ ...g, terms: responseTerms(state, g.responseId) })),
  };
}

export function buildOptimizationRequest(
  state: ProjectState,
  setup: OptimizationSetup,
): OptimizationRequest {
  return {
    dataset: buildDataset(state).dataset,
    block: state.analysis.surfaceBlock ?? undefined,
    factors: surfaceFactors(state),
    setup: effectiveSetup(state, setup),
  };
}

/** Assinatura dos dados e da configuração: muda quando qualquer entrada do resultado muda. */
export function optimizationSignature(state: ProjectState, setup: OptimizationSetup): string {
  const { dataset } = buildDataset(state);
  return JSON.stringify([
    "optimization",
    dataset,
    surfaceFactors(state),
    effectiveSetup(state, setup),
    ...(state.analysis.surfaceBlock ? [state.analysis.surfaceBlock] : []),
  ]);
}

/** Valor real com 5 algarismos significativos, como texto da grade (ponto decimal). */
export function roundedReal(value: number): number {
  return Number(value.toPrecision(5));
}

/** Linhas do experimento de confirmação: uma por ponto e repetição, respostas em branco. */
export function confirmationRows(
  state: ProjectState,
  points: number[][],
  replicates: number,
  factorIds: string[] = state.factors
    .filter((factor) => factor.kind === "numeric")
    .map((factor) => factor.id),
): RowDraft[] {
  const rows: RowDraft[] = [];
  for (const point of points) {
    for (let r = 0; r < replicates; r++) {
      rows.push({
        id: `o${rows.length + 1}`,
        unitId: "",
        factors: state.factors.map((factor) => {
          if (factor.id === state.analysis.surfaceBlock?.factorId)
            return state.analysis.surfaceBlock.reference;
          const index = factorIds.indexOf(factor.id);
          return index >= 0 && point[index] !== undefined ? String(point[index]) : "";
        }),
        responses: state.responses.map(() => ""),
      });
    }
  }
  return rows;
}

const bound = (stat: { status: string; value?: number }): number | null =>
  stat.status === "defined" && typeof stat.value === "number" ? stat.value : null;

/** Previsões gravadas (intervalo de predição) para cada linha e resposta otimizada. */
export function confirmationPlan(
  evaluation: Evaluation,
  responseGoals: ResponseGoal[],
  rows: RowDraft[],
  replicates: number,
  alpha: number,
): ConfirmationPlan {
  const predictions: ConfirmationPlan["predictions"] = [];
  rows.forEach((row, index) => {
    const point = evaluation.points[Math.floor(index / replicates)];
    if (!point) return;
    for (const p of point.predictions) {
      if (!responseGoals.some((g) => g.responseId === p.responseId)) continue;
      const fitted = bound(p.prediction.fitted);
      if (fitted === null) continue;
      predictions.push({
        rowId: row.id,
        responseId: p.responseId,
        predicted: fitted,
        lower: bound(p.prediction.predictionLower),
        upper: bound(p.prediction.predictionUpper),
      });
    }
  });
  return {
    confidenceLevel: 1 - alpha,
    predictions,
    ...(evaluation.block ? { block: evaluation.block } : {}),
  };
}
