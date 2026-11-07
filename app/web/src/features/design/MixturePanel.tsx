// Mixture design with optional bounded-region vertices and edge subdivisions.
// Generation and validation belong to Rust; the preview is tied to its exact input.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import type { GeneratedMixture, MixtureKind, MixtureSpec } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { freshId } from "../../state/project";
import { FillResponsesButton, FlowBlock } from "../blocks";
import { parseNumberCell } from "../data/editing";

import { TableExportButtons } from "../results/TableExportButtons";

import { collectionColumns } from "./collectionColumns";

/** Proporção como texto estável (sem ruído de ponto flutuante). */

export const proportionText = (value: number): string => String(Number(value.toFixed(10)));

function bound(value: string): number {
  const parsed = parseNumberCell(value);
  return parsed.ok && parsed.value !== null ? parsed.value : Number.NaN;
}

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

  const [uppers, setUppers] = useState<Record<string, string>>(
    Object.fromEntries(
      (state.mixture?.components ?? []).map((c, i) => [
        c.id,
        String(state.mixture?.upperBounds?.[i] ?? 1),
      ]),
    ),
  );

  const [kindType, setKindType] = useState<MixtureKind["type"]>(
    state.mixture?.kind.type ?? "lattice",
  );

  const [degree, setDegree] = useState(
    state.mixture && state.mixture.kind.type !== "centroid" ? state.mixture.kind.degree : 2,
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
    kindType === "centroid" ? { type: "centroid" } : { type: kindType, degree };

  const invalidBounds = selected.some(
    (f) =>
      !Number.isFinite(bound(lowers[f.id] ?? "0")) ||
      (kindType === "extremeVertices" && !Number.isFinite(bound(uppers[f.id] ?? "1"))),
  );

  const candidate: MixtureSpec | null =
    selected.length >= 2 && !invalidBounds
      ? {
          components: selected.map((f) => ({
            id: f.id,

            name: f.name,

            lower: bound(lowers[f.id] ?? "0"),
          })),

          upperBounds:
            kindType === "extremeVertices"
              ? selected.map((f) => bound(uppers[f.id] ?? "1"))
              : undefined,

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

      setProblems(invalidBounds ? [t("design.mixture.numericBounds")] : []);

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

      .catch(() => {
        if (live) {
          setShown(null);
          setProblems([t("execution.transportFailure")]);
        }
      });

    return () => {
      live = false;
    };
  }, [client, spec, invalidBounds, t]);

  const currentPreview = shownKey === specKey ? shown : null;

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
    <section
      aria-labelledby="mixture-title"
      data-testid="mixture-panel"
      className="editor-card mixture-panel"
    >
      <FlowBlock
        id="mixture-config"
        ready={spec !== null && shown !== null && shownKey === specKey}
        title={t("design.blocks.levels")}
        order={1}
      >
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
                      aria-invalid={!Number.isFinite(bound(lowers[f.id] ?? "0"))}
                      onChange={(e) => setLowers({ ...lowers, [f.id]: e.target.value })}
                    />
                  </label>
                  {kindType === "extremeVertices" && (
                    <label className="field">
                      <span>{t("design.mixture.upper", { name: f.name })}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={uppers[f.id] ?? "1"}
                        aria-invalid={!Number.isFinite(bound(uppers[f.id] ?? "1"))}
                        onChange={(e) => setUppers({ ...uppers, [f.id]: e.target.value })}
                      />
                    </label>
                  )}
                </div>
              ))}

              <p className="muted small">{t("design.mixture.lowerHelp")}</p>
            </fieldset>

            <div className="row">
              <label className="field">
                <span>{t("design.mixture.kind")}</span>

                <select
                  value={kindType}
                  onChange={(e) => setKindType(e.target.value as MixtureKind["type"])}
                >
                  <option value="lattice">{t("design.mixture.lattice")}</option>

                  <option value="centroid">{t("design.mixture.centroid")}</option>
                  <option value="extremeVertices">{t("design.mixture.extremeVertices")}</option>
                </select>
              </label>

              {kindType !== "centroid" && (
                <label className="field">
                  <span>
                    {t(
                      kindType === "extremeVertices"
                        ? "design.mixture.edgeDegree"
                        : "design.mixture.degree",
                    )}
                  </span>

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
            {kindType === "extremeVertices" && (
              <details className="advanced">
                <summary>{t("design.mixture.boundedHelpTitle")}</summary>
                <p className="muted">{t("design.mixture.boundedHelp")}</p>
              </details>
            )}
          </>
        )}
      </FlowBlock>

      <FlowBlock
        id="mixture-generate"
        title={t("design.blocks.generate")}
        order={2}
        ready={state.mixture !== null}
      >
        {candidates.length >= 2 && (
          <>
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

            {currentPreview && (
              <p data-testid="mixture-count" role="status">
                {t("design.mixture.count", {
                  total: currentPreview.total,

                  points: currentPreview.basePoints,

                  replicates: currentPreview.spec.replicates,

                  centers: currentPreview.spec.centerPoints,
                })}
              </p>
            )}

            {currentPreview?.issues.map((i) => (
              <p key={i.code} role="status" className="muted">
                {issueMessage(t, i)}
              </p>
            ))}
            {currentPreview?.region && (
              <p className="muted" data-testid="mixture-region-summary">
                {t("design.mixture.regionSummary", {
                  vertices: currentPreview.region.vertices.length,
                  edges: currentPreview.region.edges.length,
                  dimension: currentPreview.region.dimension,
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
      </FlowBlock>

      <FlowBlock
        id="mixture-matrix"
        title={t("data.blocks.matrix")}
        order={3}
        focus={message !== null}
      >
        {state.mixture &&
          shown &&
          shownKey === specKey &&
          shownKey === JSON.stringify(state.mixture) && (
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
                  app: "DesvTAG",

                  project: workspace.name,

                  method: `${shown.provenance.methodId} v${shown.provenance.methodVersion}`,

                  engine: shown.provenance.engineVersion,

                  design:
                    state.mixture.kind.type === "lattice"
                      ? `simplex-lattice {${state.mixture.components.length}, ${state.mixture.kind.degree}}`
                      : state.mixture.kind.type === "centroid"
                        ? "simplex-centroid"
                        : `bounded vertices and edges, subdivisions ${state.mixture.kind.degree}`,

                  lower_bounds: state.mixture.components.map((c) => c.lower).join(" "),
                  ...(state.mixture.upperBounds
                    ? { upper_bounds: state.mixture.upperBounds.join(" ") }
                    : {}),

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

        {state.mixture && <FillResponsesButton />}
      </FlowBlock>
    </section>
  );
}
