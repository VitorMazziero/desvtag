import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { AnalysisSetup, buildDataset } from "../analysis";
import { MixtureAnalysis } from "../analysis/MixtureAnalysis";
import { RepeatedMeasures } from "../analysis/RepeatedMeasures";
import { SaturationFit } from "../analysis/SaturationFit";
import { CommentsPanel } from "../comments";
import { DataGrid } from "../data";
import { DesignPanel } from "../design";
import { FactorEditor, ResponseEditor } from "../experiment";
import { ExportSettingsPanel } from "../export";
import { RecentProjects, StartActions } from "../home";
import { PowerCalculator } from "../home/PowerCalculator";
import { ImportButton } from "../import";
import { ConfirmationCheck } from "../optimization";
import { ResultsView } from "../results";
import { canEnter, firstUnsatisfied, stepSatisfied } from "./guards";
import { prefersReducedMotion, scrollToStep } from "./scrollToStep";
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
  // Ao trocar de etapa, volta ao topo de forma suave e foca o título (não na primeira exibição).
  const root = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a rolagem deve ocorrer só quando a etapa muda.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scrollToStep(root.current, prefersReducedMotion());
  }, [step]);
  const index = STEPS.indexOf(step);
  const next = STEPS[index + 1];
  const previous = STEPS[index - 1];
  const nextAllowed =
    next !== undefined && stepSatisfied(step, state, ctx) && canEnter(next, state, ctx);

  return (
    <div className="workflow" ref={root}>
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
            <PowerCalculator language={language} />
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
        {step === "analysis" && state.mixture !== null && <MixtureAnalysis language={language} />}
        {step === "analysis" && state.mixture === null && (
          <>
            <AnalysisSetup onDone={() => setStep("results")} />
            <RepeatedMeasures language={language} />
            <SaturationFit language={language} />
          </>
        )}
        {step === "results" && state.mixture !== null && <MixtureAnalysis language={language} />}
        {step === "results" && state.mixture === null && (
          <>
            <ResultsView language={language} />
            <CommentsPanel />
            {state.result &&
              !["surface", "procedure", "factorial", "oneWay", "design"].includes(
                state.result.kind,
              ) && <ExportSettingsPanel />}
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
