// Calculadora de potência, tamanho de amostra e precisão (v0.3), para usar **antes** dos ensaios.
// As fórmulas são exatas (F e t não centrais); a potência vale para o σ e o efeito informados, que
// são suposições suas. O resultado é calculado ao pedir e não é guardado no projeto.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { PowerResult, Stat } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);
type Kind = "anova" | "oneSampleT" | "pairedT" | "twoSampleT";
type Goal = "sampleSizeFor" | "powerAt" | "precisionFor";

const toNumber = (text: string) => Number(text.replace(",", "."));

export function PowerCalculator({
  language,
  embedded = false,
}: {
  language: Language;
  /** Dentro de uma janela do menu «Extras»: sempre aberta, sem o título recolhível. */
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("twoSampleT");
  const [goal, setGoal] = useState<Goal>("sampleSizeFor");
  const [means, setMeans] = useState("10; 12; 14; 12");
  const [difference, setDifference] = useState("1");
  const [sigma, setSigma] = useState("1.5");
  const [alpha, setAlpha] = useState("0.05");
  const [target, setTarget] = useState("0.8");
  const [n, setN] = useState("10");
  const [halfWidth, setHalfWidth] = useState("0.5");
  const [twoSided, setTwoSided] = useState(true);
  const [result, setResult] = useState<PowerResult | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);

  const calculate = async () => {
    const design =
      kind === "anova"
        ? { type: "anova" as const, means: means.split(/[;\n]+/).map(toNumber) }
        : { type: kind, difference: toNumber(difference) };
    const goalSpec =
      goal === "sampleSizeFor"
        ? { type: "sampleSizeFor" as const, power: toNumber(target) }
        : goal === "powerAt"
          ? { type: "powerAt" as const, n: Math.floor(toNumber(n)) }
          : { type: "precisionFor" as const, halfWidth: toNumber(halfWidth) };
    setBusy(true);
    setProblems([]);
    try {
      const response = await client.request(
        {
          type: "powerAnalyze",
          design,
          sigma: toNumber(sigma),
          alpha: toNumber(alpha),
          twoSided,
          goal: goalSpec,
        },
        { channel: "power" },
      );
      if (response.outcome.status === "ok" && response.outcome.result.type === "powerAnalyze") {
        setResult(response.outcome.result as unknown as PowerResult);
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

  const unit = kind === "anova" || kind === "twoSampleT" ? t("power.perGroup") : t("power.units");
  return (
    <details
      className={embedded ? "advanced embedded" : "advanced"}
      data-testid="power-calculator"
      open={embedded || open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("power.title")}</summary>
      {(embedded || open) && (
        <>
          <p className="muted">{t("power.intro")}</p>
          <div className="row">
            <label className="field">
              <span>{t("power.design")}</span>
              <select
                data-testid="power-design"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as Kind);
                  if (e.target.value === "anova" && goal === "precisionFor")
                    setGoal("sampleSizeFor");
                }}
              >
                <option value="twoSampleT">{t("power.designs.twoSampleT")}</option>
                <option value="pairedT">{t("power.designs.pairedT")}</option>
                <option value="oneSampleT">{t("power.designs.oneSampleT")}</option>
                <option value="anova">{t("power.designs.anova")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("power.goal")}</span>
              <select
                data-testid="power-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
              >
                <option value="sampleSizeFor">{t("power.goals.sampleSizeFor")}</option>
                <option value="powerAt">{t("power.goals.powerAt")}</option>
                {kind !== "anova" && (
                  <option value="precisionFor">{t("power.goals.precisionFor")}</option>
                )}
              </select>
            </label>
          </div>
          <div className="row">
            {kind === "anova" ? (
              <label className="field">
                <span>{t("power.means")}</span>
                <input type="text" value={means} onChange={(e) => setMeans(e.target.value)} />
              </label>
            ) : goal !== "precisionFor" ? (
              <label className="field">
                <span>{t("power.difference")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={difference}
                  onChange={(e) => setDifference(e.target.value)}
                />
              </label>
            ) : null}
            <label className="field">
              <span>{t("power.sigma")}</span>
              <input
                type="text"
                inputMode="decimal"
                value={sigma}
                onChange={(e) => setSigma(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("power.alpha")}</span>
              <input
                type="text"
                inputMode="decimal"
                value={alpha}
                onChange={(e) => setAlpha(e.target.value)}
              />
            </label>
            {goal === "sampleSizeFor" && (
              <label className="field">
                <span>{t("power.target")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
            )}
            {goal === "powerAt" && (
              <label className="field">
                <span>{t("power.n")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={n}
                  onChange={(e) => setN(e.target.value)}
                />
              </label>
            )}
            {goal === "precisionFor" && (
              <label className="field">
                <span>{t("power.halfWidth")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={halfWidth}
                  onChange={(e) => setHalfWidth(e.target.value)}
                />
              </label>
            )}
          </div>
          {kind !== "anova" && goal !== "precisionFor" && (
            <label className="check">
              <input
                type="checkbox"
                checked={twoSided}
                onChange={(e) => setTwoSided(e.target.checked)}
              />
              <span>{t("power.twoSided")}</span>
            </label>
          )}
          <button type="button" className="button" disabled={busy} onClick={calculate}>
            {t("power.calculate")}
          </button>
          {problems.length > 0 && (
            <div role="alert" className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {result && (
            <section data-testid="power-result">
              <p role="status" data-testid="power-summary">
                {t("power.summary", {
                  n: result.n,
                  unit,
                  total: result.total,
                  power: fmt(num(result.power), 4),
                })}
              </p>
              <p className="muted small">
                {t("power.details", {
                  nc: fmt(result.noncentrality, 5),
                  df1: fmt(result.df1, 4),
                  critical: fmt(result.critical, 5),
                })}
                {num(result.halfWidth) !== null &&
                  ` ${t("power.halfWidthResult", { value: fmt(num(result.halfWidth), 4) })}`}
              </p>
              <div className="grid-scroll">
                <table className="results-table" data-testid="power-curve">
                  <thead>
                    <tr>
                      <th scope="col">n</th>
                      <th scope="col">{t("power.power")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.curve
                      .filter((_, i) => i % 3 === 0)
                      .map((p) => (
                        <tr key={p.n}>
                          <th scope="row">{p.n}</th>
                          <td>{fmt(p.power, 4)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small">{t("power.note")}</p>
            </section>
          )}
        </>
      )}
    </details>
  );
}
