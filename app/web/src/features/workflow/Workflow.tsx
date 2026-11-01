import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { AnalysisSetup, buildDataset } from "../analysis";
import { DataGrid } from "../data";
import { DesignPanel } from "../design";
import { FactorEditor, ResponseEditor } from "../experiment";
import { ExportSettingsPanel } from "../export";
import { RecentProjects, StartActions } from "../home";
import { ImportButton } from "../import";
import { ConfirmationCheck } from "../optimization";
import { ResultsView } from "../results";
import { canEnter, firstUnsatisfied, stepSatisfied } from "./guards";
import { STEPS, type StepId } from "./steps";

export function Workflow({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const cellErrors = useMemo(() => buildDataset(state).cellErrors, [state]);
  const ctx = { cellErrorCount: cellErrors.length };
  // Ao abrir um projeto, começa na primeira etapa pendente (ou nos resultados, se tudo está pronto).
  const [step, setStep] = useState<StepId>(() =>
    state.confirmation ? "data" : (firstUnsatisfied(state, ctx) ?? "results"),
  );
  const index = STEPS.indexOf(step);
  const next = STEPS[index + 1];
  const previous = STEPS[index - 1];
  const nextAllowed =
    next !== undefined && stepSatisfied(step, state, ctx) && canEnter(next, state, ctx);

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
            {state.path === "plan" && <DesignPanel language={language} />}
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
            <div className="row">
              <ImportButton />
            </div>
            <DataGrid cellErrors={cellErrors} />
            <ConfirmationCheck language={language} />
          </section>
        )}
        {step === "analysis" && <AnalysisSetup onDone={() => setStep("results")} />}
        {step === "results" && (
          <>
            <ResultsView language={language} />
            {state.result && state.result.kind !== "surface" && <ExportSettingsPanel />}
          </>
        )}
      </div>

      <div className="step-actions">
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
