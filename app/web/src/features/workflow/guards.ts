// Regras de acesso às etapas. Uma etapa só abre quando todas as anteriores estão
// satisfeitas; etapas já satisfeitas podem ser revisitadas diretamente. Alterar
// dados ou opções invalida a etapa de análise e bloqueia os resultados antigos.

import type { ProjectState } from "../../state/project";
import { analysisKind, inputSignature } from "../analysis/buildRequest";
import { resultFamilies, savedFamily } from "../results/savedFamily";
import { STEPS, type StepId } from "./steps";

export interface GuardContext {
  /** Quantidade de células ilegíveis na grade. */
  cellErrorCount: number;
  mixtureResultCurrent?: boolean;
}

export function resultIsCurrent(state: ProjectState): boolean {
  const saved = savedFamily(state);
  if (saved) return saved.current;
  if (state.mixture !== null) return false;
  return (
    state.result !== null &&
    state.result.kind === analysisKind(state) &&
    state.result.signature === inputSignature(state)
  );
}

/** A etapa está satisfeita (seu trabalho está feito e válido)? */
export function stepSatisfied(step: StepId, state: ProjectState, ctx: GuardContext): boolean {
  switch (step) {
    case "objective":
      return state.path !== null;
    case "variables":
      return (
        state.responses.some((r) => r.name.trim() !== "") &&
        state.factors.every((f) => f.name.trim() !== "")
      );
    case "data":
      return (
        ctx.cellErrorCount === 0 &&
        state.rows.some((row) => row.responses.some((cell) => cell.trim() !== ""))
      );
    case "analysis":
      if (savedFamily(state)) return resultIsCurrent(state);
      if (state.mixture !== null) return Boolean(ctx.mixtureResultCurrent);
      return (
        state.analysis.responseId !== null &&
        (!["oneWay", "procedure"].includes(analysisKind(state)) ||
          state.analysis.factorId !== null) &&
        (analysisKind(state) !== "factorial" ||
          (state.analysis.factorial?.factorIds.length ?? 0) > 0) &&
        (analysisKind(state) !== "design" || state.design !== null) &&
        resultIsCurrent(state)
      );
    case "results":
      return (
        resultFamilies(state).some((family) => family !== "legacy") ||
        resultIsCurrent(state) ||
        (state.mixture !== null && Boolean(ctx.mixtureResultCurrent))
      );
  }
}

/** Primeira etapa não satisfeita; `null` se todas estiverem. */
export function firstUnsatisfied(state: ProjectState, ctx: GuardContext): StepId | null {
  return STEPS.find((step) => !stepSatisfied(step, state, ctx)) ?? null;
}

/** Pode-se abrir `step`? Todas as etapas anteriores precisam estar satisfeitas. */
export function canEnter(step: StepId, state: ProjectState, ctx: GuardContext): boolean {
  if (step === "results" && resultFamilies(state).some((family) => family !== "legacy"))
    return true;
  const index = STEPS.indexOf(step);
  return STEPS.slice(0, index).every((s) => stepSatisfied(s, state, ctx));
}
