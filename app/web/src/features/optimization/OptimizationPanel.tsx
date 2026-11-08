// U10 — otimização por desejabilidade: objetivos, limites, domínio, busca com cancelamento,
// candidatos, compromissos, gráfico e proposta de confirmação. O cálculo é do motor (C17).
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { nowIso } from "../../lib/ids";
import { StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { captureCalculationSource } from "../../state/project";
import { buildDataset } from "../analysis";
import { BlockContextNote } from "../results/BlockContextNote";
import { formatFactParams } from "../results/ComparisonInterpretation";
import { TableExportButtons } from "../results/TableExportButtons";
import { CandidateSummary, CandidateTable, candidatesTable } from "./CandidateTable";
import { ConfirmationPanel } from "./ConfirmationPanel";
import { DesirabilityView } from "./DesirabilityView";
import { OptimizationCriterion } from "./GoalSummary";
import { GoalsEditor } from "./GoalsEditor";
import { hasOverflowingDesirabilitySpan } from "./legacyDesirability";
import { NumberField } from "./NumberField";
import { buildOptimizationRequest, defaultSetup, optimizationSignature } from "./optimizationSetup";
import { TradeOffs } from "./TradeOffs";

const RUN_CHANNEL = "optimization-run";

export function OptimizationPanel({ language }: { language: Language }) {
  const { t } = useTranslation();
  const { t: tr } = useTranslation("results");
  const state = useProject();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const root = useRef<HTMLElement>(null);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const setup = state.optimization.setup ?? defaultSetup(state);
  const result = state.optimization.result;
  const record = [...state.analyses]
    .reverse()
    .find((a) => a.signature === state.optimization.signature);
  const resultVariables = state.revisions.find((r) => r.id === record?.revisionId)?.data ?? state;
  const [selected, setSelected] = useState<Set<number>>(new Set([1]));
  useEffect(
    () => setSelected(new Set(result?.candidates[0] ? [result.candidates[0].rank] : [])),
    [result],
  );
  const request = useMemo(() => buildOptimizationRequest(state, setup), [state, setup]);
  const signature = useMemo(() => optimizationSignature(state, setup), [state, setup]);
  const current = result !== null && state.optimization.signature === signature;
  const savedSetup = record?.options.optimization ?? (current ? request.setup : undefined);
  const legacyDesirability =
    result &&
    result.provenance.methodVersion < 3 &&
    savedSetup?.responses.some(({ goal }) => hasOverflowingDesirabilitySpan(goal));
  const regionRanges = useMemo(() => {
    const { dataset } = buildDataset(state);
    return request.factors.map((f) => {
      const index = dataset.factors.findIndex((d) => d.id === f.id);
      const values = dataset.observations
        .map((o) => o.factors[index])
        .filter((v): v is number => typeof v === "number");
      return {
        id: f.id,
        name: f.name,
        min: values.length > 0 ? Math.min(...values) : f.low,
        max: values.length > 0 ? Math.max(...values) : f.high,
      };
    });
  }, [state, request.factors]);

  const update = (next: typeof setup) => dispatch({ type: "setOptimizationSetup", setup: next });

  const run = async () => {
    const invalid = root.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
    if (invalid) {
      const detail = invalid.closest("details");
      if (detail) detail.open = true;
      invalid.focus();
      setMessages([t("optimization.decision.invalidNumber")]);
      return;
    }
    const source = captureCalculationSource(workspace, state, nowIso());
    setRunning(true);
    setMessages([]);
    setNotice(null);
    try {
      const response = await client.request(
        { type: "optimizationRun", ...request },
        { channel: RUN_CHANNEL },
      );
      if (response.outcome.status === "ok" && response.outcome.result.type === "optimizationRun") {
        const { type: _type, ...found } = response.outcome.result;
        dispatch({
          type: "storeOptimization",
          source,
          setup: request.setup,
          result: found,
          signature,
          now: nowIso(),
        });
      } else if (response.outcome.status === "error") {
        setMessages(engineErrorMessages(t, response.outcome.error));
      }
    } catch (error) {
      if (!(error instanceof StaleResponseError))
        setMessages([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setRunning(false);
    }
  };
  const cancel = () => {
    client.cancel(RUN_CHANNEL);
    setRunning(false);
    setNotice(t("optimization.run.cancelled"));
  };

  const domainBounds =
    setup.domain.type === "extended"
      ? regionRanges.map((r) =>
          setup.domain.type === "extended"
            ? (setup.domain.bounds.find((b) => b.factorId === r.id) ?? {
                factorId: r.id,
                min: r.min,
                max: r.max,
              })
            : { factorId: r.id, min: r.min, max: r.max },
        )
      : [];

  return (
    <section ref={root} aria-labelledby="optimization-title" data-testid="optimization-panel">
      <h2 id="optimization-title">{t("optimization.title")}</h2>
      <p className="muted">{t("optimization.intro")}</p>
      <GoalsEditor setup={setup} onChange={update} />

      <fieldset className="editor-card" data-testid="domain-editor">
        <legend>{t("optimization.domain.title")}</legend>
        <label className="check">
          <input
            type="radio"
            name="opt-domain"
            checked={setup.domain.type === "region"}
            onChange={() => update({ ...setup, domain: { type: "region" } })}
          />
          <span>{t("optimization.domain.region")}</span>
        </label>
        <label className="check">
          <input
            type="radio"
            name="opt-domain"
            checked={setup.domain.type === "extended"}
            onChange={() =>
              update({
                ...setup,
                domain: {
                  type: "extended",
                  bounds: regionRanges.map((r) => ({ factorId: r.id, min: r.min, max: r.max })),
                },
              })
            }
          />
          <span>{t("optimization.domain.extended")}</span>
        </label>
        <p className="muted small">{t("optimization.domain.help")}</p>
        {setup.domain.type === "extended" && (
          <div className="row">
            {domainBounds.map((b) => {
              const name = regionRanges.find((r) => r.id === b.factorId)?.name ?? b.factorId;
              const set = (patch: { min?: number; max?: number }) =>
                update({
                  ...setup,
                  domain: {
                    type: "extended",
                    bounds: domainBounds.map((x) =>
                      x.factorId === b.factorId ? { ...x, ...patch } : x,
                    ),
                  },
                });
              return (
                <div key={b.factorId} className="row">
                  <NumberField
                    label={`${name} — ${t("optimization.domain.min")}`}
                    value={b.min}
                    onChange={(v) => v !== null && set({ min: v })}
                  />
                  <NumberField
                    label={`${name} — ${t("optimization.domain.max")}`}
                    value={b.max}
                    onChange={(v) => v !== null && set({ max: v })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      <details className="advanced">
        <summary>{t("optimization.search.title")}</summary>
        <div className="row">
          <NumberField
            label={t("optimization.search.starts")}
            value={setup.search.starts}
            onChange={(v) =>
              v !== null &&
              update({ ...setup, search: { ...setup.search, starts: Math.max(1, Math.floor(v)) } })
            }
            help={t("optimization.search.startsHelp")}
          />
          <NumberField
            label={t("optimization.search.seed")}
            value={setup.search.seed}
            onChange={(v) =>
              v !== null &&
              update({ ...setup, search: { ...setup.search, seed: Math.max(0, Math.floor(v)) } })
            }
            help={t("optimization.search.seedHelp")}
          />
          <NumberField
            label={t("optimization.search.candidates")}
            value={setup.search.maxCandidates}
            onChange={(v) =>
              v !== null &&
              update({
                ...setup,
                search: { ...setup.search, maxCandidates: Math.max(1, Math.floor(v)) },
              })
            }
          />
        </div>
      </details>

      <OptimizationCriterion setup={setup} />
      <div className="row">
        <button
          type="button"
          className="button"
          onClick={run}
          disabled={running || setup.responses.length === 0}
        >
          {running ? t("optimization.run.running") : t("optimization.run.start")}
        </button>
        {running && (
          <button type="button" className="button secondary" onClick={cancel}>
            {t("optimization.run.cancel")}
          </button>
        )}
      </div>
      {setup.responses.length === 0 && (
        <p className="muted small" role="status">
          {t("optimization.run.needResponse")}
        </p>
      )}
      {notice && (
        <p role="status" className="muted">
          {notice}
        </p>
      )}
      {messages.length > 0 && (
        <div role="alert" className="error">
          {messages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      {result && (
        <div data-testid="optimization-result">
          {legacyDesirability && (
            <p role="status" className="error">
              {t("optimization.legacyDesirability")}
            </p>
          )}
          <BlockContextNote block={result.block} />
          {!current && (
            <p role="status" className="error">
              {t("optimization.stale")}
            </p>
          )}
          <p data-testid="optimization-status" role="status">
            {t(`optimization.status.${result.status}`)}
          </p>
          <ul className="facts-list">
            {result.facts.map((fact) => (
              <li key={fact.key + JSON.stringify(fact.params)}>
                {tr(`facts.${fact.key}`, formatFactParams(fact, language))}
              </li>
            ))}
          </ul>
          {result.issues.length > 0 && (
            <div role="note">
              <ul className="facts-list">
                {result.issues.map((issue) => (
                  <li key={issue.code}>{issueMessage(t, issue)}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="muted small" data-testid="convergence">
            {t("optimization.convergence", {
              starts: result.convergence.starts,
              converged: result.convergence.convergedStarts,
              feasible: result.convergence.feasibleStarts,
              distinct: result.convergence.distinctOptima,
              best: result.convergence.bestSolutionStarts,
              seed: String(result.convergence.seed),
            })}
          </p>
          {result.candidates.length > 0 && (
            <>
              <CandidateSummary result={result} language={language} />
              <CandidateTable
                result={result}
                language={language}
                variables={resultVariables}
                selected={selected}
                onToggle={
                  current && !legacyDesirability && result.status === "found"
                    ? (rank, on) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (on) next.add(rank);
                          else next.delete(rank);
                          return next;
                        })
                    : undefined
                }
              />
              <div className="row">
                <TableExportButtons
                  label={t("optimization.candidates.exportCsv")}
                  suffix="candidatos"
                  sheet={t("optimization.candidates.rank")}
                  header={candidatesTable(result).header}
                  rows={candidatesTable(result).rows}
                  metadata={optimizationMeta(state, result)}
                  fileBase="otimizacao"
                  onDone={setNotice}
                />
              </div>
              <TradeOffs result={result} language={language} />
              {current && !legacyDesirability && (
                <DesirabilityView
                  request={request}
                  result={result}
                  language={language}
                  selected={selected}
                />
              )}
              {current && !legacyDesirability && result.status === "found" && (
                <ConfirmationPanel
                  request={request}
                  result={result}
                  language={language}
                  selected={selected}
                />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Metadados dos arquivos exportados: método, versões, semente e configuração da otimização. */
function optimizationMeta(
  state: import("../../state/project").ProjectState,
  result: import("../../services/engine").OptimizationResult,
): Record<string, string> {
  const record = [...state.analyses]
    .reverse()
    .find((a) => a.methodId === result.provenance.methodId);
  return {
    app: "DesvTAG",
    experiment: state.name,
    methodId: `${result.provenance.methodId} v${result.provenance.methodVersion}`,
    engine: result.provenance.engineVersion,
    analysis: record?.id ?? "",
    revision: record?.revisionId ?? "",
    seed: String(result.convergence.seed),
    starts: String(result.convergence.starts),
    algorithm: result.convergence.algorithm,
    setup: JSON.stringify(state.optimization.setup ?? {}),
  };
}
