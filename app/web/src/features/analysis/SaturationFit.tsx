// Ajuste de curvas de saturação (v0.3): Monod / Michaelis–Menten, Haldane (inibição pelo substrato)
// e Hill, por Levenberg–Marquardt com vários inícios. O substrato é um fator **numérico** do
// experimento e a resposta, uma das respostas. O resultado é calculado ao pedir e **não é guardado
// no projeto**.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import type { NonlinearResult, SaturationModel, Stat } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";
import { SaturationChart } from "../results/SaturationChart";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function SaturationFit({
  language,
  embedded = false,
}: {
  language: Language;
  /** Dentro de uma janela do menu «Extras»: sempre aberto, sem o título recolhível. */
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const { client } = useEngine();
  const factors = state.factors.filter((f) => f.kind === "numeric" && f.name.trim() !== "");
  const responses = state.responses.filter((r) => r.name.trim() !== "");
  const [open, setOpen] = useState(false);
  const [factorId, setFactorId] = useState(factors[0]?.id ?? "");
  const [responseId, setResponseId] = useState(state.analysis.responseId ?? responses[0]?.id ?? "");
  const [model, setModel] = useState<SaturationModel>("monod");
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [result, setResult] = useState<NonlinearResult | null>(null);
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  // Entradas que produziram `result` (UX42): trocar fator, resposta, modelo ou dados o deixa
  // desatualizado em vez de apresentá-lo como se fosse do que está selecionado agora.
  const [fitted, setFitted] = useState<{
    signature: string;
    xLabel: string;
    yLabel: string;
  } | null>(null);
  const factorIndex = state.factors.findIndex((x) => x.id === factorId);
  const responseIndex = state.responses.findIndex((x) => x.id === responseId);
  const currentSignature = JSON.stringify([
    factorId,
    responseId,
    model,
    state.analysis.alpha,
    state.rows.map((row) => [row.factors[factorIndex] ?? "", row.responses[responseIndex] ?? ""]),
  ]);
  const stale = result !== null && fitted?.signature !== currentSignature;

  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const names: Record<SaturationModel, string[]> = {
    monod: ["μmax / Vmax", "Ks / Km"],
    haldane: ["μmax", "Ks", "Ki"],
    hill: ["Vmax", "K", "n"],
  };

  const run = async () => {
    const f = state.factors.findIndex((x) => x.id === factorId);
    const r = state.responses.findIndex((x) => x.id === responseId);
    if (f < 0 || r < 0) return;
    const xs: number[] = [];
    const ys: number[] = [];
    const bad: number[] = [];
    state.rows.forEach((row, i) => {
      const x = parseNumberCell(row.factors[f] ?? "");
      const y = parseNumberCell(row.responses[r] ?? "");
      if (!x.ok || !y.ok) bad.push(i + 1);
      else if (x.value !== null && y.value !== null) {
        xs.push(x.value);
        ys.push(y.value);
      }
    });
    if (bad.length > 0) {
      setProblems([t("saturation.badCells", { rows: bad.slice(0, 5).join(", ") })]);
      return;
    }
    setBusy(true);
    setProblems([]);
    try {
      const response = await client.request(
        {
          type: "modelNonlinear",
          x: xs,
          y: ys,
          model,
          initial: null,
          lower: null,
          upper: null,
          alpha: state.analysis.alpha,
        },
        { channel: "nonlinear" },
      );
      if (response.outcome.status === "ok" && response.outcome.result.type === "modelNonlinear") {
        setResult(response.outcome.result as unknown as NonlinearResult);
        setPoints(xs.map((x, i) => ({ x, y: ys[i] as number })));
        setFitted({
          signature: currentSignature,
          xLabel: state.factors[f]?.name ?? "S",
          yLabel: state.responses[r]?.name ?? "y",
        });
      } else if (response.outcome.status === "error") {
        setResult(null);
        setProblems(engineErrorMessages(t, response.outcome.error));
      }
    } catch {
      // resposta obsoleta ou falha de transporte
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      className={embedded ? "advanced embedded" : "advanced"}
      data-testid="saturation-fit"
      open={embedded || open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("saturation.title")}</summary>
      {(embedded || open) && (
        <>
          <p className="muted">{t("saturation.intro")}</p>
          {factors.length === 0 ? (
            <p className="muted">{t("saturation.needFactor")}</p>
          ) : (
            <div className="row">
              <label className="field">
                <span>{t("saturation.substrate")}</span>
                <select value={factorId} onChange={(e) => setFactorId(e.target.value)}>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("saturation.response")}</span>
                <select value={responseId} onChange={(e) => setResponseId(e.target.value)}>
                  {responses.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("saturation.model")}</span>
                <select
                  data-testid="saturation-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value as SaturationModel)}
                >
                  <option value="monod">{t("saturation.models.monod")}</option>
                  <option value="haldane">{t("saturation.models.haldane")}</option>
                  <option value="hill">{t("saturation.models.hill")}</option>
                </select>
              </label>
              <button type="button" className="button" disabled={busy} onClick={run}>
                {t("saturation.fit")}
              </button>
            </div>
          )}
          {problems.length > 0 && (
            <div role="alert" className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {result && (
            <section data-testid="saturation-result" data-stale={stale || undefined}>
              {stale && (
                <p role="status" className="stale-notice" data-testid="saturation-stale">
                  {t("saturation.stale")}
                </p>
              )}
              <h3>{t("saturation.parameters")}</h3>
              <div className="grid-scroll">
                <table className="results-table" data-testid="saturation-parameters">
                  <thead>
                    <tr>
                      <th scope="col">{t("saturation.parameter")}</th>
                      <th scope="col">{t("saturation.estimate")}</th>
                      <th scope="col">{t("saturation.se")}</th>
                      <th scope="col">{t("saturation.ci")}</th>
                      <th scope="col">p</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.parameters.map((p, i) => (
                      <tr key={p.name}>
                        <th scope="row">{names[result.model][i]}</th>
                        <td>{fmt(p.estimate, 6)}</td>
                        <td>{fmt(num(p.stdError), 4)}</td>
                        <td>
                          {fmt(num(p.ciLower), 4)} ; {fmt(num(p.ciUpper), 4)}
                        </td>
                        <td>
                          {num(p.pValue) === null
                            ? "—"
                            : formatP(num(p.pValue) as number, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p data-testid="saturation-stats">
                n = {result.n} · σ = {fmt(num(result.sigma), 5)} · R² ={" "}
                {fmt(num(result.rSquared), 5)} ·{" "}
                {t("saturation.starts", {
                  reached: result.startsReachingBest,
                  run: result.startsRun,
                })}
              </p>
              {result.issues.map((i) => (
                <p key={i.code} role="status" className="muted" data-testid="saturation-warning">
                  {t(`saturation.warn.${i.code.replace("nonlinear.", "")}`, {
                    defaultValue: i.code,
                  })}
                </p>
              ))}
              <SaturationChart
                points={points}
                curve={result.curve}
                xLabel={fitted?.xLabel ?? "S"}
                yLabel={fitted?.yLabel ?? "y"}
                label={t("saturation.chartLabel")}
              />
              <p className="muted small">{t("saturation.note")}</p>
            </section>
          )}
        </>
      )}
    </details>
  );
}
