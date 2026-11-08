// Seleção e comparação de modelos de efeitos de planejamentos de dois níveis (ET14-T03): liga e
// desliga efeitos principais e interações de dois fatores, compara o modelo completo, o atual e o
// recomendado (eliminação regressiva com hierarquia) e aplica a escolha. As métricas vêm do motor
// (`design.selectModel`); o texto é o mesmo do painel de superfícies.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import { nowIso } from "../../lib/ids";
import type {
  DesignAnalysisResult,
  ModelMetrics,
  SelectionResult,
  Stat,
} from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { buildDataset, buildOperation, inputSignature } from "../analysis/buildRequest";
import { breaksHierarchy, termIdsFromSpecs, termKey, termLabel } from "../analysis/surfaceTerms";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

/** Efeitos principais e todas as interações de dois fatores, na ordem do planejamento. */
function allTwoLevelTerms(ids: string[]): string[][] {
  return [...ids.map((id) => [id]), ...ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b]))];
}

export function DesignModelPanel({
  result,
  language,
}: {
  result: DesignAnalysisResult;
  language: Language;
}) {
  const { t } = useTranslation("results");
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const [selection, setSelection] = useState<SelectionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState<Set<string> | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const factors = state.design?.factors ?? [];
  const ids = factors.map((f) => f.id);
  const nameOf = (id: string) => factors.find((f) => f.id === id)?.name ?? id;
  const idsKey = ids.join("|");
  const all = useMemo(() => allTwoLevelTerms(idsKey === "" ? [] : idsKey.split("|")), [idsKey]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const signature = state.result?.signature ?? "";

  // Métricas e sequência de eliminação para o modelo atual.
  useEffect(() => {
    void signature; // recalcula quando dados, termos ou α mudam
    const current = stateRef.current;
    const { dataset } = buildDataset(current);
    const operation = buildOperation(current, dataset);
    if (operation?.type !== "designAnalyze") return;
    let live = true;
    client
      .request({ ...operation, type: "designSelectModel" }, { channel: "model-selection" })
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "designSelectModel") {
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
  }, [client, signature, t]);

  const applyTerms = async (next: string[][]) => {
    const nextState = { ...state, analysis: { ...state.analysis, designTerms: next } };
    const { dataset } = buildDataset(nextState);
    const operation = buildOperation(nextState, dataset);
    if (!operation) return;
    setBusy(true);
    setProblems([]);
    try {
      const response = await client.request(operation, { channel: "design" });
      if (response.outcome.status === "ok" && response.outcome.result.type === "designAnalyze") {
        const { type: _type, ...fresh } = response.outcome.result;
        dispatch({ type: "setAnalysis", patch: { designTerms: next } });
        dispatch({
          type: "storeResult",
          result: { signature: inputSignature(nextState), kind: "design", result: fresh },
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

  if (!selection) return problems.length > 0 ? <ProblemList problems={problems} /> : null;
  const current = selection.steps[0]?.metrics;
  const recommended = selection.steps[selection.steps.length - 1]?.metrics;
  if (!current || !recommended) return null;
  const currentTerms = termIdsFromSpecs(current.terms);
  const selectedKeys = optimistic ?? new Set(currentTerms.map(termKey));
  const isFull = currentTerms.length === all.length;
  const pOf = (term: string[]) => {
    const index = currentTerms.findIndex((c) => termKey(c) === termKey(term));
    const row = index >= 0 ? result.effects[index] : undefined;
    return row ? num(row.pValue) : null;
  };

  const toggle = (term: string[], on: boolean) => {
    const next = all.filter((x) =>
      termKey(x) === termKey(term) ? on : selectedKeys.has(termKey(x)),
    );
    if (!on && breaksHierarchy(term, next) && !window.confirm(t("design.model.confirmHierarchy")))
      return;
    if (next.length === 0) return;
    setOptimistic(new Set(next.map(termKey)));
    void applyTerms(next);
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
    recommendedTerms.length === currentTerms.length &&
    recommendedTerms.every((term, i) => termKey(term) === termKey(currentTerms[i] ?? []));
  const stoppedText = t(`model.stopped.${selection.stoppedBecause}`, {
    defaultValue: selection.stoppedBecause,
  });

  return (
    <section className="panel" aria-labelledby="model-panel-title" data-testid="model-panel">
      <h3 id="model-panel-title">{t("design.model.title")}</h3>
      <p className="muted small" data-report-skip>
        {t("design.model.intro")}
      </p>
      <fieldset data-report-skip disabled={busy} className="editor-card">
        <legend>{t("design.model.terms")}</legend>
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
            onClick={() => void applyTerms(all)}
          >
            {t("model.useFull")}
          </button>
          <button
            type="button"
            className="button small"
            disabled={alreadyRecommended || busy}
            onClick={() => void applyTerms(recommendedTerms)}
            data-testid="apply-recommendation"
          >
            {t("model.applyRecommended")}
          </button>
        </div>
      </fieldset>
      {problems.length > 0 && <ProblemList problems={problems} />}

      <p data-testid="final-model">
        {t("model.finalTerms", {
          terms: currentTerms.map((term) => termLabel(term, nameOf)).join(" + "),
          removed:
            all
              .filter((term) => !currentTerms.some((current) => termKey(current) === termKey(term)))
              .map((term) => termLabel(term, nameOf))
              .join(", ") || "—",
        })}
      </p>
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
              : t("model.stepRemove", { term: step.removed, p: fmtP(step.removedPValue) })}{" "}
            — R² {t("model.metrics.adjR2").toLowerCase()} {fmt(step.metrics.adjustedRSquared)}, AICc{" "}
            {fmt(step.metrics.aicc)}
            {index > 0 && (
              <button
                type="button"
                className="button secondary small"
                disabled={busy}
                onClick={() => void applyTerms(termIdsFromSpecs(step.metrics.terms))}
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
