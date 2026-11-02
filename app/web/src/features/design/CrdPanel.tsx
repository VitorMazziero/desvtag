// U06 — delineamento inteiramente casualizado (DIC) de um fator categórico (caminho "Planejar
// experimento"). Níveis, contagem, ordem de execução e identificadores vêm do motor; aqui só há
// entrada de dados. Os níveis ficam gravados no próprio fator (`levelsText`).

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import type { CrdSpec, GeneratedCrd } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { splitLevels } from "../analysis/buildRequest";
import { CrdMatrix } from "./CrdMatrix";
import { rowsFromCrd } from "./crdRows";

export function CrdPanel() {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();

  const categorical = state.factors.filter((f) => f.kind === "categorical" && f.name.trim() !== "");
  const [factorId, setFactorId] = useState<string>(state.crd?.factorId ?? categorical[0]?.id ?? "");
  const factor = categorical.find((f) => f.id === factorId) ?? categorical[0];
  const [replicates, setReplicates] = useState(state.crd?.replicates ?? 5);
  const [randomize, setRandomize] = useState(state.crd?.randomize ?? true);
  const [seed, setSeed] = useState(state.crd?.seed ?? randomSeed());
  const [problems, setProblems] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const levels = factor ? splitLevels(factor.levelsText) : [];
  const candidate: CrdSpec | null = factor
    ? { factorId: factor.id, factorName: factor.name, levels, replicates, randomize, seed }
    : null;
  // Identidade estável: o efeito só reexecuta quando o conteúdo da especificação muda.
  const specKey = JSON.stringify(candidate);
  const spec: CrdSpec | null = useMemo(
    () => (specKey === "null" ? null : (JSON.parse(specKey) as CrdSpec)),
    [specKey],
  );

  // Pré-visualização: o motor valida e conta; erros e avisos aparecem antes de gerar.
  useEffect(() => {
    if (!spec) {
      setTotal(null);
      setProblems([]);
      setNotices([]);
      return;
    }
    let live = true;
    client
      .request({ type: "designCrdGenerate", ...spec }, { channel: "crd-preview" })
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "designCrdGenerate") {
          const generated = r.outcome.result as unknown as GeneratedCrd;
          setTotal(generated.total);
          setProblems([]);
          setNotices(generated.issues.map((issue) => issueMessage(t, issue)));
        } else if (r.outcome.status === "error") {
          setTotal(null);
          setNotices([]);
          setProblems(engineErrorMessages(t, r.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, spec, t]);

  const generate = async () => {
    if (!spec) return;
    if (
      state.design !== null ||
      state.crd !== null ||
      state.rows.some((r) => r.responses.some((c) => c.trim() !== ""))
    ) {
      if (!window.confirm(t("design.confirmReplace"))) return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await client.request(
        { type: "designCrdGenerate", ...spec },
        { channel: "crd-generate" },
      );
      if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "designCrdGenerate"
      ) {
        const generated = response.outcome.result as unknown as GeneratedCrd;
        const { rows, counters } = rowsFromCrd(generated, state);
        dispatch({ type: "applyCrd", crd: spec, rows, counters, now: nowIso() });
        setMessage(t("design.generated", { total: generated.total }));
      } else if (response.outcome.status === "error") {
        setProblems(engineErrorMessages(t, response.outcome.error));
      }
    } catch {
      setProblems([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="crd-title" data-testid="crd-panel">
      <h2 id="crd-title">{t("design.title")}</h2>
      <p className="muted">{t("design.crd.intro")}</p>
      {!factor && (
        <p role="status" className="error">
          {t("design.crd.needFactor")}
        </p>
      )}
      {factor && (
        <>
          {categorical.length > 1 && (
            <label className="field">
              <span>{t("design.crd.factor")}</span>
              <select value={factor.id} onChange={(e) => setFactorId(e.target.value)}>
                {categorical.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>{t("design.crd.levels")}</span>
            <textarea
              rows={4}
              value={factor.levelsText}
              onChange={(e) =>
                dispatch({
                  type: "updateFactor",
                  id: factor.id,
                  patch: { levelsText: e.target.value },
                })
              }
            />
            <small className="muted">{t("design.crd.levelsHelp")}</small>
          </label>
          <div className="row">
            <label className="field">
              <span>{t("design.crd.replicates")}</span>
              <input
                type="number"
                min={1}
                max={500}
                value={replicates}
                onChange={(e) =>
                  setReplicates(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
              />
            </label>
          </div>
          <p className="muted small">{t("design.crd.replicatesHelp")}</p>
          <label className="check">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            <span>{t("design.randomize")}</span>
          </label>
          {randomize && (
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
          )}
          {randomize && <p className="muted small">{t("design.seedHelp")}</p>}
          {total !== null && (
            <p data-testid="crd-count" role="status">
              {t("design.crd.count", { total, levels: levels.length, replicates })}
            </p>
          )}
          {notices.map((n) => (
            <p key={n} className="muted small" role="status">
              {n}
            </p>
          ))}
          {problems.length > 0 && (
            <div role="alert" className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            className="button"
            disabled={!spec || total === null || busy}
            onClick={generate}
          >
            {state.crd ? t("design.regenerate") : t("design.generate")}
          </button>
          {message && (
            <p role="status" className="muted" data-testid="crd-generated">
              {message}
            </p>
          )}
        </>
      )}
      {state.crd && <CrdMatrix spec={state.crd} />}
    </section>
  );
}
