// Saved-family records retain the exact request, result and data revision. No scientific work.
import type {
  AnalysisFamily,
  ExperimentData,
  MixtureAnalysis,
  MixtureInputSnapshot,
  MixtureSelection,
  NonlinearInputSnapshot,
  NonlinearResult,
  NonlinearSelection,
  PowerRequest,
  PowerResult,
  PowerSelection,
  RepeatedInputSnapshot,
  RepeatedOutput,
  RepeatedSelection,
  SavedMixture,
  SavedNonlinear,
  SavedPower,
  SavedRepeated,
} from "../services/engine";
import type { ProjectState } from "./project";
import { commitRevision, freshId, sameData, snapshotData } from "./revisionOps";

export type FamilyCalculation =
  | {
      family: "mixture";
      selection: MixtureSelection;
      input: MixtureInputSnapshot;
      result: MixtureAnalysis;
    }
  | {
      family: "repeated";
      selection: RepeatedSelection;
      input: RepeatedInputSnapshot;
      result: RepeatedOutput;
    }
  | {
      family: "nonlinear";
      selection: NonlinearSelection;
      input: NonlinearInputSnapshot;
      result: NonlinearResult;
    }
  | { family: "power"; selection: PowerSelection; input: PowerRequest; result: PowerResult };

export type StoreFamilyAction = FamilyCalculation & {
  type: "storeFamily";
  /** A late response must never write into a replacement project or another experiment. */
  projectId: string;
  epoch: number;
  experimentId: string;
  /** Exact raw data at request time, not the table at response time. */
  data: ExperimentData;
  signature: string;
  startedAt: string;
  now: string;
};

export type FamilyAction =
  | StoreFamilyAction
  | { type: "selectFamily"; family: AnalysisFamily }
  | { type: "setFamilySelection"; family: "mixture"; selection: MixtureSelection }
  | { type: "setFamilySelection"; family: "repeated"; selection: RepeatedSelection }
  | { type: "setFamilySelection"; family: "nonlinear"; selection: NonlinearSelection }
  | { type: "setFamilySelection"; family: "power"; selection: PowerSelection };

type Slots = {
  optimalDesigns?: Array<{ id: string; revisionId: string }>;
  optimalVariances?: Array<{ id: string; revisionId: string }>;
  mixtureResult?: SavedMixture | null;
  mixedModelResult?: SavedRepeated | null;
  nonlinearResult?: SavedNonlinear | null;
  powerResult?: SavedPower | null;
};

export function familyRecordMetadata(state: Slots): Array<{ id: string; revisionId: string }> {
  return [
    state.mixtureResult?.records,
    state.mixedModelResult?.records,
    state.nonlinearResult?.records,
    state.powerResult?.records,
    state.optimalDesigns,
    state.optimalVariances,
  ].flatMap((records) => records?.map((r) => ({ id: r.id, revisionId: r.revisionId })) ?? []);
}

export function familyRecordIds(state: Slots): string[] {
  return familyRecordMetadata(state).map((r) => r.id);
}

export function hasFamilyResult(state: ProjectState, family: AnalysisFamily): boolean {
  switch (family) {
    case "legacy":
      return state.result !== null;
    case "mixture":
      return Boolean(state.mixtureResult?.records.length);
    case "repeated":
      return Boolean(state.mixedModelResult?.records.length);
    case "nonlinear":
      return Boolean(state.nonlinearResult?.records.length);
    case "power":
      return Boolean(state.powerResult?.records.length);
  }
}

function sourceRevision(state: ProjectState, action: StoreFamilyAction) {
  const known = state.revisions.find((r) => sameData(r.data, action.data));
  if (known) return { state, revisionId: known.id };
  const currentData = snapshotData(state);
  const captured = commitRevision({ ...state, ...action.data }, "analysis", action.startedAt);
  const revisionId = captured.revisions.at(-1)?.id;
  if (!revisionId) throw new Error("A stored calculation requires a data revision");
  // If edits happened during the calculation, the current table remains the latest revision.
  const restored = commitRevision({ ...captured, ...currentData }, "edit", action.now);
  return { state: restored, revisionId };
}

export function reduceFamily(state: ProjectState, action: FamilyAction): ProjectState {
  if (action.type === "selectFamily") {
    return action.family === state.activeFamily || !hasFamilyResult(state, action.family)
      ? state
      : { ...state, activeFamily: action.family };
  }
  if (action.type === "setFamilySelection") {
    switch (action.family) {
      case "mixture":
        return state.mixtureResult &&
          JSON.stringify(state.mixtureResult.selection) === JSON.stringify(action.selection)
          ? state
          : {
              ...state,
              mixtureResult: {
                selection: action.selection,
                records: state.mixtureResult?.records ?? [],
              },
            };
      case "repeated":
        return state.mixedModelResult &&
          JSON.stringify(state.mixedModelResult.selection) === JSON.stringify(action.selection)
          ? state
          : {
              ...state,
              mixedModelResult: {
                selection: action.selection,
                records: state.mixedModelResult?.records ?? [],
              },
            };
      case "nonlinear":
        return state.nonlinearResult &&
          JSON.stringify(state.nonlinearResult.selection) === JSON.stringify(action.selection)
          ? state
          : {
              ...state,
              nonlinearResult: {
                selection: action.selection,
                records: state.nonlinearResult?.records ?? [],
              },
            };
      case "power":
        return state.powerResult &&
          JSON.stringify(state.powerResult.selection) === JSON.stringify(action.selection)
          ? state
          : {
              ...state,
              powerResult: {
                selection: action.selection,
                records: state.powerResult?.records ?? [],
              },
            };
    }
  }
  if (action.experimentId !== state.id) return state;
  const captured = sourceRevision(state, action);
  const source = captured.state;
  const { id, counter } = freshId("a", source.counters.analysis, [
    ...source.analyses.map((r) => r.id),
    ...familyRecordIds(source),
  ]);
  const record = {
    id,
    createdAt: action.now,
    revisionId: captured.revisionId,
    signature: action.signature,
  };
  const next = {
    ...source,
    activeFamily: action.family,
    counters: { ...source.counters, analysis: counter },
  };
  switch (action.family) {
    case "mixture":
      return {
        ...next,
        mixtureResult: {
          selection: source.mixtureResult?.selection ?? action.selection,
          records: [
            ...(source.mixtureResult?.records ?? []),
            { ...record, input: action.input, result: action.result },
          ],
        },
      };
    case "repeated":
      return {
        ...next,
        mixedModelResult: {
          selection: source.mixedModelResult?.selection ?? action.selection,
          records: [
            ...(source.mixedModelResult?.records ?? []),
            { ...record, input: action.input, result: action.result },
          ],
        },
      };
    case "nonlinear":
      return {
        ...next,
        nonlinearResult: {
          selection: source.nonlinearResult?.selection ?? action.selection,
          records: [
            ...(source.nonlinearResult?.records ?? []),
            { ...record, input: action.input, result: action.result },
          ],
        },
      };
    case "power":
      return {
        ...next,
        powerResult: {
          selection: source.powerResult?.selection ?? action.selection,
          records: [
            ...(source.powerResult?.records ?? []),
            { ...record, input: action.input, result: action.result },
          ],
        },
      };
  }
}
