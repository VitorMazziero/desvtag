// Medidas repetidas e dados dependentes (v0.3): comparação pareada (t pareado e Wilcoxon) e modelo
// linear misto com intercepto aleatório por unidade experimental (REML, Satterthwaite). Os dois usam
// a coluna «Unidade» da grade de dados. Os resultados são calculados ao pedir e **não são
// guardados no projeto**.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import type { MixedModelResult, PairedResult, Stat, TermSpec } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { buildDataset } from "./buildRequest";
import { formPairs, levelsOf } from "./pairing";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function RepeatedMeasures({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const { dataset: gridDataset } = buildDataset(state);
  // Unidade experimental (UX25): a coluna «Unidade» da grade (padrão) ou um fator categórico usado
  // como identificador da unidade, sem copiar valores para a coluna.
  const [unitSource, setUnitSource] = useState("");
  const unitFactor = state.factors.findIndex((f) => f.id === unitSource);
  const dataset = useMemo(
    () =>
      unitFactor < 0
        ? gridDataset
        : {
            ...gridDataset,
            observations: gridDataset.observations.map((o) => {
              const value = o.factors[unitFactor];
              const id =
                typeof value === "string"
                  ? value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 64)
                  : "";
              return { ...o, unitId: id === "" ? null : id };
            }),
          },
    [gridDataset, unitFactor],
  );
  const responses = state.responses.filter((r) => r.name.trim() !== "");
  const [responseId, setResponseId] = useState(state.analysis.responseId ?? responses[0]?.id ?? "");
  const twoLevel = state.factors.flatMap((f, i) =>
    f.kind === "categorical" && f.name.trim() !== "" && levelsOf(dataset, i).length === 2
      ? [{ id: f.id, name: f.name, index: i }]
      : [],
  );
  const [pairFactor, setPairFactor] = useState(twoLevel[0]?.id ?? "");
  const [fixed, setFixed] = useState<string[] | null>(null);
  const named = state.factors.filter((f) => f.name.trim() !== "");
  const chosenFixed = fixed ?? named.map((f) => f.id);
  const [paired, setPaired] = useState<PairedResult | null>(null);
  const [mixed, setMixed] = useState<MixedModelResult | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // O conteúdo só existe enquanto o painel está aberto (evita rótulos duplicados na etapa).
  const [open, setOpen] = useState(false);

  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const fmtP = (v: number | null) => (v === null ? "—" : formatP(v, language));
  const responseIndex = state.responses.findIndex((r) => r.id === responseId);
  const unitsFilled =
    unitFactor >= 0
      ? dataset.observations.some((o) => o.unitId !== null)
      : state.rows.some((r) => r.unitId.trim() !== "");
  const unitCandidates = state.factors.filter(
    (f) => f.kind === "categorical" && f.name.trim() !== "",
  );
  const pairPreview = (() => {
    const factor = twoLevel.find((f) => f.id === pairFactor);
    if (!factor || responseIndex < 0 || !unitsFilled) return null;
    return formPairs(dataset, factor.index, responseIndex);
  })();

  const runPaired = async () => {
    const factor = twoLevel.find((f) => f.id === pairFactor);
    if (!factor || responseIndex < 0) return;
    setMixed(null);
    if (unitSource === factor.id) {
      setPaired(null);
      setProblems([t("repeated.unit.sameAsPair")]);
      return;
    }
    const pairs = formPairs(dataset, factor.index, responseIndex);
    if (!pairs || pairs.units.length < 2) {
      setPaired(null);
      setProblems([t("repeated.paired.noPairs")]);
      return;
    }
    const notes: string[] = [];
    if (pairs.incomplete.length > 0)
      notes.push(
        t("repeated.paired.incomplete", { units: pairs.incomplete.slice(0, 5).join(", ") }),
      );
    if (pairs.duplicated.length > 0)
      notes.push(
        t("repeated.paired.duplicated", { units: pairs.duplicated.slice(0, 5).join(", ") }),
      );
    if (pairs.withoutUnit > 0)
      notes.push(t("repeated.paired.withoutUnit", { count: pairs.withoutUnit }));
    setBusy(true);
    setProblems(notes);
    try {
      const r = await client.request(
        {
          type: "comparisonPaired",
          first: pairs.first,
          second: pairs.second,
          alpha: state.analysis.alpha,
        },
        { channel: "paired" },
      );
      if (r.outcome.status === "ok" && r.outcome.result.type === "comparisonPaired") {
        setPaired(r.outcome.result as unknown as PairedResult);
      } else if (r.outcome.status === "error") {
        setPaired(null);
        setProblems([...notes, ...engineErrorMessages(t, r.outcome.error)]);
      }
    } catch {
      // resposta obsoleta ou falha de transporte
    } finally {
      setBusy(false);
    }
  };

  const runMixed = async () => {
    if (responseIndex < 0) return;
    // O fator que identifica a unidade não é efeito fixo: ele define o efeito aleatório.
    const terms: TermSpec[] = chosenFixed
      .filter((id) => id !== unitSource)
      .map((id) => ({ type: "main", factorId: id }));
    setPaired(null);
    setBusy(true);
    setProblems([]);
    try {
      const r = await client.request(
        {
          type: "modelMixed",
          dataset,
          spec: {
            responseId,
            intercept: true,
            terms,
            coding: "treatment",
            confidenceLevel: 1 - state.analysis.alpha,
          },
        },
        { channel: "mixed" },
      );
      if (r.outcome.status === "ok" && r.outcome.result.type === "modelMixed") {
        setMixed(r.outcome.result as unknown as MixedModelResult);
      } else if (r.outcome.status === "error") {
        setMixed(null);
        setProblems(engineErrorMessages(t, r.outcome.error));
      }
    } catch {
      // resposta obsoleta ou falha de transporte
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      className="advanced"
      data-testid="repeated-measures"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("repeated.title")}</summary>
      {open && (
        <>
          <p className="muted">{t("repeated.intro")}</p>
          <label className="field" data-testid="repeated-unit-source">
            <span>{t("repeated.unit.label")}</span>
            <select value={unitSource} onChange={(e) => setUnitSource(e.target.value)}>
              <option value="">{t("repeated.unit.grid")}</option>
              {unitCandidates.map((f) => (
                <option key={f.id} value={f.id}>
                  {t("repeated.unit.factor", { name: f.name })}
                </option>
              ))}
            </select>
            <small className="muted">{t("repeated.unit.help")}</small>
          </label>
          {pairPreview && (
            <p className="muted small" role="status" data-testid="repeated-unit-summary">
              {t("repeated.unit.summary", {
                complete: pairPreview.units.length,
                incomplete: pairPreview.incomplete.length,
                duplicated: pairPreview.duplicated.length,
              })}
            </p>
          )}
          {!unitsFilled && unitSource === "" && (
            <div role="status" className="muted" data-testid="repeated-need-units">
              <p>{t("repeated.needUnits")}</p>
              <button
                type="button"
                className="button secondary small"
                onClick={() => dispatch({ type: "setUnitColumn", visible: true })}
              >
                {t("repeated.showUnitColumn")}
              </button>
            </div>
          )}
          <div className="row">
            <label className="field">
              <span>{t("repeated.response")}</span>
              <select value={responseId} onChange={(e) => setResponseId(e.target.value)}>
                {responses.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>{t("repeated.paired.title")}</h3>
          {twoLevel.length === 0 ? (
            <p className="muted">{t("repeated.paired.needTwoLevels")}</p>
          ) : (
            <div className="row">
              <label className="field">
                <span>{t("repeated.paired.factor")}</span>
                <select value={pairFactor} onChange={(e) => setPairFactor(e.target.value)}>
                  {twoLevel.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="button" disabled={busy} onClick={runPaired}>
                {t("repeated.paired.run")}
              </button>
            </div>
          )}

          <h3>{t("repeated.mixed.title")}</h3>
          <fieldset className="editor-card">
            <legend>{t("repeated.mixed.fixed")}</legend>
            {named.map((f) => (
              <label className="check" key={f.id}>
                <input
                  type="checkbox"
                  checked={chosenFixed.includes(f.id)}
                  onChange={(e) =>
                    setFixed(
                      e.target.checked
                        ? [...chosenFixed, f.id]
                        : chosenFixed.filter((id) => id !== f.id),
                    )
                  }
                />
                <span>{f.name}</span>
              </label>
            ))}
          </fieldset>
          <button type="button" className="button" disabled={busy} onClick={runMixed}>
            {t("repeated.mixed.run")}
          </button>

          {problems.length > 0 && (
            <div role="alert" className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}

          {paired && (
            <section data-testid="paired-result">
              <h4>{t("repeated.paired.result", { n: paired.n })}</h4>
              <div className="grid-scroll">
                <table className="results-table">
                  <tbody>
                    <tr>
                      <th scope="row">{t("repeated.paired.meanDiff")}</th>
                      <td>{fmt(num(paired.tTest.meanDifference))}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t("repeated.paired.sd")}</th>
                      <td>{fmt(num(paired.tTest.sdDifference))}</td>
                    </tr>
                    <tr>
                      <th scope="row">t ({paired.tTest.df} gl)</th>
                      <td>{fmt(num(paired.tTest.t), 4)}</td>
                    </tr>
                    <tr>
                      <th scope="row">p (t)</th>
                      <td data-testid="paired-p">{fmtP(num(paired.tTest.pValue))}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t("repeated.paired.ci")}</th>
                      <td>
                        {fmt(num(paired.tTest.ciLower))} ; {fmt(num(paired.tTest.ciUpper))}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">
                        d<sub>z</sub>
                      </th>
                      <td>{fmt(num(paired.tTest.effectSize), 4)}</td>
                    </tr>
                    {paired.wilcoxon && (
                      <>
                        <tr>
                          <th scope="row">{t("repeated.paired.wilcoxon")}</th>
                          <td>
                            W = {fmt(paired.wilcoxon.statistic, 5)} (n = {paired.wilcoxon.nUsed};{" "}
                            {t(`repeated.paired.method.${paired.wilcoxon.method}`)})
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">p (Wilcoxon)</th>
                          <td data-testid="wilcoxon-p">{fmtP(num(paired.wilcoxon.pValue))}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="muted small">{t("repeated.paired.note")}</p>
            </section>
          )}

          {mixed && (
            <section data-testid="mixed-result">
              <h4>{t("repeated.mixed.result", { n: mixed.nObservations, g: mixed.nGroups })}</h4>
              <div className="grid-scroll">
                <table className="results-table" data-testid="mixed-coefficients">
                  <thead>
                    <tr>
                      <th scope="col">{t("repeated.mixed.term")}</th>
                      <th scope="col">{t("repeated.mixed.estimate")}</th>
                      <th scope="col">{t("repeated.mixed.se")}</th>
                      <th scope="col">{t("repeated.mixed.df")}</th>
                      <th scope="col">t</th>
                      <th scope="col">p</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixed.coefficients.map((c) => (
                      <tr key={c.label}>
                        <th scope="row">{c.label}</th>
                        <td>{fmt(c.estimate, 6)}</td>
                        <td>{fmt(num(c.stdError), 4)}</td>
                        <td>{fmt(num(c.df), 4)}</td>
                        <td>{fmt(num(c.tValue), 4)}</td>
                        <td>{fmtP(num(c.pValue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p data-testid="variance-components">
                {t("repeated.mixed.varianceUnit")} σ²ᵤ = {fmt(num(mixed.varianceUnit), 5)} ·{" "}
                {t("repeated.mixed.varianceResidual")} σ²ₑ = {fmt(num(mixed.varianceResidual), 5)} ·
                ICC = {fmt(num(mixed.icc), 4)}
              </p>
              {mixed.boundary && (
                <p role="status" className="muted">
                  {t("repeated.mixed.boundary")}
                </p>
              )}
              <p className="muted small">{t("repeated.mixed.note")}</p>
            </section>
          )}
        </>
      )}
    </details>
  );
}
