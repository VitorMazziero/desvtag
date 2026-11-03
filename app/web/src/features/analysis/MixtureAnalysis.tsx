// Análise de misturas (v0.3): modelos de Scheffé (linear, quadrático, cúbico especial) sem
// intercepto, ANOVA centrada na média, previsões sobre o triângulo (três componentes). O cálculo é
// do motor (`mixture.analyze`); o resultado é calculado ao pedir e **não é guardado no projeto**.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import type { MixtureAnalysis as Analysis, MixtureModel, Stat } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";
import { TableExportButtons } from "../results/TableExportButtons";
import { TernaryPlot } from "../results/TernaryPlot";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function MixtureAnalysis({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const spec = state.mixture;
  const responses = state.responses.filter((r) => r.name.trim() !== "");
  const [responseId, setResponseId] = useState(state.analysis.responseId ?? responses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [result, setResult] = useState<Analysis | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (!spec) return null;

  const fmt = (v: number | null, digits = 6) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const names = spec.components.map((c) => c.name);

  const fit = async () => {
    const responseIndex = state.responses.findIndex((r) => r.id === responseId);
    if (responseIndex < 0) return;
    const proportions: number[][] = [];
    const response: number[] = [];
    const bad: number[] = [];
    state.rows.forEach((row, i) => {
      const y = parseNumberCell(row.responses[responseIndex] ?? "");
      if (!y.ok) bad.push(i + 1);
      if (!y.ok || y.value === null) return;
      const p = spec.components.map((c) => {
        const k = state.factors.findIndex((f) => f.id === c.id);
        const parsed = parseNumberCell(row.factors[k] ?? "");
        return parsed.ok && parsed.value !== null ? parsed.value : Number.NaN;
      });
      proportions.push(p);
      response.push(y.value);
    });
    if (bad.length > 0) {
      setProblems([t("mixture.analysis.badCells", { rows: bad.slice(0, 5).join(", ") })]);
      return;
    }
    setBusy(true);
    setProblems([]);
    try {
      const r = await client.request(
        {
          type: "mixtureAnalyze",
          componentNames: names,
          lowerBounds: spec.components.map((c) => c.lower),
          proportions,
          response,
          model: state.mixtureModel,
          alpha: state.analysis.alpha,
        },
        { channel: "mixture-analysis" },
      );
      if (r.outcome.status === "ok" && r.outcome.result.type === "mixtureAnalyze") {
        setResult(r.outcome.result as unknown as Analysis);
      } else if (r.outcome.status === "error") {
        setResult(null);
        setProblems(engineErrorMessages(t, r.outcome.error));
      }
    } catch {
      // resposta obsoleta ou falha de transporte: o resultado atual permanece
    } finally {
      setBusy(false);
    }
  };

  const a = result?.fit.anova;
  const rows = result?.fit.coefficients ?? [];
  return (
    <section aria-labelledby="mixture-analysis-title" data-testid="mixture-analysis">
      <h2 id="mixture-analysis-title">{t("mixture.analysis.title")}</h2>
      <p className="muted">{t("mixture.analysis.intro")}</p>
      <div className="row">
        <label className="field">
          <span>{t("mixture.analysis.response")}</span>
          <select value={responseId} onChange={(e) => setResponseId(e.target.value)}>
            {responses.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("mixture.analysis.model")}</span>
          <select
            data-testid="mixture-model"
            value={state.mixtureModel}
            onChange={(e) =>
              dispatch({ type: "setMixtureModel", model: e.target.value as MixtureModel })
            }
          >
            <option value="linear">{t("mixture.analysis.models.linear")}</option>
            <option value="quadratic">{t("mixture.analysis.models.quadratic")}</option>
            {spec.components.length >= 3 && (
              <option value="specialCubic">{t("mixture.analysis.models.specialCubic")}</option>
            )}
          </select>
        </label>
        <button type="button" className="button" disabled={busy || !responseId} onClick={fit}>
          {t("mixture.analysis.fit")}
        </button>
      </div>
      {problems.length > 0 && (
        <div role="alert" className="error">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {result && a && (
        <>
          <p className="muted small">{t("mixture.analysis.note")}</p>
          <h3>{t("mixture.analysis.coefficients")}</h3>
          <TableExportButtons
            label={t("mixture.analysis.exportCsv")}
            suffix="de-scheffe"
            sheet={t("mixture.analysis.coefficients")}
            header={["term", "estimate", "std_error", "t", "p_value", "ci_lower", "ci_upper"]}
            rows={rows.map((r) => [
              r.label,
              num(r.estimate),
              num(r.stdError),
              num(r.tValue),
              num(r.pValue),
              num(r.ciLower),
              num(r.ciUpper),
            ])}
            metadata={{
              app: "EnziTAG Optima",
              method: `${result.provenance.methodId} v${result.provenance.methodVersion}`,
              engine: result.provenance.engineVersion,
              model: result.model,
            }}
            fileBase="coeficientes-scheffe"
            onDone={setNotice}
          />
          {notice && (
            <p role="status" className="muted small">
              {notice}
            </p>
          )}
          <div className="grid-scroll">
            <table className="results-table" data-testid="scheffe-coefficients">
              <thead>
                <tr>
                  <th scope="col">{t("mixture.analysis.term")}</th>
                  <th scope="col">{t("mixture.analysis.estimate")}</th>
                  <th scope="col">{t("mixture.analysis.se")}</th>
                  <th scope="col">t</th>
                  <th scope="col">p</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    <td>{fmt(num(r.estimate))}</td>
                    <td>{fmt(num(r.stdError))}</td>
                    <td>{fmt(num(r.tValue), 4)}</td>
                    <td>
                      {num(r.pValue) === null ? "—" : formatP(num(r.pValue) as number, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>{t("mixture.analysis.anova")}</h3>
          <div className="grid-scroll">
            <table className="results-table" data-testid="scheffe-anova">
              <thead>
                <tr>
                  <th scope="col">{t("mixture.analysis.source")}</th>
                  <th scope="col">GL</th>
                  <th scope="col">SQ</th>
                  <th scope="col">QM</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["model", a.model],
                    ["residual", a.residual],
                    ["total", a.total],
                  ] as const
                ).map(([key, row]) => (
                  <tr key={key}>
                    <th scope="row">{t(`mixture.analysis.${key === "model" ? "model_" : key}`)}</th>
                    <td>{row.df}</td>
                    <td>{fmt(num(row.sumSquares))}</td>
                    <td>{fmt(num(row.meanSquare))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p data-testid="scheffe-fit-stats">
            F = {fmt(num(a.f), 5)} · p ={" "}
            {num(a.pValue) === null ? "—" : formatP(num(a.pValue) as number, language)} · R² ={" "}
            {fmt(num(a.rSquared), 5)} · R² {t("mixture.analysis.adjusted")} ={" "}
            {fmt(num(a.adjustedRSquared), 5)}
          </p>
          {result.fit.issues.map((i) => (
            <p key={i.code + JSON.stringify(i.params)} role="status" className="muted">
              {issueMessage(t, i)}
            </p>
          ))}
          {result.grid.length > 0 && (
            <TernaryPlot
              names={names}
              grid={result.grid}
              points={state.rows.flatMap((row) => {
                const p = spec.components.map((c) => {
                  const k = state.factors.findIndex((f) => f.id === c.id);
                  const parsed = parseNumberCell(row.factors[k] ?? "");
                  return parsed.ok && parsed.value !== null ? parsed.value : Number.NaN;
                });
                const scale = 1 - spec.components.reduce((s, c) => s + c.lower, 0);
                const pseudo = p.map((x, k) => (x - (spec.components[k]?.lower ?? 0)) / scale);
                return pseudo.every(Number.isFinite) ? [pseudo] : [];
              })}
              label={t("mixture.analysis.ternaryLabel", {
                response: state.responses.find((r) => r.id === responseId)?.name ?? "",
              })}
              minLabel={t("mixture.analysis.min")}
              maxLabel={t("mixture.analysis.max")}
            />
          )}
        </>
      )}
    </section>
  );
}
