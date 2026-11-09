import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { AnalysisSetup, buildDataset } from "../analysis";
import { FactorialGeometryPanel } from "../analysis/FactorialGeometryPanel";
import { MixtureAnalysis } from "../analysis/MixtureAnalysis";
import { GuidedBlocks, GuidedFlow } from "../blocks";
import { CommentsPanel } from "../comments";
import { DataExportButtons, DataGrid } from "../data";
import { DesignPanel } from "../design";
import { FactorEditor, ResponseEditor } from "../experiment";
import { ExportSettingsPanel } from "../export";
import { StartActions } from "../home";
import { ImportButton } from "../import";
import { ConfirmationCheck } from "../optimization";
import { ResultsView } from "../results";
import { resultFamilies, savedFamily } from "../results/savedFamily";
import { canEnter, firstUnsatisfied, stepSatisfied } from "./guards";
import { prefersReducedMotion, scrollToStep } from "./scrollToStep";
import { STEPS, type StepId } from "./steps";

export function Workflow({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const workspace = useWorkspace();
  const sessionKey = `${workspace.projectId}:${workspace.createdAt}:${state.id}`;
  const cellErrors = useMemo(() => buildDataset(state).cellErrors, [state]);
  const [mixtureCurrent, setMixtureCurrent] = useState(false);
  const ctx = { cellErrorCount: cellErrors.length, mixtureResultCurrent: mixtureCurrent };
  // Ao abrir um projeto, começa na primeira etapa pendente (ou nos resultados, se tudo está pronto).
  const [variableFocus, setVariableFocus] = useState<{ id: string; revision: number }>();
  const [collapsed, setCollapsed] = useState(false);
  const [step, setStep] = useState<StepId>(() => {
    try {
      const remembered = sessionStorage.getItem(`optima.stage.${sessionKey}`) as StepId | null;
      if (remembered && STEPS.includes(remembered) && canEnter(remembered, state, ctx))
        return remembered;
    } catch {
      /* session only */
    }
    return state.confirmation
      ? "data"
      : resultFamilies(state).length > 0
        ? "results"
        : (firstUnsatisfied(state, ctx) ?? "results");
  });
  useEffect(() => {
    if (state.path === null) return;
    try {
      sessionStorage.setItem(`optima.stage.${sessionKey}`, step);
    } catch {
      /* session only */
    }
  }, [step, sessionKey, state.path]);
  const showVariables = (block: "factors" | "responses") => {
    setVariableFocus((previous) => ({
      id: `variables-blocks:${block}`,
      revision: (previous?.revision ?? 0) + 1,
    }));
    setStep("variables");
  };
  const latestFamily = savedFamily(state)?.record.id;
  const previousFamily = useRef(latestFamily);
  useEffect(() => {
    if (latestFamily && latestFamily !== previousFamily.current) setStep("results");
    previousFamily.current = latestFamily;
  }, [latestFamily]);
  const [visited, setVisited] = useState<StepId[]>([step]);
  useEffect(() => {
    setVisited((prev) => (prev.includes(step) ? prev : [...prev, step]));
  }, [step]);
  // Ao trocar de etapa, volta ao topo de forma suave e foca o título (não na primeira exibição).
  const root = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a rolagem deve ocorrer só quando a etapa muda.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Deixa o navegador acomodar a nova altura antes de iniciar a rolagem.
    const frame = requestAnimationFrame(() => {
      const focused = document.activeElement;
      // A ação de navegação pode já ter focado um controle visível na etapa nova.
      if (
        root.current?.contains(focused) &&
        focused?.closest(".step-body") &&
        !focused.closest("[hidden]")
      )
        return;
      scrollToStep(root.current, prefersReducedMotion());
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);
  const index = STEPS.indexOf(step);
  const next = STEPS[index + 1];
  const previous = STEPS[index - 1];
  const nextAllowed =
    next !== undefined && stepSatisfied(step, state, ctx) && canEnter(next, state, ctx);

  return (
    <div className="workflow" data-collapsed={collapsed} ref={root}>
      <nav aria-label={t("workflow.navLabel")}>
        <button
          type="button"
          className="button secondary small collapse-stages"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "☰" : "‹"}
          <span className="sr-only">{t("workflow.toggleStages")}</span>
        </button>
        <label className="field compact-stage">
          <span>{t("workflow.stageSelect")}</span>
          <select value={step} onChange={(e) => setStep(e.target.value as StepId)}>
            {STEPS.map((id, i) => (
              <option key={id} value={id} disabled={!canEnter(id, state, ctx)}>
                {i + 1}. {t(`workflow.step.${id}`)}
              </option>
            ))}
          </select>
        </label>
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
          <div className="home-grid">
            <section className="home-start" aria-labelledby="home-start-title">
              <h2 id="home-start-title">{t("home.startTitle")}</h2>
              <StartActions
                selected={state.path}
                onStart={(path) => {
                  dispatch({ type: "choosePath", path });
                  setStep("variables");
                }}
              />
            </section>
          </div>
        )}
        {(visited.includes("variables") || step === "variables") && (
          <section aria-labelledby="variables-title" hidden={step !== "variables"}>
            <h2 id="variables-title">{t("variables.title")}</h2>
            <p className="muted">{t("variables.intro")}</p>
            {state.path === "analyze" && (
              <div className="row">
                <ImportButton />
                <p className="muted small">{t("import.startHere")}</p>
              </div>
            )}
            <GuidedBlocks
              testId="variables-blocks"
              focusRequest={variableFocus}
              storageKey={`${sessionKey}:variables`}
              onPrevious={() => setStep("objective")}
              onNext={() => setStep("data")}
              nextAllowed={nextAllowed}
              blocks={[
                {
                  id: "factors",
                  title: t("variables.blocks.factors"),
                  titled: true,
                  content: <FactorEditor />,
                },
                {
                  id: "responses",
                  title: t("variables.blocks.responses"),
                  titled: true,
                  content: <ResponseEditor />,
                },
              ]}
            />
          </section>
        )}
        {(visited.includes("data") || step === "data") && (
          <section aria-labelledby="data-title" hidden={step !== "data"}>
            <h2 id="data-title">{t("data.title")}</h2>
            <p className="muted">{t("data.intro")}</p>
            <GuidedFlow
              testId="data-blocks"
              active={step === "data"}
              focusId={
                state.design || state.crd || state.rcbd || state.mixed || state.mixture
                  ? "data-grid-blocks:grid"
                  : undefined
              }
              storageKey={`${sessionKey}:data`}
              onPrevious={() => setStep("variables")}
              onNext={() => setStep("analysis")}
              nextAllowed={nextAllowed}
            >
              {state.path === "plan" && (
                <DesignPanel language={language} onEditFactors={() => showVariables("factors")} />
              )}
              <GuidedBlocks
                testId="data-grid-blocks"
                order={10}
                blocks={[
                  {
                    id: "grid",
                    title: t("data.blocks.grid"),
                    content: (
                      <>
                        <p className="muted small">{t("data.pasteNote")}</p>
                        <details className="advanced">
                          <summary>{t("data.advanced")}</summary>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={state.showUnitColumn}
                              onChange={(e) =>
                                dispatch({ type: "setUnitColumn", visible: e.target.checked })
                              }
                            />
                            <span>{t("data.showUnit")}</span>
                          </label>
                          <p className="muted small">{t("data.showUnitHelp")}</p>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={state.showTimeColumn}
                              onChange={(e) =>
                                dispatch({ type: "setTimeColumn", visible: e.target.checked })
                              }
                            />
                            <span>{t("data.showTime")}</span>
                          </label>
                          <p className="muted small">{t("data.showTimeHelp")}</p>
                        </details>
                        {cellErrors.length > 0 && (
                          <p role="alert" className="error">
                            {t("data.errorsSummary", { count: cellErrors.length })}
                          </p>
                        )}
                        <div className="row">
                          <ImportButton />
                        </div>
                        {!state.rows.some((row) =>
                          row.responses.some((cell) => cell.trim() !== ""),
                        ) && (
                          <p className="muted small" role="status">
                            {t("workflow.blocked.data")}
                          </p>
                        )}
                        <DataGrid cellErrors={cellErrors} />
                        <DataExportButtons />
                        {state.mixture === null && (
                          <FactorialGeometryPanel
                            key={`${workspace.epoch}:${sessionKey}`}
                            language={language}
                          />
                        )}
                        <ConfirmationCheck language={language} />
                      </>
                    ),
                  },
                ]}
              />
            </GuidedFlow>
          </section>
        )}
        {(visited.includes("analysis") || step === "analysis") && state.mixture === null && (
          <div hidden={step !== "analysis"}>
            <AnalysisSetup onDone={() => setStep("results")} onPrevious={() => setStep("data")} />
          </div>
        )}
        {step === "results" && (
          <>
            <ResultsView language={language} />
            <CommentsPanel />
            {state.activeFamily === "legacy" &&
              state.result &&
              !["surface", "procedure", "factorial", "oneWay", "design", "optimal"].includes(
                state.result.kind,
              ) && <ExportSettingsPanel />}
          </>
        )}
        {state.mixture !== null && (
          <div hidden={step !== "analysis"}>
            <MixtureAnalysis
              language={language}
              onCurrent={setMixtureCurrent}
              onCalculated={() => setStep("results")}
            />
          </div>
        )}
      </div>

      <div
        className="step-actions"
        hidden={
          step === "objective" ||
          step === "variables" ||
          step === "data" ||
          (step === "analysis" && state.mixture === null)
        }
      >
        <div className="spacer" />
        {previous && (
          <button type="button" className="button secondary" onClick={() => setStep(previous)}>
            {t("workflow.back")}
          </button>
        )}
        {next && (next !== "results" || state.mixture !== null) && (
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
      {next &&
        next !== "results" &&
        !nextAllowed &&
        step !== "analysis" &&
        step !== "data" &&
        step !== "objective" && (
          <div className="muted small" role="status">
            <p>{t(`workflow.blocked.${step}`)}</p>
            <button
              type="button"
              className="button secondary small"
              onClick={() =>
                showVariables(state.factors.some((f) => !f.name.trim()) ? "factors" : "responses")
              }
            >
              {t("workflow.fixVariables")}
            </button>
          </div>
        )}
    </div>
  );
}
