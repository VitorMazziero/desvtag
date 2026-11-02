// Seleção e comparação de modelos (ET11): liga e desliga termos na própria tabela de resultados,
// compara o modelo completo, o atual e o recomendado (eliminação regressiva com hierarquia) e
// aplica a escolha. Todas as métricas vêm do motor (`surface.selectModel`).
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import { nowIso } from "../../lib/ids";
import type { ModelMetrics, SelectionResult, Stat, SurfaceResult } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import {
  buildDataset,
  buildOperation,
  buildSurfaceRequest,
  inputSignature,
  surfaceFactors,
} from "../analysis/buildRequest";
import {
  allSurfaceTerms,
  breaksHierarchy,
  termIdsFromSpecs,
  termKey,
  termLabel,
} from "../analysis/surfaceTerms";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function ModelPanel({ result, language }: { result: SurfaceResult; language: Language }) {
  const { t } = useTranslation("results");
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const [selection, setSelection] = useState<SelectionResult | null>(null);
  const [busy, setBusy] = useState(false);
  // Seleção mostrada enquanto o motor recalcula (a caixa muda na hora e é confirmada depois).
  const [optimistic, setOptimistic] = useState<Set<string> | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const factors = surfaceFactors(state);
  const ids = factors.map((f) => f.id);
  const nameOf = (id: string) => factors.find((f) => f.id === id)?.name ?? id;
  const idsKey = ids.join("|");
  const all = useMemo(() => allSurfaceTerms(idsKey === "" ? [] : idsKey.split("|")), [idsKey]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const signature = state.result?.signature ?? "";

  // Métricas e sequência de eliminação para o modelo atual.
  useEffect(() => {
    void signature; // recalcula quando dados, termos ou α mudam
    const current = stateRef.current;
    const responseId = current.analysis.responseId;
    if (responseId === null) return;
    let live = true;
    const { dataset } = buildDataset(current);
    client
      .request(
        { type: "surfaceSelectModel", ...buildSurfaceRequest(current, dataset, responseId) },
        { channel: "model-selection" },
      )
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "surfaceSelectModel") {
          setSelection(r.outcome.result as unknown as SelectionResult);
          setOptimistic(null);
          setProblems([]);
        } else if (r.outcome.status === "error") {
          setProblems(engineErrorMessages(t, r.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // `signature` (resultado guardado) muda quando dados, termos ou α mudam.
  }, [client, signature, t]);

  const applyTerms = async (next: string[][] | null) => {
    const nextState = { ...state, analysis: { ...state.analysis, designTerms: next } };
    const { dataset } = buildDataset(nextState);
    const operation = buildOperation(nextState, dataset);
    if (!operation) return;
    setBusy(true);
    setProblems([]);
    try {
      const response = await client.request(operation, { channel: "surface" });
      if (response.outcome.status === "ok" && response.outcome.result.type === "surfaceAnalyze") {
        const { type: _type, ...fresh } = response.outcome.result;
        dispatch({ type: "setAnalysis", patch: { designTerms: next } });
        dispatch({
          type: "storeResult",
          result: { signature: inputSignature(nextState), kind: "surface", result: fresh },
          now: nowIso(),
        });
      } else if (response.outcome.status === "error") {
        setProblems(engineErrorMessages(t, response.outcome.error));
        setOptimistic(null);
      }
    } catch {
      // resposta obsoleta ou falha de transporte: o resultado atual permanece
      setOptimistic(null);
    } finally {
      setBusy(false);
    }
  };

  // Trocar de resposta traz o modelo que ela já tinha (cada resposta guarda o seu).
  const switchResponse = async (responseId: string) => {
    const nextState = {
      ...state,
      analysis: {
        ...state.analysis,
        responseId,
        designTerms: state.analysis.responseModels[responseId] ?? null,
      },
    };
    const { dataset } = buildDataset(nextState);
    const operation = buildOperation(nextState, dataset);
    if (!operation) return;
    setBusy(true);
    setProblems([]);
    try {
      const response = await client.request(operation, { channel: "surface" });
      if (response.outcome.status === "ok" && response.outcome.result.type === "surfaceAnalyze") {
        const { type: _type, ...fresh } = response.outcome.result;
        dispatch({ type: "setAnalysis", patch: { responseId } });
        dispatch({
          type: "storeResult",
          result: { signature: inputSignature(nextState), kind: "surface", result: fresh },
          now: nowIso(),
        });
      } else if (response.outcome.status === "error") {
        setProblems(engineErrorMessages(t, response.outcome.error));
      }
    } catch {
      // resposta obsoleta ou falha de transporte: o resultado atual permanece
    } finally {
      setBusy(false);
    }
  };

  if (!selection) return problems.length > 0 ? <ProblemList problems={problems} /> : null;
  const current = selection.steps[0]?.metrics;
  const recommended = selection.steps[selection.steps.length - 1]?.metrics;
  if (!current || !recommended) return null;
  const currentTerms = termIdsFromSpecs(current.terms);
  const selectedKeys = optimistic ?? new Set(currentTerms.map(termKey));
  const isFull = currentTerms.length === all.length;
  const pOf = (term: string[]) => {
    const index = currentTerms.findIndex((c) => termKey(c) === termKey(term));
    const row = index >= 0 ? result.terms[index] : undefined;
    return row ? num(row.pValue) : null;
  };

  const toggle = (term: string[], on: boolean) => {
    const next = all.filter((x) =>
      termKey(x) === termKey(term) ? on : selectedKeys.has(termKey(x)),
    );
    if (!on && breaksHierarchy(term, next) && !window.confirm(t("model.confirmHierarchy"))) return;
    if (next.length === 0) return;
    setOptimistic(new Set(next.map(termKey)));
    void applyTerms(next.length === all.length ? null : next);
  };

  const fmt = (s: Stat) => {
    const v = num(s);
    return v === null ? "—" : formatSignificant(v, language, 4);
  };
  const fmtP = (s: Stat) => {
    const v = num(s);
    return v === null ? "—" : formatP(v, language);
  };
  const metricRows: Array<[string, (m: ModelMetrics) => string]> = [
    ["parameters", (m) => String(m.parameters)],
    ["dfError", (m) => String(m.dfError)],
    ["r2", (m) => fmt(m.rSquared)],
    ["adjR2", (m) => fmt(m.adjustedRSquared)],
    ["predR2", (m) => fmt(m.predictedRSquared)],
    ["rmse", (m) => fmt(m.rmse)],
    ["modelP", (m) => fmtP(m.modelPValue)],
    ["lofP", (m) => fmtP(m.lackOfFitPValue)],
    ["aicc", (m) => fmt(m.aicc)],
    ["bic", (m) => fmt(m.bic)],
  ];
  const warnings: string[] = [];
  const lof = num(current.lackOfFitPValue);
  if (lof !== null && lof < selection.alpha) warnings.push(t("model.warnLackOfFit"));
  if (current.dfError <= 3) warnings.push(t("model.warnFewDf", { df: current.dfError }));
  const adj = num(current.adjustedRSquared);
  const pred = num(current.predictedRSquared);
  if (adj !== null && pred !== null && adj - pred > 0.2) warnings.push(t("model.warnOverfit"));
  const recommendedTerms = termIdsFromSpecs(recommended.terms);
  const alreadyRecommended =
    termKey(recommendedTerms.flat()) === termKey(currentTerms.flat()) &&
    recommendedTerms.length === currentTerms.length;
  const stoppedText = t(`model.stopped.${selection.stoppedBecause}`, {
    defaultValue: selection.stoppedBecause,
  });

  return (
    <section className="panel" aria-labelledby="model-panel-title" data-testid="model-panel">
      <h3 id="model-panel-title">{t("model.title")}</h3>
      <p className="muted small">{t("model.intro")}</p>
      {state.responses.length > 1 && (
        <label className="field">
          <span>{t("model.response")}</span>
          <select
            data-testid="model-response"
            disabled={busy}
            value={state.analysis.responseId ?? ""}
            onChange={(e) => void switchResponse(e.target.value)}
          >
            {state.responses.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.id}
              </option>
            ))}
          </select>
          <small className="muted">{t("model.responseHelp")}</small>
        </label>
      )}
      <fieldset disabled={busy} className="editor-card">
        <legend>{t("model.terms")}</legend>
        <ul className="facts-list term-toggles">
          {all.map((term) => {
            const on = selectedKeys.has(termKey(term));
            const p = pOf(term);
            const weak = on && p !== null && p > selection.alpha;
            return (
              <li key={termKey(term)}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggle(term, e.target.checked)}
                    data-testid={`term-${termKey(term)}`}
                  />
                  <span>
                    {termLabel(term, nameOf)}
                    {on && p !== null && (
                      <span className={weak ? "term-weak" : "muted"}>
                        {" "}
                        — p = {formatP(p, language)}
                        {weak ? ` (${t("model.notSignificant")})` : ""}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="row">
          <button
            type="button"
            className="button secondary small"
            disabled={isFull || busy}
            onClick={() => void applyTerms(null)}
          >
            {t("model.useFull")}
          </button>
          <button
            type="button"
            className="button small"
            disabled={alreadyRecommended || busy}
            onClick={() =>
              void applyTerms(recommendedTerms.length === all.length ? null : recommendedTerms)
            }
            data-testid="apply-recommendation"
          >
            {t("model.applyRecommended")}
          </button>
        </div>
      </fieldset>
      {problems.length > 0 && <ProblemList problems={problems} />}

      <div className="grid-scroll">
        <table className="results-table" data-testid="model-compare">
          <caption>{t("model.compareCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("model.metric")}</th>
              <th scope="col">{t("model.full")}</th>
              <th scope="col">{t("model.current")}</th>
              <th scope="col">{t("model.recommended")}</th>
            </tr>
          </thead>
          <tbody>
            {metricRows.map(([key, get]) => (
              <tr key={key}>
                <th scope="row">{t(`model.metrics.${key}`)}</th>
                <td className="num">{get(selection.full)}</td>
                <td className="num">{get(current)}</td>
                <td className="num">{get(recommended)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">{t("model.metricsHelp")}</p>

      <h4>{t("model.sequence")}</h4>
      <ol className="facts-list" data-testid="model-sequence">
        {selection.steps.map((step, index) => (
          <li key={`${step.removed ?? "start"}-${step.metrics.parameters}`}>
            {step.removed === null
              ? t("model.stepStart")
              : t("model.stepRemove", {
                  term: step.removed,
                  p: fmtP(step.removedPValue),
                })}{" "}
            — R² {t("model.metrics.adjR2").toLowerCase()} {fmt(step.metrics.adjustedRSquared)}, AICc{" "}
            {fmt(step.metrics.aicc)}
            {index > 0 && (
              <button
                type="button"
                className="button secondary small"
                disabled={busy}
                onClick={() => {
                  const terms = termIdsFromSpecs(step.metrics.terms);
                  void applyTerms(terms.length === all.length ? null : terms);
                }}
              >
                {t("model.useStep")}
              </button>
            )}
          </li>
        ))}
      </ol>
      <p className="muted small">{stoppedText}</p>
      {warnings.length > 0 && (
        <div role="note">
          <ul className="facts-list">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted small">{t("model.optimism")}</p>
    </section>
  );
}

function ProblemList({ problems }: { problems: string[] }) {
  return (
    <div role="alert" className="error">
      {problems.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
