// Planejamento D e I-ótimo (v0.3): escolhe os fatores (faixa baixo–alto), o modelo, o critério e o
// número de ensaios, com restrições lineares e a opção de **ampliar** os ensaios já realizados.
// A busca é do motor (troca de Fedorov com vários inícios, semente registrada) e pode ser cancelada.
// O resultado vira a matriz do experimento, analisada como superfície de resposta.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import type {
  GeneratedOptimal,
  OptimalCriterion,
  OptimalModel,
  OptimalSpec,
} from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { freshId } from "../../state/project";
import { parseNumberCell } from "../data/editing";
import { TableExportButtons } from "../results/TableExportButtons";
import { collectionColumns } from "./collectionColumns";

const CHANNEL = "optimal-run";
const text = (value: number) => String(Number(value.toFixed(10)));

interface ConstraintDraft {
  coefficients: Record<string, string>;
  upper: string;
}

const number = (value: string | undefined): number => Number((value ?? "").replace(",", "."));

export function OptimalPanel({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const workspace = useWorkspace();
  const { client } = useEngine();

  const candidates = state.factors.filter((f) => f.kind === "numeric" && f.name.trim() !== "");
  const [chosen, setChosen] = useState<string[] | null>(null);
  const selected = candidates.filter((f) => (chosen ?? candidates.map((c) => c.id)).includes(f.id));
  const [ranges, setRanges] = useState<Record<string, { low: string; high: string }>>({});
  const [model, setModel] = useState<OptimalModel>("interactions");
  const [criterion, setCriterion] = useState<OptimalCriterion>("d");
  const [runs, setRuns] = useState(12);
  const [levels, setLevels] = useState<3 | 5>(3);
  const [starts, setStarts] = useState(10);
  const [randomize, setRandomize] = useState(true);
  const [seed, setSeed] = useState(randomSeed());
  const [constraints, setConstraints] = useState<ConstraintDraft[]>([]);
  const [augment, setAugment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [result, setResult] = useState<GeneratedOptimal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const fmt = (v: number | null | undefined, digits = 5) =>
    v === null || v === undefined ? "—" : formatSignificant(v, language, digits);

  // Ensaios já realizados: linhas com todos os fatores escolhidos numéricos e alguma resposta.
  const doneRows = state.rows.flatMap((row, index) => {
    const values = selected.map((f) => {
      const k = state.factors.findIndex((x) => x.id === f.id);
      const p = parseNumberCell(row.factors[k] ?? "");
      return p.ok && p.value !== null ? p.value : null;
    });
    const hasResponse = row.responses.some((c) => c.trim() !== "");
    return values.every((v) => v !== null) && hasResponse
      ? [{ index, values: values as number[] }]
      : [];
  });

  const rangeOf = (id: string) => ranges[id] ?? { low: "", high: "" };
  const spec = (): OptimalSpec | null => {
    if (selected.length === 0) return null;
    const factors = selected.map((f) => ({
      id: f.id,
      name: f.name,
      low: number(rangeOf(f.id).low),
      high: number(rangeOf(f.id).high),
    }));
    if (factors.some((f) => !Number.isFinite(f.low) || !Number.isFinite(f.high))) return null;
    return {
      factors,
      model,
      criterion,
      runs,
      levels,
      constraints: constraints.map((c) => ({
        coefficients: selected.map((f) => number(c.coefficients[f.id] ?? "0") || 0),
        upper: number(c.upper),
      })),
      fixedRuns: augment ? doneRows.map((r) => r.values) : [],
      starts,
      randomize,
      seed,
    };
  };

  const run = async () => {
    const s = spec();
    if (!s) {
      setProblems([t("design.optimal.needRanges")]);
      return;
    }
    setBusy(true);
    setProblems([]);
    setApplied(false);
    try {
      const r = await client.request({ type: "designOptimalGenerate", ...s }, { channel: CHANNEL });
      if (r.outcome.status === "ok" && r.outcome.result.type === "designOptimalGenerate") {
        setResult(r.outcome.result as unknown as GeneratedOptimal);
      } else if (r.outcome.status === "error") {
        setResult(null);
        setProblems(engineErrorMessages(t, r.outcome.error));
      }
    } catch {
      // cancelada ou substituída: nada a mostrar
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    client.cancel(CHANNEL);
    setBusy(false);
    setNotice(t("design.optimal.cancelled"));
  };

  const apply = () => {
    if (!result) return;
    if (!augment && state.rows.some((r) => r.responses.some((c) => c.trim() !== ""))) {
      if (!window.confirm(t("design.confirmReplace"))) return;
    }
    let counter = state.counters.row;
    const keep = augment ? state.rows : [];
    const fresh = result.runs
      .filter((r) => !r.fixed)
      .map((r) => {
        const id = freshId("o", counter, []);
        counter = id.counter;
        return {
          id: id.id,
          unitId: "",
          factors: state.factors.map((f) => {
            const k = result.spec.factors.findIndex((s) => s.id === f.id);
            return k < 0 ? "" : text(r.real[k] ?? 0);
          }),
          responses: state.responses.map(() => ""),
        };
      });
    dispatch({
      type: "applyOptimal",
      rows: [...keep, ...fresh],
      counters: { ...state.counters, row: counter },
      now: nowIso(),
    });
    setApplied(true);
  };

  const collection = collectionColumns(
    state,
    (result?.runs ?? []).map((r) => ({
      unit: "",
      levels: state.factors.map((f) => {
        const k = result?.spec.factors.findIndex((s) => s.id === f.id) ?? -1;
        return k < 0 ? undefined : text(r.real[k] ?? 0);
      }),
    })),
  );

  return (
    <section aria-labelledby="optimal-title" data-testid="optimal-panel" className="editor-card">
      <h2 id="optimal-title">{t("design.optimal.title")}</h2>
      <p className="muted">{t("design.optimal.intro")}</p>
      {candidates.length === 0 && (
        <p role="status" className="error">
          {t("design.optimal.needFactors")}
        </p>
      )}
      {candidates.length > 0 && (
        <>
          <fieldset className="editor-card">
            <legend>{t("design.optimal.factors")}</legend>
            {candidates.map((f) => (
              <div className="row" key={f.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={selected.some((s) => s.id === f.id)}
                    onChange={(e) =>
                      setChosen(
                        e.target.checked
                          ? [...selected.map((s) => s.id), f.id]
                          : selected.filter((s) => s.id !== f.id).map((s) => s.id),
                      )
                    }
                  />
                  <span>{f.name}</span>
                </label>
                <label className="field">
                  <span>{t("design.optimal.low", { name: f.name })}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rangeOf(f.id).low}
                    onChange={(e) =>
                      setRanges({ ...ranges, [f.id]: { ...rangeOf(f.id), low: e.target.value } })
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("design.optimal.high", { name: f.name })}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rangeOf(f.id).high}
                    onChange={(e) =>
                      setRanges({ ...ranges, [f.id]: { ...rangeOf(f.id), high: e.target.value } })
                    }
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <div className="row">
            <label className="field">
              <span>{t("design.optimal.model")}</span>
              <select value={model} onChange={(e) => setModel(e.target.value as OptimalModel)}>
                <option value="linear">{t("design.optimal.models.linear")}</option>
                <option value="interactions">{t("design.optimal.models.interactions")}</option>
                <option value="quadratic">{t("design.optimal.models.quadratic")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("design.optimal.criterion")}</span>
              <select
                value={criterion}
                onChange={(e) => setCriterion(e.target.value as OptimalCriterion)}
              >
                <option value="d">{t("design.optimal.criteria.d")}</option>
                <option value="i">{t("design.optimal.criteria.i")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("design.optimal.runs")}</span>
              <input
                type="number"
                min={1}
                max={60}
                value={runs}
                onChange={(e) => setRuns(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </label>
            <label className="field">
              <span>{t("design.optimal.levels")}</span>
              <select
                value={levels}
                onChange={(e) => setLevels(Number(e.target.value) === 5 ? 5 : 3)}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
            </label>
            <label className="field">
              <span>{t("design.optimal.starts")}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={starts}
                onChange={(e) =>
                  setStarts(Math.min(50, Math.max(1, Math.floor(Number(e.target.value) || 1))))
                }
              />
            </label>
          </div>
          <fieldset className="editor-card">
            <legend>{t("design.optimal.constraints")}</legend>
            {constraints.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: restrições são uma lista editável sem identidade.
              <div className="row" key={i}>
                {selected.map((f) => (
                  <label className="field" key={f.id}>
                    <span>{f.name}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={t("design.optimal.coefficient", { name: f.name, n: i + 1 })}
                      value={c.coefficients[f.id] ?? ""}
                      onChange={(e) =>
                        setConstraints(
                          constraints.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  coefficients: { ...x.coefficients, [f.id]: e.target.value },
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <label className="field">
                  <span>{t("design.optimal.upper")}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={t("design.optimal.upperLabel", { n: i + 1 })}
                    value={c.upper}
                    onChange={(e) =>
                      setConstraints(
                        constraints.map((x, j) => (j === i ? { ...x, upper: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setConstraints(constraints.filter((_, j) => j !== i))}
                >
                  {t("design.optimal.removeConstraint")}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary small"
              onClick={() => setConstraints([...constraints, { coefficients: {}, upper: "" }])}
            >
              {t("design.optimal.addConstraint")}
            </button>
            <p className="muted small">{t("design.optimal.constraintHelp")}</p>
          </fieldset>
          <label className="check">
            <input
              type="checkbox"
              checked={augment}
              disabled={doneRows.length === 0}
              onChange={(e) => setAugment(e.target.checked)}
            />
            <span>{t("design.optimal.augment", { count: doneRows.length })}</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            <span>{t("design.optimal.randomize")}</span>
          </label>
          <div className="row">
            <label className="field">
              <span>{t("design.seed")}</span>
              <input
                type="number"
                min={0}
                max={MAX_SEED}
                value={seed}
                onChange={(e) => setSeed(clampSeed(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="button secondary small"
              onClick={() => setSeed(randomSeed())}
            >
              {t("design.newSeed")}
            </button>
          </div>
          {problems.length > 0 && (
            <div role="alert" className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          <div className="row">
            <button type="button" className="button" disabled={busy} onClick={run}>
              {busy ? t("design.optimal.searching") : t("design.optimal.search")}
            </button>
            {busy && (
              <button type="button" className="button secondary" onClick={cancel}>
                {t("design.optimal.cancel")}
              </button>
            )}
          </div>
          {notice && (
            <p role="status" className="muted small">
              {notice}
            </p>
          )}
        </>
      )}
      {result && (
        <section aria-labelledby="optimal-result-title" data-testid="optimal-result">
          <h3 id="optimal-result-title">{t("design.optimal.result")}</h3>
          <p role="status" data-testid="optimal-summary">
            {t("design.optimal.summary", {
              runs: result.runs.length,
              candidates: result.candidates,
              reached: result.startsReachingBest,
              starts: result.startsRun,
            })}
          </p>
          <p className="muted small">{t("design.optimal.noGlobal")}</p>
          <div className="grid-scroll">
            <table className="results-table" data-testid="optimal-metrics">
              <tbody>
                <tr>
                  <th scope="row">{t("design.optimal.metrics.parameters")}</th>
                  <td>{result.metrics.parameters}</td>
                </tr>
                <tr>
                  <th scope="row">ln|X′X|</th>
                  <td>{fmt(result.metrics.logDet)}</td>
                </tr>
                <tr>
                  <th scope="row">{t("design.optimal.metrics.d")}</th>
                  <td>{fmt(result.metrics.dEfficiency)}</td>
                </tr>
                <tr>
                  <th scope="row">{t("design.optimal.metrics.a")}</th>
                  <td>{fmt(result.metrics.aEfficiency)}</td>
                </tr>
                <tr>
                  <th scope="row">{t("design.optimal.metrics.g")}</th>
                  <td>{fmt(result.metrics.gEfficiency)}</td>
                </tr>
                <tr>
                  <th scope="row">{t("design.optimal.metrics.i")}</th>
                  <td>{fmt(result.metrics.iAverage)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <TableExportButtons
            label={t("design.optimal.exportCsv")}
            suffix="otima"
            sheet={t("design.optimal.result")}
            header={[
              "run",
              "status",
              ...result.spec.factors.map((f) => f.name),
              ...collection.header,
            ]}
            rows={result.runs.map((r, i) => [
              r.run,
              r.fixed ? "done" : "new",
              ...r.real.map(text),
              ...(collection.cells[i] ?? []),
            ])}
            metadata={{
              app: "EnziTAG Optima",
              project: workspace.name,
              method: `${result.provenance.methodId} v${result.provenance.methodVersion}`,
              engine: result.provenance.engineVersion,
              criterion: result.spec.criterion === "d" ? "D-optimal" : "I-optimal",
              model: result.spec.model,
              candidates: String(result.candidates),
              starts: String(result.startsRun),
              seed: String(result.spec.seed),
              algorithm: result.algorithm,
            }}
            fileBase="matriz-otima"
            onDone={setNotice}
          />
          <p className="muted small" data-testid="collection-note">
            {t("design.collectionNote")}
          </p>
          <div className="grid-scroll">
            <table className="results-table" data-testid="optimal-table">
              <thead>
                <tr>
                  <th scope="col">{t("design.crd.matrix.run")}</th>
                  <th scope="col">{t("design.optimal.status")}</th>
                  {result.spec.factors.map((f) => (
                    <th scope="col" key={f.id}>
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.runs.map((r) => (
                  <tr key={r.run}>
                    <th scope="row">{r.run}</th>
                    <td>{r.fixed ? t("design.optimal.done") : t("design.optimal.new")}</td>
                    {r.real.map((v, k) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: colunas fixas, uma por fator.
                      <td key={k}>{text(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="button" onClick={apply}>
            {t("design.optimal.apply")}
          </button>
          {applied && (
            <p role="status" className="muted" data-testid="optimal-applied">
              {t("design.optimal.applied", { count: result.runs.filter((r) => !r.fixed).length })}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
