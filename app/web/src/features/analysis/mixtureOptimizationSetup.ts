// Parse editable drafts and retain exact observation pairs. Scientific fitting/search stay in Rust.
import type {
  Goal,
  MixtureOptimizationDraft,
  MixtureOptimizationSpec,
  MixtureResponseData,
  MixtureResponseGoalDraft,
} from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { parseNumberCell } from "../data/editing";
import { defaultGoal, observedRange } from "../optimization/optimizationSetup";

export function defaultMixtureGoal(
  state: ProjectState,
  responseId: string,
  kind: MixtureResponseGoalDraft["kind"] = "maximize",
): MixtureResponseGoalDraft {
  const [low, high] = observedRange(state, responseId);
  const goal = defaultGoal(kind, [low, high]);
  return {
    responseId,
    kind,
    low: String("low" in goal ? goal.low : low),
    target: String("target" in goal ? goal.target : (low + high) / 2),
    high: String("high" in goal ? goal.high : high),
    shapeLow: "1",
    shapeHigh: "1",
    importance: "1",
    min: "",
    max: "",
  };
}

export function defaultMixtureOptimization(
  state: ProjectState,
  responseId: string,
): MixtureOptimizationDraft {
  return {
    responses: [defaultMixtureGoal(state, responseId)],
    starts: "40",
    seed: "20261104",
    maxCandidates: "5",
    clusterTolerance: "0.01",
  };
}

export function collectMixtureResponse(
  state: ProjectState,
  responseId: string,
): { data: MixtureResponseData; bad: number[]; known: boolean } {
  const index = state.responses.findIndex((response) => response.id === responseId);
  const response = state.responses[index];
  const data: MixtureResponseData = {
    responseId,
    name: response ? `${response.name}${response.unit ? ` [${response.unit}]` : ""}` : responseId,
    proportions: [],
    response: [],
  };
  const bad: number[] = [];
  const columns = (state.mixture?.components ?? []).map((component) =>
    state.factors.findIndex((factor) => factor.id === component.id),
  );
  state.rows.forEach((row, rowIndex) => {
    const value = parseNumberCell(row.responses[index] ?? "");
    if (!value.ok) {
      bad.push(rowIndex + 1);
      return;
    }
    if (value.value === null) return;
    const proportions = columns.map((column) => {
      const parsed = parseNumberCell(row.factors[column] ?? "");
      return parsed.ok && parsed.value !== null ? parsed.value : Number.NaN;
    });
    if (!proportions.every(Number.isFinite)) {
      bad.push(rowIndex + 1);
      return;
    }
    data.proportions.push(proportions);
    data.response.push(value.value);
  });
  return { data, bad, known: response !== undefined };
}

export function parseMixtureOptimization(
  state: ProjectState,
  draft: MixtureOptimizationDraft,
  fieldDescription: (field: string, responseName?: string) => string,
): {
  spec: MixtureOptimizationSpec | null;
  invalid: string[];
} {
  const invalid: string[] = [];
  const number = (text: string, key: string, responseName?: string) => {
    const parsed = parseNumberCell(text);
    if (!parsed.ok || parsed.value === null) {
      invalid.push(fieldDescription(key, responseName));
      return Number.NaN;
    }
    return parsed.value;
  };
  const integer = (text: string, key: string, low: number, high: number) => {
    const value = number(text, key);
    if (!Number.isInteger(value) || value < low || value > high)
      invalid.push(fieldDescription(key));
    return value;
  };
  if (draft.responses.length < 1 || draft.responses.length > 8)
    invalid.push(fieldDescription("responses"));
  const data: MixtureResponseData[] = [];
  const limits: MixtureOptimizationSpec["setup"]["limits"] = [];
  const responses = draft.responses.map((response) => {
    const name =
      state.responses.find((item) => item.id === response.responseId)?.name ?? response.responseId;
    const parse = (field: "low" | "target" | "high" | "shapeLow" | "shapeHigh" | "importance") =>
      number(
        response[field],
        field === "shapeLow" && response.kind !== "target" ? "shape" : field,
        name,
      );
    let goal: Goal;
    switch (response.kind) {
      case "maximize":
        goal = {
          type: "maximize",
          low: parse("low"),
          target: parse("target"),
          shape: parse("shapeLow"),
        };
        break;
      case "minimize":
        goal = {
          type: "minimize",
          target: parse("target"),
          high: parse("high"),
          shape: parse("shapeLow"),
        };
        break;
      case "target":
        goal = {
          type: "target",
          low: parse("low"),
          target: parse("target"),
          high: parse("high"),
          shapeLow: parse("shapeLow"),
          shapeHigh: parse("shapeHigh"),
        };
        break;
      case "range":
        goal = { type: "range", low: parse("low"), high: parse("high") };
        break;
    }
    const min = response.min.trim() ? number(response.min, "min", name) : null;
    const max = response.max.trim() ? number(response.max, "max", name) : null;
    if (min !== null || max !== null) limits.push({ responseId: response.responseId, min, max });
    const collected = collectMixtureResponse(state, response.responseId);
    if (!collected.known || collected.bad.length)
      invalid.push(`${fieldDescription("observations", name)} ${collected.bad.join(", ")}`);
    data.push(collected.data);
    return { responseId: response.responseId, terms: [], goal, importance: parse("importance") };
  });
  const search = {
    starts: integer(draft.starts, "starts", 1, 128),
    seed: integer(draft.seed, "seed", 0, Number.MAX_SAFE_INTEGER),
    maxCandidates: integer(draft.maxCandidates, "maxCandidates", 1, 20),
    clusterTolerance: number(draft.clusterTolerance, "clusterTolerance"),
  };
  if (!(search.clusterTolerance > 0 && search.clusterTolerance <= 2))
    invalid.push(fieldDescription("clusterTolerance"));
  return {
    spec: invalid.length
      ? null
      : {
          setup: {
            responses,
            limits,
            domain: { type: "region" },
            search,
            alpha: state.analysis.alpha,
          },
          data,
        },
    invalid: [...new Set(invalid)],
  };
}
