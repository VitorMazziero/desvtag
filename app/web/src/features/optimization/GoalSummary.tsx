import { useTranslation } from "react-i18next";
import { formatSignificant } from "../../i18n/format";
import type { Goal, OptimizationSetup } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
import type { ProjectState } from "../../state/project";

export function GoalSummary({ goal }: { goal: Goal }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === "en" ? "en" : "pt-BR";
  const f = (n: number) => formatSignificant(n, language, 5);
  return (
    <span>
      {t(`optimization.decision.summary.${goal.type}`, {
        low: "low" in goal ? f(goal.low) : "",
        high: "high" in goal ? f(goal.high) : "",
        target: "target" in goal ? f(goal.target) : "",
      })}
    </span>
  );
}

export function OptimizationCriterion({
  setup,
  variables,
}: {
  setup: OptimizationSetup;
  variables?: Pick<ProjectState, "factors" | "responses">;
}) {
  const { t } = useTranslation();
  const active = useProject();
  const state = variables ?? active;
  return (
    <aside className="panel optimization-criterion" data-testid="optimization-criterion">
      <h3>{t("optimization.decision.criterion")}</h3>
      <p>{t("optimization.decision.criterionHelp")}</p>
      <ul>
        {setup.responses.map((r) => {
          const response = state.responses.find((x) => x.id === r.responseId);
          return (
            <li key={r.responseId}>
              <strong>
                {response?.name ?? r.responseId}
                {response?.unit ? ` [${response.unit}]` : ""}:{" "}
              </strong>
              <GoalSummary goal={r.goal} />{" "}
              {t("optimization.decision.weight", { weight: r.importance })}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
