// Fatorial completo de níveis mistos (v0.3): dois ou mais fatores com números de níveis diferentes,
// repetições e ordem de execução aleatorizada com semente. A geração é do motor; a análise segue
// pela ANOVA multifatorial (médias marginais e contrastes).
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import type { GeneratedMixed, MixedSpec } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { freshId } from "../../state/project";
import { splitLevels } from "../analysis/buildRequest";
import { TableExportButtons } from "../results/TableExportButtons";
import { collectionColumns } from "./collectionColumns";

/** Identificador da unidade: níveis (1-based) separados por ponto e a repetição. */
export function mixedUnitId(run: { levelIndices: number[]; replicate: number }): string {
  return `C${run.levelIndices.map((i) => i + 1).join(".")}-R${run.replicate}`;
}

export function MixedPanel() {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const workspace = useWorkspace();
  const { client } = useEngine();

  // Fatores nomeados que já têm pelo menos dois níveis digitados.
  const candidates = state.factors.filter(
    (f) => f.name.trim() !== "" && splitLevels(f.levelsText).length >= 2,
  );
  const [chosen, setChosen] = useState<string[] | null>(
    state.mixed ? state.mixed.factors.map((f) => f.id) : null,
  );
  const selected = candidates.filter((f) => (chosen ?? candidates.map((c) => c.id)).includes(f.id));
  const [replicates, setReplicates] = useState(state.mixed?.replicates ?? 2);
  const [randomize, setRandomize] = useState(state.mixed?.randomize ?? true);
  const [seed, setSeed] = useState(state.mixed?.seed ?? randomSeed());
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shown, setShown] = useState<GeneratedMixed | null>(null);
  const [shownKey, setShownKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const candidate: MixedSpec | null =
    selected.length >= 2
      ? {
          factors: selected.map((f) => ({
            id: f.id,
            name: f.name,
            levels: splitLevels(f.levelsText),
          })),
          replicates,
          randomize,
          seed,
        }
      : null;
  const specKey = JSON.stringify(candidate);
  const spec: MixedSpec | null = useMemo(
    () => (specKey === "null" ? null : (JSON.parse(specKey) as MixedSpec)),
    [specKey],
  );

  useEffect(() => {
    if (!spec) {
      setShown(null);
      setProblems([]);
      return;
    }
    let live = true;
    client
      .request({ type: "designMixedGenerate", ...spec }, { channel: "mixed-preview" })
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "designMixedGenerate") {
          setShown(r.outcome.result as unknown as GeneratedMixed);
          setShownKey(JSON.stringify(spec));
          setProblems([]);
        } else if (r.outcome.status === "error") {
          setShown(null);
          setProblems(engineErrorMessages(t, r.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, spec, t]);

  const generate = () => {
    if (!spec || !shown || shownKey !== specKey) return;
    if (
      state.design !== null ||
      state.crd !== null ||
      state.rcbd !== null ||
      state.mixed !== null ||
      state.rows.some((r) => r.responses.some((c) => c.trim() !== ""))
    ) {
      if (!window.confirm(t("design.confirmReplace"))) return;
    }
    setBusy(true);
    setMessage(null);
    let counter = state.counters.row;
    const rows = shown.runs.map((run) => {
      const fresh = freshId("o", counter, []);
      counter = fresh.counter;
      return {
        id: fresh.id,
        unitId: mixedUnitId(run),
        factors: state.factors.map((f) => {
          const k = spec.factors.findIndex((s) => s.id === f.id);
          return k < 0 ? "" : (run.levels[k] ?? "");
        }),
        responses: state.responses.map(() => ""),
      };
    });
    const ids = spec.factors.map((f) => f.id);
    dispatch({
      type: "applyMixed",
      mixed: spec,
      rows,
      counters: { ...state.counters, row: counter },
      factorial: {
        factorIds: ids,
        blockId: null,
        interactionOrder: Math.min(ids.length, 3),
        ssType: "typeIII",
        marginals: ids.slice(0, 1).map((id) => ({ factors: [id], adjustment: "tukey" as const })),
        contrasts: [],
      },
      now: nowIso(),
    });
    setMessage(t("design.generated", { total: shown.total }));
    setBusy(false);
  };

  const collection = collectionColumns(
    state,
    (shown?.runs ?? []).map((r) => ({
      unit: mixedUnitId(r),
      levels: state.factors.map((f) => {
        const k = spec?.factors.findIndex((s) => s.id === f.id) ?? -1;
        return k < 0 ? undefined : r.levels[k];
      }),
    })),
  );

  return (
    <section aria-labelledby="mixed-title" data-testid="mixed-panel" className="editor-card">
      <h2 id="mixed-title">{t("design.mixed.title")}</h2>
      <p className="muted">{t("design.mixed.intro")}</p>
      {candidates.length < 2 && (
        <p role="status" className="error">
          {t("design.mixed.needFactors")}
        </p>
      )}
      {candidates.length >= 2 && (
        <>
          <fieldset className="editor-card">
            <legend>{t("design.mixed.factors")}</legend>
            {candidates.map((f) => (
              <label className="check" key={f.id}>
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
                <span>
                  {f.name} (
                  {t("design.mixed.levelCount", { count: splitLevels(f.levelsText).length })})
                </span>
              </label>
            ))}
            <p className="muted small">{t("design.mixed.levelsHelp")}</p>
          </fieldset>
          <div className="row">
            <label className="field">
              <span>{t("design.mixed.replicates")}</span>
              <input
                type="number"
                min={1}
                value={replicates}
                onChange={(e) =>
                  setReplicates(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            <span>{t("design.mixed.randomize")}</span>
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
          {shown && (
            <p data-testid="mixed-count" role="status">
              {t("design.mixed.count", {
                total: shown.total,
                combinations: shown.combinations,
                replicates: shown.spec.replicates,
              })}
            </p>
          )}
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
            disabled={!spec || !shown || busy || shownKey !== specKey}
            onClick={generate}
          >
            {state.mixed ? t("design.regenerate") : t("design.generate")}
          </button>
          {message && (
            <p role="status" className="muted" data-testid="mixed-generated">
              {message}
            </p>
          )}
        </>
      )}
      {state.mixed && shown && (
        <section aria-labelledby="mixed-matrix-title" data-testid="mixed-matrix">
          <h3 id="mixed-matrix-title">{t("design.mixed.matrix")}</h3>
          <TableExportButtons
            label={t("design.mixed.exportCsv")}
            suffix="de-niveis-mistos"
            sheet={t("design.mixed.matrix")}
            header={[
              "run",
              "standard_order",
              "unit_id",
              ...state.mixed.factors.map((f) => f.name),
              "replicate",
              ...collection.header,
            ]}
            rows={shown.runs.map((r, i) => [
              r.run,
              r.standardOrder,
              mixedUnitId(r),
              ...r.levels,
              r.replicate,
              ...(collection.cells[i] ?? []),
            ])}
            metadata={{
              app: "EnziTAG Optima",
              project: workspace.name,
              method: `${shown.provenance.methodId} v${shown.provenance.methodVersion}`,
              engine: shown.provenance.engineVersion,
              design: "mixed-levels full factorial",
              replicates: String(state.mixed.replicates),
              randomized: String(state.mixed.randomize),
              seed: String(state.mixed.seed),
              randomization: shown.randomizationAlgorithm,
            }}
            fileBase="matriz-niveis-mistos"
            onDone={setNotice}
          />
          <p className="muted small" data-testid="collection-note">
            {t("design.collectionNote")}
          </p>
          {notice && (
            <p role="status" className="muted small">
              {notice}
            </p>
          )}
          <div className="grid-scroll">
            <table className="results-table" data-testid="mixed-table">
              <thead>
                <tr>
                  <th scope="col">{t("design.crd.matrix.run")}</th>
                  <th scope="col">{t("design.crd.matrix.standard")}</th>
                  <th scope="col">{t("design.crd.matrix.unit")}</th>
                  {state.mixed.factors.map((f) => (
                    <th scope="col" key={f.id}>
                      {f.name}
                    </th>
                  ))}
                  <th scope="col">{t("design.crd.matrix.replicate")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.runs.slice(0, 200).map((r) => (
                  <tr key={r.run}>
                    <th scope="row">{r.run}</th>
                    <td>{r.standardOrder}</td>
                    <td>{mixedUnitId(r)}</td>
                    {r.levels.map((l, k) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: colunas fixas, uma por fator.
                      <td key={k}>{l}</td>
                    ))}
                    <td>{r.replicate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            {t("design.crd.algorithm", {
              algorithm: shown.randomizationAlgorithm,
              seed: state.mixed.seed,
            })}
          </p>
        </section>
      )}
    </section>
  );
}
