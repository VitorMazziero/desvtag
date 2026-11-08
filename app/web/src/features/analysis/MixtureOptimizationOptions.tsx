import { useTranslation } from "react-i18next";
import type { MixtureOptimizationDraft, MixtureResponseGoalDraft } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";
import { defaultMixtureGoal } from "./mixtureOptimizationSetup";

export const mixtureGoalFieldKeys: Record<string, string> = {
  low: "optimization.goal.low",
  target: "optimization.goal.target",
  high: "optimization.goal.high",
  shape: "optimization.goal.shape",
  shapeLow: "optimization.goal.shapeLow",
  shapeHigh: "optimization.goal.shapeHigh",
  importance: "optimization.goals.importance",
  min: "optimization.goals.limitMin",
  max: "optimization.goals.limitMax",
  starts: "optimization.search.starts",
  seed: "optimization.search.seed",
  maxCandidates: "optimization.search.candidates",
  clusterTolerance: "mixture.analysis.optimClusterTolerance",
  responses: "optimization.goals.title",
  observations: "mixture.analysis.optimObservationFields",
};

export function MixtureOptimizationOptions({
  draft,
  onChange,
}: {
  draft: MixtureOptimizationDraft;
  onChange: (draft: MixtureOptimizationDraft) => void;
}) {
  const state = useProject();
  const { t } = useTranslation();
  const label = (key: string) => t(mixtureGoalFieldKeys[key] ?? key);
  const field = (
    key: string,
    text: string,
    onText: (text: string) => void,
    name?: string,
    optional = false,
  ) => {
    const parsed = parseNumberCell(text);
    const invalid = !parsed.ok || (!optional && parsed.value === null);
    return (
      <label className="field" key={key}>
        <span>{label(key)}</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={name ? `${name} — ${label(key)}` : label(key)}
          aria-invalid={invalid || undefined}
          value={text}
          onChange={(event) => onText(event.target.value)}
        />
        {invalid && <small className="error">{t("optimization.decision.invalidNumber")}</small>}
      </label>
    );
  };
  const patch = (responseId: string, change: Partial<MixtureResponseGoalDraft>) =>
    onChange({
      ...draft,
      responses: draft.responses.map((response) =>
        response.responseId === responseId ? { ...response, ...change } : response,
      ),
    });
  return (
    <div className="mixture-analysis" data-testid="mixture-optimization-options">
      <p className="muted">{t("mixture.analysis.optimHelp")}</p>
      {draft.responses
        .filter((goal) => !state.responses.some((response) => response.id === goal.responseId))
        .map((goal) => (
          <div className="notice warning" key={goal.responseId}>
            <p>{t("mixture.analysis.optimMissingResponse", { id: goal.responseId })}</p>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                onChange({
                  ...draft,
                  responses: draft.responses.filter((item) => item.responseId !== goal.responseId),
                })
              }
            >
              {t("variables.remove")}
            </button>
          </div>
        ))}
      {state.responses.map((response) => {
        const goal = draft.responses.find((goal) => goal.responseId === response.id);
        const fields =
          goal?.kind === "maximize"
            ? ["low", "target"]
            : goal?.kind === "minimize"
              ? ["target", "high"]
              : goal?.kind === "target"
                ? ["low", "target", "high"]
                : ["low", "high"];
        return (
          <fieldset className="editor-card" key={response.id}>
            <legend>
              {response.name}
              {response.unit ? ` [${response.unit}]` : ""}
            </legend>
            <label className="check">
              <input
                type="checkbox"
                aria-label={`${response.name} — ${t("optimization.goals.include")}`}
                checked={goal !== undefined}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    responses: event.target.checked
                      ? [...draft.responses, defaultMixtureGoal(state, response.id)]
                      : draft.responses.filter((goal) => goal.responseId !== response.id),
                  })
                }
              />
              <span>{t("optimization.goals.include")}</span>
            </label>
            {goal && (
              <>
                <label className="field">
                  <span>{t("optimization.goals.type")}</span>
                  <select
                    aria-label={`${response.name} — ${t("optimization.goals.type")}`}
                    value={goal.kind}
                    onChange={(event) =>
                      patch(response.id, {
                        ...defaultMixtureGoal(
                          state,
                          response.id,
                          event.target.value as MixtureResponseGoalDraft["kind"],
                        ),
                        importance: goal.importance,
                        min: goal.min,
                        max: goal.max,
                      })
                    }
                  >
                    {["maximize", "minimize", "target", "range"].map((kind) => (
                      <option value={kind} key={kind}>
                        {t(`optimization.goal.type_${kind}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  {fields.map((key) =>
                    field(
                      key,
                      goal[key as "low" | "target" | "high"],
                      (text) => patch(response.id, { [key]: text }),
                      response.name,
                    ),
                  )}
                </div>
                <details className="advanced">
                  <summary>{t("mixture.analysis.optimPreferences")}</summary>
                  <div className="form-grid">
                    {field(
                      "importance",
                      goal.importance,
                      (text) => patch(response.id, { importance: text }),
                      response.name,
                    )}
                    {goal.kind !== "range" &&
                      field(
                        goal.kind === "target" ? "shapeLow" : "shape",
                        goal.shapeLow,
                        (text) => patch(response.id, { shapeLow: text }),
                        response.name,
                      )}
                    {goal.kind === "target" &&
                      field(
                        "shapeHigh",
                        goal.shapeHigh,
                        (text) => patch(response.id, { shapeHigh: text }),
                        response.name,
                      )}
                    {field(
                      "min",
                      goal.min,
                      (text) => patch(response.id, { min: text }),
                      response.name,
                      true,
                    )}
                    {field(
                      "max",
                      goal.max,
                      (text) => patch(response.id, { max: text }),
                      response.name,
                      true,
                    )}
                  </div>
                  <p className="muted small">{t("optimization.goals.limitHelp")}</p>
                </details>
              </>
            )}
          </fieldset>
        );
      })}
      <details className="advanced">
        <summary>{t("mixture.analysis.optimSearchOptions")}</summary>
        <p className="muted small">{t("mixture.analysis.optimBudget")}</p>
        <div className="form-grid">
          {(["starts", "seed", "maxCandidates", "clusterTolerance"] as const).map((key) =>
            field(key, draft[key], (text) => onChange({ ...draft, [key]: text })),
          )}
        </div>
      </details>
    </div>
  );
}
