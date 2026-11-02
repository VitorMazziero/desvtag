// Planejamento de misturas (v0.3): simplex-lattice ou simplex-centroide, com limites inferiores nos
// componentes (cada componente é um fator numérico do experimento: sua proporção na mistura). A
// geração é do motor; a análise (modelos de Scheffé) fica na etapa de análise.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import type { GeneratedMixture, MixtureKind, MixtureSpec } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { freshId } from "../../state/project";
import { TableExportButtons } from "../results/TableExportButtons";
import { collectionColumns } from "./collectionColumns";

/** Proporção como texto estável (sem ruído de ponto flutuante). */
export const proportionText = (value: number): string => String(Number(value.toFixed(10)));

export function MixturePanel() {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const workspace = useWorkspace();
  const { client } = useEngine();

  const candidates = state.factors.filter((f) => f.kind === "numeric" && f.name.trim() !== "");
  const [chosen, setChosen] = useState<string[] | null>(
    state.mixture ? state.mixture.components.map((c) => c.id) : null,
  );
  const selected = candidates.filter((f) => (chosen ?? candidates.map((c) => c.id)).includes(f.id));
  const [lowers, setLowers] = useState<Record<string, string>>(
    Object.fromEntries(
      (state.mixture?.components ?? []).map((c) => [c.id, String(c.lower)] as const),
    ),
  );
  const [kindType, setKindType] = useState<"lattice" | "centroid">(
    state.mixture?.kind.type ?? "lattice",
  );
  const [degree, setDegree] = useState(
    state.mixture?.kind.type === "lattice" ? state.mixture.kind.degree : 2,
  );
  const [replicates, setReplicates] = useState(state.mixture?.replicates ?? 2);
  const [centers, setCenters] = useState(state.mixture?.centerPoints ?? 0);
  const [randomize, setRandomize] = useState(state.mixture?.randomize ?? true);
  const [seed, setSeed] = useState(state.mixture?.seed ?? randomSeed());
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [shown, setShown] = useState<GeneratedMixture | null>(null);
  const [shownKey, setShownKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const kind: MixtureKind =
    kindType === "lattice" ? { type: "lattice", degree } : { type: "centroid" };
  const candidate: MixtureSpec | null =
    selected.length >= 2
      ? {
          components: selected.map((f) => ({
            id: f.id,
            name: f.name,
            lower: Number((lowers[f.id] ?? "0").replace(",", ".")) || 0,
          })),
          kind,
          replicates,
          centerPoints: centers,
          randomize,
          seed,
        }
      : null;
  const specKey = JSON.stringify(candidate);
  const spec: MixtureSpec | null = useMemo(
    () => (specKey === "null" ? null : (JSON.parse(specKey) as MixtureSpec)),
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
      .request({ type: "designMixtureGenerate", ...spec }, { channel: "mixture-preview" })
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "designMixtureGenerate") {
          setShown(r.outcome.result as unknown as GeneratedMixture);
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
      state.mixture !== null ||
      state.rows.some((r) => r.responses.some((c) => c.trim() !== ""))
    ) {
      if (!window.confirm(t("design.confirmReplace"))) return;
    }
    let counter = state.counters.row;
    const rows = shown.runs.map((run) => {
      const fresh = freshId("o", counter, []);
      counter = fresh.counter;
      return {
        id: fresh.id,
        unitId: "",
        factors: state.factors.map((f) => {
          const k = spec.components.findIndex((c) => c.id === f.id);
          return k < 0 ? "" : proportionText(run.proportions[k] ?? 0);
        }),
        responses: state.responses.map(() => ""),
      };
    });
    dispatch({
      type: "applyMixture",
      mixture: spec,
      rows,
      counters: { ...state.counters, row: counter },
      now: nowIso(),
    });
    setMessage(t("design.generated", { total: shown.total }));
  };

  const collection = collectionColumns(
    state,
    (shown?.runs ?? []).map((r) => ({
      unit: "",
      levels: state.factors.map((f) => {
        const k = spec?.components.findIndex((c) => c.id === f.id) ?? -1;
        return k < 0 ? undefined : proportionText(r.proportions[k] ?? 0);
      }),
    })),
  );

  return (
    <section aria-labelledby="mixture-title" data-testid="mixture-panel" className="editor-card">
      <h2 id="mixture-title">{t("design.mixture.title")}</h2>
      <p className="muted">{t("design.mixture.intro")}</p>
      {candidates.length < 2 && (
        <p role="status" className="error">
          {t("design.mixture.needFactors")}
        </p>
      )}
      {candidates.length >= 2 && (
        <>
          <fieldset className="editor-card">
            <legend>{t("design.mixture.components")}</legend>
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
                  <span>{t("design.mixture.lower", { name: f.name })}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lowers[f.id] ?? "0"}
                    onChange={(e) => setLowers({ ...lowers, [f.id]: e.target.value })}
                  />
                </label>
              </div>
            ))}
            <p className="muted small">{t("design.mixture.lowerHelp")}</p>
          </fieldset>
          <div className="row">
            <label className="field">
              <span>{t("design.mixture.kind")}</span>
              <select
                value={kindType}
                onChange={(e) => setKindType(e.target.value as "lattice" | "centroid")}
              >
                <option value="lattice">{t("design.mixture.lattice")}</option>
                <option value="centroid">{t("design.mixture.centroid")}</option>
              </select>
            </label>
            {kindType === "lattice" && (
              <label className="field">
                <span>{t("design.mixture.degree")}</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={degree}
                  onChange={(e) =>
                    setDegree(Math.min(6, Math.max(1, Math.floor(Number(e.target.value) || 1))))
                  }
                />
              </label>
            )}
            <label className="field">
              <span>{t("design.mixture.replicates")}</span>
              <input
                type="number"
                min={1}
                value={replicates}
                onChange={(e) =>
                  setReplicates(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
              />
            </label>
            <label className="field">
              <span>{t("design.mixture.centers")}</span>
              <input
                type="number"
                min={0}
                value={centers}
                onChange={(e) => setCenters(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            <span>{t("design.mixture.randomize")}</span>
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
            <p data-testid="mixture-count" role="status">
              {t("design.mixture.count", {
                total: shown.total,
                points: shown.basePoints,
                replicates: shown.spec.replicates,
                centers: shown.spec.centerPoints,
              })}
            </p>
          )}
          {shown?.issues.map((i) => (
            <p key={i.code} role="status" className="muted">
              {t(`design.mixture.warn.${i.code.replace("design.mixture_", "")}`, {
                defaultValue: i.code,
              })}
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
            disabled={!spec || !shown || shownKey !== specKey}
            onClick={generate}
          >
            {state.mixture ? t("design.regenerate") : t("design.generate")}
          </button>
          {message && (
            <p role="status" className="muted" data-testid="mixture-generated">
              {message}
            </p>
          )}
        </>
      )}
      {state.mixture && shown && (
        <section aria-labelledby="mixture-matrix-title" data-testid="mixture-matrix">
          <h3 id="mixture-matrix-title">{t("design.mixture.matrix")}</h3>
          <TableExportButtons
            label={t("design.mixture.exportCsv")}
            suffix="de-misturas"
            sheet={t("design.mixture.matrix")}
            header={[
              "run",
              "standard_order",
              ...state.mixture.components.map((c) => c.name),
              ...collection.header,
            ]}
            rows={shown.runs.map((r, i) => [
              r.run,
              r.standardOrder,
              ...r.proportions.map(proportionText),
              ...(collection.cells[i] ?? []),
            ])}
            metadata={{
              app: "EnziTAG Optima",
              project: workspace.name,
              method: `${shown.provenance.methodId} v${shown.provenance.methodVersion}`,
              engine: shown.provenance.engineVersion,
              design:
                state.mixture.kind.type === "lattice"
                  ? `simplex-lattice {${state.mixture.components.length}, ${state.mixture.kind.degree}}`
                  : "simplex-centroid",
              lower_bounds: state.mixture.components.map((c) => c.lower).join(" "),
              replicates: String(state.mixture.replicates),
              extra_center_points: String(state.mixture.centerPoints),
              randomized: String(state.mixture.randomize),
              seed: String(state.mixture.seed),
              randomization: shown.randomizationAlgorithm,
            }}
            fileBase="matriz-misturas"
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
            <table className="results-table" data-testid="mixture-table">
              <thead>
                <tr>
                  <th scope="col">{t("design.crd.matrix.run")}</th>
                  <th scope="col">{t("design.crd.matrix.standard")}</th>
                  {state.mixture.components.map((c) => (
                    <th scope="col" key={c.id}>
                      {c.name}
                    </th>
                  ))}
                  <th scope="col">{t("design.mixture.support")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.runs.slice(0, 200).map((r) => (
                  <tr key={r.run}>
                    <th scope="row">{r.run}</th>
                    <td>{r.standardOrder}</td>
                    {r.proportions.map((p, k) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: colunas fixas, uma por componente.
                      <td key={k}>{proportionText(p)}</td>
                    ))}
                    <td>{r.extraCenter ? t("design.mixture.extraCenter") : r.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            {t("design.crd.algorithm", {
              algorithm: shown.randomizationAlgorithm,
              seed: state.mixture.seed,
            })}
          </p>
        </section>
      )}
    </section>
  );
}
