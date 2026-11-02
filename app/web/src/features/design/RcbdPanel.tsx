// Delineamento em blocos completos casualizados (DBC): cada bloco recebe todos os tratamentos uma
// vez, em ordem sorteada dentro do bloco com semente registrada. A ordem vem do motor; aqui só há
// entrada de dados. Os níveis ficam gravados nos fatores (`levelsText`).

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import type { GeneratedRcbd, RcbdSpec } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { freshId } from "../../state/project";
import { splitLevels } from "../analysis/buildRequest";
import { TableExportButtons } from "../results/TableExportButtons";
import { collectionColumns } from "./collectionColumns";

export function RcbdPanel() {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const workspace = useWorkspace();
  const { client } = useEngine();

  const categorical = state.factors.filter((f) => f.kind === "categorical" && f.name.trim() !== "");
  const [treatmentId, setTreatmentId] = useState(state.rcbd?.factorId ?? categorical[0]?.id ?? "");
  const treatment = categorical.find((f) => f.id === treatmentId) ?? categorical[0];
  const blockCandidates = categorical.filter((f) => f.id !== treatment?.id);
  const [blockId, setBlockId] = useState(
    state.analysis.factorial?.blockId ?? blockCandidates[0]?.id ?? "",
  );
  const block = blockCandidates.find((f) => f.id === blockId) ?? blockCandidates[0];
  const [randomize, setRandomize] = useState(state.rcbd?.randomize ?? true);
  const [seed, setSeed] = useState(state.rcbd?.seed ?? randomSeed());
  const [total, setTotal] = useState<number | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shown, setShown] = useState<GeneratedRcbd | null>(null);
  // A matriz só vale para a especificação com que foi calculada (evita gravar a de um sorteio anterior).
  const [shownKey, setShownKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const candidate: RcbdSpec | null =
    treatment && block
      ? {
          factorId: treatment.id,
          factorName: treatment.name,
          levels: splitLevels(treatment.levelsText),
          blockName: block.name,
          blocks: splitLevels(block.levelsText),
          randomize,
          seed,
        }
      : null;
  const specKey = JSON.stringify(candidate);
  const spec: RcbdSpec | null = useMemo(
    () => (specKey === "null" ? null : (JSON.parse(specKey) as RcbdSpec)),
    [specKey],
  );

  useEffect(() => {
    if (!spec) {
      setTotal(null);
      setProblems([]);
      return;
    }
    let live = true;
    client
      .request({ type: "designRcbdGenerate", ...spec }, { channel: "rcbd-preview" })
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "designRcbdGenerate") {
          const generated = r.outcome.result as unknown as GeneratedRcbd;
          setTotal(generated.total);
          setShown(generated);
          setShownKey(JSON.stringify(spec));
          setProblems([]);
        } else if (r.outcome.status === "error") {
          setTotal(null);
          setShown(null);
          setProblems(engineErrorMessages(t, r.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, spec, t]);

  const generate = async () => {
    if (!spec || !treatment || !block || !shown || shownKey !== specKey) return;
    if (
      state.design !== null ||
      state.crd !== null ||
      state.rcbd !== null ||
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
        unitId: `B${run.blockIndex + 1}-T${run.levelIndex + 1}`,
        factors: state.factors.map((f) =>
          f.id === treatment.id ? run.level : f.id === block.id ? run.block : "",
        ),
        responses: state.responses.map(() => ""),
      };
    });
    dispatch({
      type: "applyRcbd",
      rcbd: spec,
      rows,
      counters: { ...state.counters, row: counter },
      factorial: {
        factorIds: [treatment.id],
        blockId: block.id,
        interactionOrder: 1,
        ssType: "typeIII",
        marginals: [{ factors: [treatment.id], adjustment: "tukey" }],
        contrasts: [],
      },
      now: nowIso(),
    });
    setMessage(t("design.generated", { total: shown.total }));
    setBusy(false);
  };

  const levels = candidate?.levels.length ?? 0;
  const blocks = candidate?.blocks.length ?? 0;
  const collection = collectionColumns(
    state,
    (shown?.runs ?? []).map((r) => ({
      unit: `B${r.blockIndex + 1}-T${r.levelIndex + 1}`,
      levels: state.factors.map(() => undefined),
    })),
  );

  return (
    <section aria-labelledby="rcbd-title" data-testid="rcbd-panel">
      <h2 id="rcbd-title">{t("design.title")}</h2>
      <p className="muted">{t("design.rcbd.intro")}</p>
      {(!treatment || !block) && (
        <p role="status" className="error">
          {t("design.rcbd.needFactors")}
        </p>
      )}
      {treatment && block && (
        <>
          <div className="row">
            <label className="field">
              <span>{t("design.rcbd.treatmentFactor")}</span>
              <select value={treatment.id} onChange={(e) => setTreatmentId(e.target.value)}>
                {categorical.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("design.rcbd.blockFactor")}</span>
              <select value={block.id} onChange={(e) => setBlockId(e.target.value)}>
                {blockCandidates.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {[treatment, block].map((f, i) => (
            <label className="field" key={f.id}>
              <span>{t(i === 0 ? "design.rcbd.treatments" : "design.rcbd.blocks")}</span>
              <textarea
                rows={3}
                value={f.levelsText}
                onChange={(e) =>
                  dispatch({
                    type: "updateFactor",
                    id: f.id,
                    patch: { levelsText: e.target.value },
                  })
                }
              />
              <small className="muted">{t("design.crd.levelsHelp")}</small>
            </label>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            <span>{t("design.rcbd.randomize")}</span>
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
          {total !== null && (
            <p data-testid="rcbd-count" role="status">
              {t("design.rcbd.count", { total, levels, blocks })}
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
            disabled={!spec || total === null || busy || shownKey !== specKey}
            onClick={generate}
          >
            {state.rcbd ? t("design.regenerate") : t("design.generate")}
          </button>
          {message && (
            <p role="status" className="muted" data-testid="rcbd-generated">
              {message}
            </p>
          )}
        </>
      )}
      {state.rcbd && shown && (
        <section aria-labelledby="rcbd-matrix-title" data-testid="rcbd-matrix">
          <h3 id="rcbd-matrix-title">{t("design.rcbd.matrix")}</h3>
          <TableExportButtons
            label={t("design.rcbd.exportCsv")}
            suffix="do-dbc"
            sheet={t("design.rcbd.matrix")}
            header={[
              "run",
              "unit_id",
              "block",
              "position",
              state.rcbd.factorName,
              ...collection.header,
            ]}
            rows={shown.runs.map((r, i) => [
              r.run,
              `B${r.blockIndex + 1}-T${r.levelIndex + 1}`,
              r.block,
              r.position,
              r.level,
              ...(collection.cells[i] ?? []),
            ])}
            metadata={{
              app: "EnziTAG Optima",
              project: workspace.name,
              method: `${shown.provenance.methodId} v${shown.provenance.methodVersion}`,
              engine: shown.provenance.engineVersion,
              seed: String(state.rcbd.seed),
              randomization: shown.randomizationAlgorithm,
            }}
            fileBase="matriz-dbc"
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
            <table className="results-table" data-testid="rcbd-table">
              <thead>
                <tr>
                  <th scope="col">{t("design.crd.matrix.run")}</th>
                  <th scope="col">{state.rcbd.blockName}</th>
                  <th scope="col">{t("design.rcbd.position")}</th>
                  <th scope="col">{state.rcbd.factorName}</th>
                </tr>
              </thead>
              <tbody>
                {shown.runs.slice(0, 200).map((r) => (
                  <tr key={r.run}>
                    <th scope="row">{r.run}</th>
                    <td>{r.block}</td>
                    <td className="num">{r.position}</td>
                    <td>{r.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">{t("design.rcbd.unitNote")}</p>
          <p className="muted small">
            {t("design.crd.algorithm", {
              algorithm: shown.randomizationAlgorithm,
              seed: String(state.rcbd.seed),
            })}
          </p>
        </section>
      )}
    </section>
  );
}
