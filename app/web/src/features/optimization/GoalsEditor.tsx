// U10 — objetivos por resposta: maximizar, minimizar, alvo ou faixa (preferências), limites
// obrigatórios (restrições) e importâncias. Nenhum valor é calculado aqui.
import { useTranslation } from "react-i18next";
import type { Goal, OptimizationSetup, ResponseGoal } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
import { GoalSummary } from "./GoalSummary";
import { NumberField } from "./NumberField";
import { defaultGoal, GOAL_TYPES, type GoalType, observedRange } from "./optimizationSetup";

interface Props {
  setup: OptimizationSetup;
  onChange: (setup: OptimizationSetup) => void;
}

function GoalFields({
  name,
  goal,
  onChange,
}: {
  name: string;
  goal: Goal;
  onChange: (g: Goal) => void;
}) {
  const { t } = useTranslation();
  const field = (key: string, value: number, property = key) => (
    <NumberField
      key={key}
      label={`${name} — ${t(`optimization.goal.${key}`)}`}
      visibleLabel={t(`optimization.goal.${key}`)}
      value={value}
      onChange={(v) => v !== null && onChange({ ...goal, [property]: v } as Goal)}
    />
  );
  const thresholds =
    goal.type === "maximize"
      ? [field("low", goal.low), field("target", goal.target)]
      : goal.type === "minimize"
        ? [field("target", goal.target), field("high", goal.high)]
        : goal.type === "target"
          ? [field("low", goal.low), field("target", goal.target), field("high", goal.high)]
          : [field("rangeLow", goal.low, "low"), field("rangeHigh", goal.high, "high")];
  return (
    <fieldset className="goal-decision">
      <legend>{t("optimization.decision.thresholds")}</legend>
      <div className="row">{thresholds}</div>
      <p className="muted small">
        <GoalSummary goal={goal} />
      </p>
      {goal.type !== "range" && (
        <details className="advanced">
          <summary>{t("optimization.decision.shape")}</summary>
          <p className="muted small">{t("optimization.goal.shapeHelp")}</p>
          <div className="row">
            {goal.type === "target"
              ? [field("shapeLow", goal.shapeLow), field("shapeHigh", goal.shapeHigh)]
              : field("shape", goal.shape)}
          </div>
        </details>
      )}
    </fieldset>
  );
}

export function GoalsEditor({ setup, onChange }: Props) {
  const { t } = useTranslation();
  const state = useProject();

  const patchGoal = (responseId: string, patch: (g: ResponseGoal) => ResponseGoal) =>
    onChange({
      ...setup,
      responses: setup.responses.map((g) => (g.responseId === responseId ? patch(g) : g)),
    });
  const setLimit = (responseId: string, key: "min" | "max", value: number | null) => {
    const current = setup.limits.find((l) => l.responseId === responseId) ?? {
      responseId,
      min: null,
      max: null,
    };
    const next = { ...current, [key]: value };
    const others = setup.limits.filter((l) => l.responseId !== responseId);
    onChange({
      ...setup,
      limits: next.min === null && next.max === null ? others : [...others, next],
    });
  };

  return (
    <fieldset className="editor-card" data-testid="goals-editor">
      <legend>{t("optimization.goals.title")}</legend>
      <p className="muted small">{t("optimization.goals.help")}</p>
      {state.responses.map((r) => {
        const name = r.name || r.id;
        const goal = setup.responses.find((g) => g.responseId === r.id);
        const limit = setup.limits.find((l) => l.responseId === r.id);
        return (
          <fieldset key={r.id} className="goal-response">
            <legend>
              {name}
              {r.unit ? ` [${r.unit}]` : ""}
            </legend>
            <fieldset className="goal-decision">
              <legend>{t("optimization.decision.objective")}</legend>
              <label className="check">
                <input
                  aria-label={`${name} — ${t("optimization.goals.include")}`}
                  type="checkbox"
                  checked={goal !== undefined}
                  onChange={(e) =>
                    onChange({
                      ...setup,
                      responses: e.target.checked
                        ? [
                            ...setup.responses,
                            {
                              responseId: r.id,
                              terms: [],
                              goal: defaultGoal("maximize", observedRange(state, r.id)),
                              importance: 1,
                            },
                          ]
                        : setup.responses.filter((g) => g.responseId !== r.id),
                      limits: e.target.checked
                        ? setup.limits
                        : setup.limits.filter((l) => l.responseId !== r.id),
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
                      aria-label={`${name} — ${t("optimization.goals.type")}`}
                      value={goal.goal.type}
                      onChange={(e) =>
                        patchGoal(r.id, (g) => ({
                          ...g,
                          goal: defaultGoal(e.target.value as GoalType, observedRange(state, r.id)),
                        }))
                      }
                    >
                      {GOAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`optimization.goal.type_${type}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </fieldset>
            {goal && (
              <>
                <GoalFields
                  name={name}
                  goal={goal.goal}
                  onChange={(g) => patchGoal(r.id, (x) => ({ ...x, goal: g }))}
                />
                <fieldset className="goal-decision">
                  <legend>{t("optimization.decision.importance")}</legend>
                  <NumberField
                    label={`${name} — ${t("optimization.goals.importance")}`}
                    visibleLabel={t("optimization.goals.importance")}
                    value={goal.importance}
                    onChange={(v) =>
                      v !== null && patchGoal(r.id, (x) => ({ ...x, importance: v }))
                    }
                    help={t("optimization.goals.importanceHelp")}
                  />
                </fieldset>
                <fieldset className="goal-decision">
                  <legend>{t("optimization.decision.limits")}</legend>
                  <p className="muted small">{t("optimization.goals.limitHelp")}</p>
                  <div className="row">
                    <NumberField
                      label={`${name} — ${t("optimization.goals.limitMin")}`}
                      visibleLabel={t("optimization.goals.limitMin")}
                      value={limit?.min ?? null}
                      optional
                      onChange={(v) => setLimit(r.id, "min", v)}
                    />
                    <NumberField
                      label={`${name} — ${t("optimization.goals.limitMax")}`}
                      visibleLabel={t("optimization.goals.limitMax")}
                      value={limit?.max ?? null}
                      optional
                      onChange={(v) => setLimit(r.id, "max", v)}
                    />
                  </div>
                </fieldset>
              </>
            )}
          </fieldset>
        );
      })}
    </fieldset>
  );
}
