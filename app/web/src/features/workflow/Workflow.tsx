import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { AnalysisSetup, buildDataset } from "../analysis";
import { DataGrid } from "../data";
import { FactorEditor, ResponseEditor } from "../experiment";
import { RecentProjects, StartActions } from "../home";
import { ResultsView } from "../results";
import { canEnter, stepSatisfied } from "./guards";
import { STEPS, type StepId } from "./steps";

export function Workflow({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const [step, setStep] = useState<StepId>("objective");

  const cellErrors = useMemo(() => buildDataset(state).cellErrors, [state]);
  const ctx = { cellErrorCount: cellErrors.length };
  const index = STEPS.indexOf(step);
  const next = STEPS[index + 1];
  const previous = STEPS[index - 1];
  const nextAllowed =
    next !== undefined && stepSatisfied(step, state, ctx) && canEnter(next, state, ctx);

  const restart = () => {
    if (window.confirm(t("workflow.restartConfirm"))) {
      dispatch({ type: "reset" });
      setStep("objective");
    }
  };

  return (
    <div className="workflow">
      <nav aria-label={t("workflow.navLabel")}>
        <ol className="steps">
          {STEPS.map((id, i) => {
            const enabled = canEnter(id, state, ctx);
            const done = stepSatisfied(id, state, ctx);
            return (
              <li key={id}>
                <button
                  type="button"
                  className="step"
                  aria-current={id === step ? "step" : undefined}
                  disabled={!enabled}
                  data-done={done && id !== step}
                  onClick={() => setStep(id)}
                >
                  <span className="step-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{t(`workflow.step.${id}`)}</span>
                  <span className="sr-only">
                    {" — "}
                    {id === step
                      ? t("workflow.status.current")
                      : done
                        ? t("workflow.status.done")
                        : !enabled
                          ? t("workflow.status.locked")
                          : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="step-body" data-step={step}>
        {step === "objective" && (
          <>
            <StartActions
              selected={state.path}
              onChoose={(path) => dispatch({ type: "choosePath", path })}
            />
            <RecentProjects />
          </>
        )}
        {step === "variables" && (
          <section aria-labelledby="variables-title">
            <h2 id="variables-title">{t("variables.title")}</h2>
            <p className="muted">{t("variables.intro")}</p>
            <FactorEditor />
            <ResponseEditor />
          </section>
        )}
        {step === "data" && (
          <section aria-labelledby="data-title">
            <h2 id="data-title">{t("data.title")}</h2>
            <p className="muted">{t("data.intro")}</p>
            <p className="muted small">{t("data.pasteNote")}</p>
            <details className="advanced">
              <summary>{t("data.advanced")}</summary>
              <label className="check">
                <input
                  type="checkbox"
                  checked={state.showUnitColumn}
                  onChange={(e) => dispatch({ type: "setUnitColumn", visible: e.target.checked })}
                />
                <span>{t("data.showUnit")}</span>
              </label>
              <p className="muted small">{t("data.showUnitHelp")}</p>
            </details>
            {cellErrors.length > 0 && (
              <p role="alert" className="error">
                {t("data.errorsSummary", { count: cellErrors.length })}
              </p>
            )}
            <DataGrid cellErrors={cellErrors} />
          </section>
        )}
        {step === "analysis" && <AnalysisSetup onDone={() => setStep("results")} />}
        {step === "results" && <ResultsView language={language} />}
      </div>

      <div className="step-actions">
        <button type="button" className="button secondary" onClick={restart}>
          {t("workflow.restart")}
        </button>
        <div className="spacer" />
        {previous && (
          <button type="button" className="button secondary" onClick={() => setStep(previous)}>
            {t("workflow.back")}
          </button>
        )}
        {next && next !== "results" && (
          <button
            type="button"
            className="button"
            disabled={!nextAllowed}
            onClick={() => setStep(next)}
          >
            {t("workflow.next")}
          </button>
        )}
      </div>
      {next && next !== "results" && !nextAllowed && step !== "analysis" && (
        <p className="muted small" role="status">
          {t(`workflow.blocked.${step}`)}
        </p>
      )}
    </div>
  );
}
