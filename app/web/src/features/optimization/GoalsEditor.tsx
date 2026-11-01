// U10 — objetivos por resposta: maximizar, minimizar, alvo ou faixa (preferências), limites
// obrigatórios (restrições) e importâncias. Nenhum valor é calculado aqui.
import { useTranslation } from "react-i18next";
import type { Goal, OptimizationSetup, ResponseGoal } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
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
  onChange: (goal: Goal) => void;
}) {
  const { t } = useTranslation();
  const field = (key: string, value: number, set: (v: number) => void, help?: string) => (
    <NumberField
      label={`${name} — ${t(`optimization.goal.${key}`)}`}
      value={value}
      onChange={(v) => v !== null && set(v)}
      help={help}
    />
  );
  switch (goal.type) {
    case "maximize":
      return (
        <div className="row">
          {field(
            "low",
            goal.low,
            (v) => onChange({ ...goal, low: v }),
            t("optimization.goal.lowHelp"),
          )}
          {field(
            "target",
            goal.target,
            (v) => onChange({ ...goal, target: v }),
            t("optimization.goal.targetHelp"),
          )}
          {field(
            "shape",
            goal.shape,
            (v) => onChange({ ...goal, shape: v }),
            t("optimization.goal.shapeHelp"),
          )}
        </div>
      );
    case "minimize":
      return (
        <div className="row">
          {field(
            "target",
            goal.target,
            (v) => onChange({ ...goal, target: v }),
            t("optimization.goal.targetHelp"),
          )}
          {field(
            "high",
            goal.high,
            (v) => onChange({ ...goal, high: v }),
            t("optimization.goal.highHelp"),
          )}
          {field(
            "shape",
            goal.shape,
            (v) => onChange({ ...goal, shape: v }),
            t("optimization.goal.shapeHelp"),
          )}
        </div>
      );
    case "target":
      return (
        <div className="row">
          {field(
            "low",
            goal.low,
            (v) => onChange({ ...goal, low: v }),
            t("optimization.goal.lowHelp"),
          )}
          {field("target", goal.target, (v) => onChange({ ...goal, target: v }))}
          {field(
            "high",
            goal.high,
            (v) => onChange({ ...goal, high: v }),
            t("optimization.goal.highHelp"),
          )}
          {field("shapeLow", goal.shapeLow, (v) => onChange({ ...goal, shapeLow: v }))}
          {field("shapeHigh", goal.shapeHigh, (v) => onChange({ ...goal, shapeHigh: v }))}
        </div>
      );
    case "range":
      return (
        <div className="row">
          {field("rangeLow", goal.low, (v) => onChange({ ...goal, low: v }))}
          {field("rangeHigh", goal.high, (v) => onChange({ ...goal, high: v }))}
        </div>
      );
  }
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
          <fieldset key={r.id}>
            <legend>{name}</legend>
            <label className="check">
              <input
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
              <span>{`${name} — ${t("optimization.goals.include")}`}</span>
            </label>
            {goal && (
              <>
                <label className="field">
                  <span>{`${name} — ${t("optimization.goals.type")}`}</span>
                  <select
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
                <GoalFields
                  name={name}
                  goal={goal.goal}
                  onChange={(g) => patchGoal(r.id, (x) => ({ ...x, goal: g }))}
                />
                <div className="row">
                  <NumberField
                    label={`${name} — ${t("optimization.goals.importance")}`}
                    value={goal.importance}
                    onChange={(v) =>
                      v !== null && patchGoal(r.id, (x) => ({ ...x, importance: v }))
                    }
                    help={t("optimization.goals.importanceHelp")}
                  />
                  <NumberField
                    label={`${name} — ${t("optimization.goals.limitMin")}`}
                    value={limit?.min ?? null}
                    optional
                    onChange={(v) => setLimit(r.id, "min", v)}
                    help={t("optimization.goals.limitHelp")}
                  />
                  <NumberField
                    label={`${name} — ${t("optimization.goals.limitMax")}`}
                    value={limit?.max ?? null}
                    optional
                    onChange={(v) => setLimit(r.id, "max", v)}
                  />
                </div>
              </>
            )}
          </fieldset>
        );
      })}
    </fieldset>
  );
}
