// Planejamento D e I-ótimo (v0.3): escolhe os fatores (faixa baixo–alto), o modelo, o critério e o
// número de ensaios, com restrições lineares e a opção de **ampliar** os ensaios já realizados.
// A busca é do motor (troca de Fedorov com vários inícios, semente registrada) e pode ser cancelada.
// O resultado vira a matriz do experimento, analisada como superfície de resposta.
import { type RefObject, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { nowIso } from "../../lib/ids";
import { clampSeed, MAX_SEED, randomSeed } from "../../lib/seed";
import {
  type GeneratedOptimal,
  type OptimalCriterion,
  type OptimalDesignRecord,
  type OptimalModel,
  type OptimalSpec,
  type OptimalVariance,
  type OptimalVarianceView,
  StaleResponseError,
} from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import { matchesOptimalVariance } from "../../state/optimalVariance";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { freshId } from "../../state/project";
import { FillResponsesButton, FlowBlock, useGuidedBlockFocus } from "../blocks";
import { parseNumberCell } from "../data/editing";
import { responseLabel } from "../import/fillResponses";
import { TableExportButtons } from "../results/TableExportButtons";
import { collectionColumns } from "./collectionColumns";
import {
  buildOptimalBlocks,
  type OptimalBlockDraft,
  OptimalBlockOptions,
} from "./OptimalBlockOptions";
import { OptimalCategoryOptions, optimalCategoryLevels } from "./OptimalCategoryOptions";
import { OptimalVariancePanel } from "./OptimalVariancePanel";

const CHANNEL = "optimal-run";
const text = (value: number) => String(value);

interface ConstraintDraft {
  coefficients: Record<string, string>;
  upper: string;
}

const number = (value: string | undefined): number => {
  const parsed = parseNumberCell(value ?? "");
  return parsed.ok && parsed.value !== null ? parsed.value : Number.NaN;
};

export function OptimalPanel({ language }: { language: Language }) {
  const state = useProject();
  const restoreArchiveFocus = useRef(false);
  const selected = state.optimalDesigns.find(
    (record) => record.id === state.optimalArtifactSelection?.designId,
  );
  return (
    <OptimalPanelEditor
      key={JSON.stringify([state.id, selected?.id])}
      language={language}
      saved={selected ?? state.optimalDesigns.at(-1)}
      selectedId={selected?.id}
      restoreArchiveFocus={restoreArchiveFocus}
    />
  );
}

function OptimalPanelEditor({
  language,
  saved,
  selectedId,
  restoreArchiveFocus,
}: {
  language: Language;
  saved?: OptimalDesignRecord;
  selectedId?: string;
  restoreArchiveFocus: RefObject<boolean>;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const workspace = useWorkspace();
  const { client } = useEngine();
  const focusGuidedBlock = useGuidedBlockFocus();

  const root = useRef<HTMLElement>(null);
  const candidates = state.factors.filter((f) => f.kind === "numeric" && f.name.trim() !== "");
  const [chosen, setChosen] = useState<string[] | null>(
    saved?.result.spec.factors.map((factor) => factor.id) ?? null,
  );
  const selected = candidates.filter((f) => (chosen ?? candidates.map((c) => c.id)).includes(f.id));
  const [chosenCategories, setChosenCategories] = useState<string[] | null>(
    saved ? (saved.result.spec.categories?.factors.map((factor) => factor.id) ?? []) : null,
  );
  const [combinations, setCombinations] = useState<string[][] | null>(
    saved?.result.spec.categories?.combinations ?? null,
  );
  const [ranges, setRanges] = useState<Record<string, { low: string; high: string }>>(
    Object.fromEntries(
      (saved?.result.spec.factors ?? []).map((factor) => [
        factor.id,
        { low: String(factor.low), high: String(factor.high) },
      ]),
    ),
  );
  const [model, setModel] = useState<OptimalModel>(saved?.result.spec.model ?? "interactions");
  const [criterion, setCriterion] = useState<OptimalCriterion>(saved?.result.spec.criterion ?? "d");
  const [runs, setRuns] = useState(saved?.result.spec.runs ?? 12);
  const [levels, setLevels] = useState<3 | 5>(saved?.result.spec.levels === 5 ? 5 : 3);
  const [starts, setStarts] = useState(saved?.result.spec.starts ?? 10);
  const [randomize, setRandomize] = useState(saved?.result.spec.randomize ?? true);
  const [seed, setSeed] = useState(saved?.result.spec.seed ?? randomSeed());
  const [constraints, setConstraints] = useState<ConstraintDraft[]>(
    (saved?.result.spec.constraints ?? []).map((constraint) => ({
      coefficients: Object.fromEntries(
        (saved?.result.spec.factors ?? []).map((factor, i) => [
          factor.id,
          String(constraint.coefficients[i] ?? 0),
        ]),
      ),
      upper: String(constraint.upper),
    })),
  );
  const [augment, setAugment] = useState(saved?.augment ?? false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [result, setResult] = useState<GeneratedOptimal | null>(saved?.result ?? null);
  const [variance, setVariance] = useState<OptimalVariance | null>(null);
  const [varianceView, setVarianceView] = useState<OptimalVarianceView>();
  const [varianceWork, setVarianceWork] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [applied, setApplied] = useState(Boolean(saved));
  const [resultSignature, setResultSignature] = useState(saved?.signature ?? "");
  const [blockDraft, setBlockDraft] = useState<OptimalBlockDraft>({
    enabled: Boolean(saved?.result.spec.blocks),
    sourceFactorId: saved?.blockFactorId ?? "",
    columnName: t("blocking.title"),
    oldLabel: saved?.result.spec.blocks?.labels[0] ?? t("blocking.previousDefault"),
    newBlocks: saved?.result.spec.blocks
      ? saved.result.spec.blocks.newRuns.flatMap((count, i) =>
          count > 0
            ? [
                {
                  id: `restored-${i}`,
                  label: saved.result.spec.blocks?.labels[i] ?? "",
                  runs: String(count),
                },
              ]
            : [],
        )
      : [{ id: "initial", label: t("blocking.nextBlock"), runs: "4" }],
  });
  const categoryCandidates = state.factors.flatMap((factor, i) => {
    if (
      factor.kind !== "categorical" ||
      !factor.name.trim() ||
      (augment && blockDraft.enabled && factor.id === blockDraft.sourceFactorId)
    )
      return [];
    const levels = optimalCategoryLevels(factor.levelsText, state.rows, i);
    return [{ id: factor.id, name: factor.name, levels }];
  });
  const selectedCategories = categoryCandidates.filter((factor) =>
    (chosenCategories ?? categoryCandidates.map((f) => f.id)).includes(factor.id),
  );
  const signature =
    "optimal:v1:" +
    JSON.stringify([
      ranges,
      chosen,
      model,
      criterion,
      runs,
      levels,
      starts,
      randomize,
      seed,
      constraints,
      augment,
      blockDraft,
      state.factors,
      state.rows,
      ...(selectedCategories.length || combinations ? [chosenCategories, combinations] : []),
    ]);
  const varianceScopeKey = JSON.stringify([
    workspace.projectId,
    workspace.epoch,
    state.id,
    resultSignature,
  ]);
  const varianceScope = useRef(varianceScopeKey);
  varianceScope.current = varianceScopeKey;
  const varianceBusy = varianceWork === varianceScopeKey;
  const appliedDesign = applied
    ? result === saved?.result
      ? saved
      : [...state.optimalDesigns].reverse().find((record) => record.result === result)
    : undefined;
  const historical = appliedDesign && appliedDesign !== state.optimalDesigns.at(-1);
  const stale = Boolean(result && signature !== resultSignature);
  const historicalPrecisionMismatch =
    saved &&
    result === saved.result &&
    !saved.signature.startsWith("optimal:v1:") &&
    saved.result.runs.some((run, i) => {
      const data = state.revisions.find((revision) => revision.id === saved.revisionId)?.data;
      const row = data?.rows.find((row) => row.id === saved.rowIds[i]);
      return saved.result.spec.factors.some((factor, j) => {
        const index = data?.factors.findIndex((column) => column.id === factor.id) ?? -1;
        const parsed = parseNumberCell(row?.factors[index] ?? "");
        const half = (factor.high - factor.low) / 2;
        return (
          parsed.ok &&
          parsed.value !== null &&
          half > 0 &&
          Math.abs((parsed.value - (run.real[j] ?? 0)) / half) > 1e-8
        );
      });
    });

  const fmt = (v: number | null | undefined, digits = 5) =>
    v === null || v === undefined ? "—" : formatSignificant(v, language, digits);

  // Only unselected treatment columns remain empty; an execution block has its own explicit role.
  const categorical = categoryCandidates.filter(
    (factor) => !selectedCategories.some((selected) => selected.id === factor.id),
  );
  const unchecked = candidates.filter((f) => !selected.some((s) => s.id === f.id));
  const leftEmpty = [...categorical, ...unchecked].map((f) => f.name).join(", ");

  const doneRows = state.rows.flatMap((row, index) => {
    const values = selected.map((f) => {
      const k = state.factors.findIndex((x) => x.id === f.id);
      const p = parseNumberCell(row.factors[k] ?? "");
      return p.ok && p.value !== null ? p.value : null;
    });
    const hasResponse = row.responses.some((c) => c.trim() !== "");
    const labels = selectedCategories.map((factor) =>
      (row.factors[state.factors.findIndex((f) => f.id === factor.id)] ?? "").trim(),
    );
    return values.every((v) => v !== null) && labels.every(Boolean) && hasResponse
      ? [{ index, values: values as number[], categories: labels }]
      : [];
  });

  const rangeOf = (id: string) => ranges[id] ?? { low: "", high: "" };
  const spec = (): OptimalSpec | null => {
    if (
      selected.length + selectedCategories.length === 0 ||
      selectedCategories.some((factor) => factor.levels.length < 2)
    )
      return null;
    const factors = selected.map((f) => ({
      id: f.id,
      name: f.name,
      low: number(rangeOf(f.id).low),
      high: number(rangeOf(f.id).high),
    }));
    if (factors.some((f) => !Number.isFinite(f.low) || !Number.isFinite(f.high))) return null;
    const blocks =
      augment && blockDraft.enabled ? buildOptimalBlocks(state, doneRows, blockDraft) : undefined;
    if (augment && blockDraft.enabled && !blocks) return null;
    const parsedConstraints = constraints.map((constraint) => ({
      coefficients: selected.map((factor) => number(constraint.coefficients[factor.id] ?? "0")),
      upper: number(constraint.upper),
    }));
    if (
      parsedConstraints.some(
        (constraint) =>
          !Number.isFinite(constraint.upper) ||
          constraint.coefficients.some((value) => !Number.isFinite(value)),
      )
    )
      return null;
    return {
      blocks: blocks ?? undefined,
      categories: selectedCategories.length
        ? {
            factors: selectedCategories,
            combinations: combinations ?? undefined,
            fixedRuns: augment ? doneRows.map((row) => row.categories) : [],
          }
        : undefined,
      factors,
      model,
      criterion,
      runs: blocks ? doneRows.length + blocks.newRuns.reduce((sum, count) => sum + count, 0) : runs,
      levels,
      constraints: parsedConstraints,
      fixedRuns: augment ? doneRows.map((r) => r.values) : [],
      starts,
      randomize,
      seed,
    };
  };

  const run = async () => {
    const s = spec();
    if (!s) {
      root.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
      setProblems([
        t(
          augment && blockDraft.enabled && !buildOptimalBlocks(state, doneRows, blockDraft)
            ? "blocking.invalidAllocation"
            : "design.optimal.invalidConfiguration",
        ),
      ]);
      return;
    }
    const capturedSignature = signature;
    setBusy(true);
    setProblems([]);
    setNotice(null);
    setApplied(false);
    setVariance(null);
    setVarianceView(undefined);
    try {
      const r = await client.request({ type: "designOptimalGenerate", ...s }, { channel: CHANNEL });
      if (r.outcome.status === "ok" && r.outcome.result.type === "designOptimalGenerate") {
        const { type: _type, ...generated } = r.outcome.result;
        setResult(generated);
        setVariance(null);
        setResultSignature(capturedSignature);
      } else if (r.outcome.status === "error") {
        setResult(null);
        setProblems(engineErrorMessages(t, r.outcome.error));
      }
    } catch (error) {
      if (!(error instanceof StaleResponseError))
        setProblems([t("engine.unavailable", { ns: "diagnostics" })]);
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
    if (!result || stale || applied) return;
    if (!augment && state.rows.some((r) => r.responses.some((c) => c.trim() !== ""))) {
      if (!window.confirm(t("design.confirmReplace"))) return;
    }
    if (leftEmpty !== "" && !window.confirm(t("design.optimal.confirmEmpty", { names: leftEmpty })))
      return;
    let counter = state.counters.row;
    let factorCounter = state.counters.factor;
    let blockFactorId: string | undefined;
    let factors = state.factors;
    if (result.spec.blocks) {
      if (blockDraft.sourceFactorId) {
        blockFactorId = blockDraft.sourceFactorId;
        factors = state.factors.map((factor) => {
          if (factor.id !== blockFactorId || !factor.levelsText.trim()) return factor;
          const labels = [
            ...new Set([
              ...factor.levelsText
                .split(";")
                .map((label) => label.trim())
                .filter(Boolean),
              ...(result.spec.blocks?.labels ?? []),
            ]),
          ];
          return {
            ...factor,
            levelsText: labels.some((label) => label.includes(";")) ? "" : labels.join(";"),
          };
        });
      } else {
        const identity = freshId(
          "f",
          factorCounter,
          state.factors.map((factor) => factor.id),
        );
        factorCounter = identity.counter;
        blockFactorId = identity.id;
        factors = [
          ...state.factors,
          {
            id: blockFactorId,
            name: blockDraft.columnName.trim(),
            kind: "categorical",
            unit: "",
            levelsText: "",
          },
        ];
      }
    }
    const keep = augment
      ? state.rows.map((row) => ({
          ...row,
          factors: factors.map((_factor, i) =>
            i < state.factors.length
              ? (row.factors[i] ?? "")
              : (result.spec.blocks?.labels[0] ?? ""),
          ),
        }))
      : [];
    const rowIds = doneRows
      .slice(0, result.spec.fixedRuns.length)
      .map(({ index }) => state.rows[index]?.id ?? "");
    const fresh = result.runs
      .filter((r) => !r.fixed)
      .map((r) => {
        const id = freshId("o", counter, []);
        counter = id.counter;
        rowIds.push(id.id);
        return {
          id: id.id,
          unitId: "",
          factors: factors.map((f) => {
            if (f.id === blockFactorId && r.block !== undefined)
              return result.spec.blocks?.labels[r.block] ?? "";
            const category = result.spec.categories?.factors.findIndex((s) => s.id === f.id) ?? -1;
            if (category >= 0) return r.categories?.[category] ?? "";
            const k = result.spec.factors.findIndex((s) => s.id === f.id);
            return k < 0 ? "" : text(r.real[k] ?? 0);
          }),
          responses: state.responses.map(() => ""),
        };
      });
    dispatch({
      type: "applyOptimal",
      rows: [...keep, ...fresh],
      factors,
      generated: result,
      ...(variance && matchesOptimalVariance(result, variance) ? { variance, varianceView } : {}),
      signature: resultSignature,
      augment,
      rowIds,
      blockFactorId,
      terms: [
        ...result.spec.factors.map((factor) => [factor.id]),
        ...(result.spec.model === "quadratic"
          ? result.spec.factors.map((factor) => [factor.id, factor.id])
          : []),
        ...(result.spec.model !== "linear"
          ? result.spec.factors.flatMap((factor, i) =>
              result.spec.factors.slice(i + 1).map((other) => [factor.id, other.id]),
            )
          : []),
      ],
      counters: { ...state.counters, row: counter, factor: factorCounter },
      now: nowIso(),
    });
    if (blockFactorId) setBlockDraft({ ...blockDraft, sourceFactorId: blockFactorId });
    setApplied(true);
  };

  const archivedData = historical
    ? state.revisions.find((revision) => revision.id === appliedDesign.revisionId)?.data
    : undefined;
  const collection = archivedData
    ? {
        header: archivedData.responses.map(responseLabel),
        cells:
          appliedDesign?.rowIds.map((id) => {
            const row = archivedData.rows.find((entry) => entry.id === id);
            return archivedData.responses.map((_, i) => row?.responses[i] || null);
          }) ?? [],
      }
    : collectionColumns(
        state,
        (result?.runs ?? []).map((r) => ({
          unit: "",
          levels: state.factors.map((f) => {
            const category = result?.spec.categories?.factors.findIndex((s) => s.id === f.id) ?? -1;
            if (category >= 0) return r.categories?.[category];
            const k = result?.spec.factors.findIndex((s) => s.id === f.id) ?? -1;
            return k < 0 ? undefined : text(r.real[k] ?? 0);
          }),
        })),
      );

  return (
    <section
      ref={root}
      aria-labelledby="optimal-title"
      data-testid="optimal-panel"
      className="editor-card optimal-panel"
    >
      {state.optimalDesigns.length > 1 && (
        <label className="field">
          <span>{t("optimalVariance.designArchive")}</span>
          <select
            ref={(element) => {
              if (element && restoreArchiveFocus.current) {
                restoreArchiveFocus.current = false;
                element.focus({ preventScroll: true });
              }
            }}
            value={selectedId ?? ""}
            disabled={busy || varianceBusy}
            onChange={(event) => {
              restoreArchiveFocus.current = document.activeElement === event.currentTarget;
              dispatch({ type: "selectOptimalDesign", designId: event.target.value || undefined });
              focusGuidedBlock?.("optimal-result-block:optimal-result-block");
            }}
          >
            <option value="">{t("optimalVariance.latestDesign")}</option>
            {state.optimalDesigns.map((record) => (
              <option key={record.id} value={record.id}>
                {t("optimalVariance.designArchiveLabel", {
                  id: record.id,
                  criterion: record.result.spec.criterion.toUpperCase(),
                  runs: record.result.runs.length,
                  revision: record.revisionId,
                })}
              </option>
            ))}
          </select>
        </label>
      )}
      <FlowBlock
        id="optimal-config"
        ready={spec() !== null}
        title={t("design.optimal.factors")}
        order={1}
      >
        <h2 id="optimal-title">{t("design.optimal.title")}</h2>
        <p className="muted">{t("design.optimal.intro")}</p>
        {candidates.length + categoryCandidates.length === 0 && (
          <p role="status" className="error">
            {t("design.optimal.needFactors")}
          </p>
        )}
        {candidates.length + categoryCandidates.length > 0 && (
          <>
            {categorical.length > 0 && (
              <p role="status" className="error" data-testid="optimal-excluded">
                {t("design.optimal.excluded", {
                  names: categorical.map((f) => f.name).join(", "),
                  count: categorical.length,
                })}
              </p>
            )}
            {categoryCandidates.length > 0 && (
              <OptimalCategoryOptions
                candidates={categoryCandidates}
                selected={selectedCategories}
                onSelect={(ids) => {
                  setChosenCategories(ids);
                  if (combinations) {
                    setCombinations(null);
                    setNotice(t("design.optimal.categories.domainReset"));
                  }
                }}
                combinations={combinations}
                onCombinations={setCombinations}
              />
            )}
            {candidates.length > 0 && (
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
                          setRanges({
                            ...ranges,
                            [f.id]: { ...rangeOf(f.id), low: e.target.value },
                          })
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
                          setRanges({
                            ...ranges,
                            [f.id]: { ...rangeOf(f.id), high: e.target.value },
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </fieldset>
            )}
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
                  readOnly={augment && blockDraft.enabled}
                  value={augment && blockDraft.enabled ? (spec()?.runs ?? doneRows.length) : runs}
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
          </>
        )}
      </FlowBlock>
      <FlowBlock
        id="optimal-search"
        title={t("design.optimal.searchOptions")}
        order={2}
        ready={result !== null}
      >
        {candidates.length + categoryCandidates.length > 0 && (
          <>
            <fieldset className="editor-card">
              <legend>{t("design.optimal.constraints")}</legend>
              <p className="muted">{t("design.optimal.constraintEquation")}</p>
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
                        value={c.coefficients[f.id] ?? "0"}
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
                          constraints.map((x, j) =>
                            j === i ? { ...x, upper: e.target.value } : x,
                          ),
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
            {augment && (
              <>
                <p className="muted small">
                  {t("blocking.retainedRows", {
                    all: state.rows.length,
                    completed: doneRows.length,
                  })}
                </p>
                <OptimalBlockOptions state={state} draft={blockDraft} onChange={setBlockDraft} />
              </>
            )}
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
              <button
                type="button"
                className="button"
                disabled={busy || varianceBusy}
                onClick={run}
              >
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
      </FlowBlock>
      <FlowBlock id="optimal-result-block" title={t("design.optimal.result")} order={3}>
        {result && (
          <section aria-labelledby="optimal-result-title" data-testid="optimal-result">
            <h3 id="optimal-result-title">{t("design.optimal.result")}</h3>
            {result.issues
              .filter(
                (issue) =>
                  issue.code !== "design.optimal_pass_limit" ||
                  result.search?.selectedStop !== "passLimit",
              )
              .map((issue) => (
                <p key={issue.code} role="status" className="muted" data-testid="optimal-warning">
                  {issueMessage(t, issue)}
                </p>
              ))}
            <p role="status" data-testid="optimal-summary">
              {t("design.optimal.summary", {
                runs: result.runs.length,
                candidates: result.candidates,
                reached: result.startsReachingBest,
                starts: result.startsRun,
              })}
            </p>
            <p className="muted small">{t("design.optimal.noGlobal")}</p>
            {result.search && (
              <>
                <p role="status" data-testid="optimal-stop">
                  {t(`design.optimal.stops.${result.search.selectedStop}`)}
                </p>
                <details data-testid="optimal-search-details">
                  <summary>{t("design.optimal.searchDetails")}</summary>
                  <p>
                    {t("design.optimal.searchStarts", {
                      attempted: result.search.startsAttempted,
                      succeeded: result.search.startsSucceeded,
                      failed: result.search.startsFailed,
                      limited: result.search.startsLimited,
                    })}
                  </p>
                  <p>
                    {t("design.optimal.searchWork", {
                      singular: result.search.singularInitialStarts,
                      recoveries: result.search.recoveryAttempts,
                      evaluations: result.search.evaluations,
                      passes: result.search.passes,
                    })}
                  </p>
                </details>
              </>
            )}
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
            {result.spec.categories && (
              <p className="muted" data-testid="optimal-categorical-model">
                {t("design.optimal.categories.modelHelp")}
              </p>
            )}
            {result.spec.blocks && (
              <p className="muted" data-testid="optimal-block-model">
                {t("blocking.criterionHelp")}
              </p>
            )}
            <TableExportButtons
              recordId={appliedDesign?.id ?? null}
              label={t("design.optimal.exportCsv")}
              suffix="otima"
              sheet={t("design.optimal.result")}
              header={[
                "run",
                "status",
                ...(result.spec.blocks ? [t("blocking.title")] : []),
                ...result.spec.factors.map((f) => f.name),
                ...(result.spec.categories?.factors.map((f) => f.name) ?? []),
                ...collection.header,
              ]}
              rows={result.runs.map((r, i) => [
                r.run,
                r.fixed ? "done" : "new",
                ...(result.spec.blocks ? [result.spec.blocks.labels[r.block ?? 0] ?? ""] : []),
                ...r.real,
                ...(r.categories ?? []),
                ...(collection.cells[i] ?? []),
              ])}
              metadata={{
                app: "DesvTAG",
                project: workspace.name,
                method: `${result.provenance.methodId} v${result.provenance.methodVersion}`,
                engine: result.provenance.engineVersion,
                criterion: result.spec.criterion === "d" ? "D-optimal" : "I-optimal",
                model: result.spec.model,
                categories: JSON.stringify(result.spec.categories ?? null),
                candidates: String(result.candidates),
                starts: String(result.startsRun),
                ...(result.search?.workLimit
                  ? {
                      startsRequested: String(result.spec.starts),
                      selectedStop: result.search.selectedStop,
                      workLimitMillionProducts: String(result.search.workLimit),
                      evaluations: String(result.search.evaluations),
                    }
                  : {}),
                seed: String(result.spec.seed),
                algorithm: result.algorithm,
                ...(result.spec.blocks
                  ? {
                      blocks: JSON.stringify(result.spec.blocks),
                      predictionMeasure:
                        "uniform spatial candidates x uniform blocks; sum contrasts",
                    }
                  : {}),
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
                    {result.spec.blocks && <th scope="col">{t("blocking.title")}</th>}
                    {result.spec.factors.map((f) => (
                      <th scope="col" key={f.id}>
                        {f.name}
                      </th>
                    ))}
                    {result.spec.categories?.factors.map((factor) => (
                      <th scope="col" key={factor.id}>
                        {factor.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.runs.map((r) => (
                    <tr key={r.run}>
                      <th scope="row">{r.run}</th>
                      <td>{r.fixed ? t("design.optimal.done") : t("design.optimal.new")}</td>
                      {result.spec.blocks && <td>{result.spec.blocks.labels[r.block ?? 0]}</td>}
                      {r.real.map((v, k) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: colunas fixas, uma por fator.
                        <td key={k}>{fmt(v)}</td>
                      ))}
                      {r.categories?.map((label, i) => (
                        <td key={result.spec.categories?.factors[i]?.id ?? label}>{label}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historicalPrecisionMismatch && (
              <p
                role="status"
                className="notice warning"
                data-testid="optimal-historical-precision"
              >
                {t("blocking.historicalPrecision")}
              </p>
            )}
            {historical && (
              <p className="notice" data-testid="optimal-archive-context">
                {t("optimalVariance.historicalDesign", { revision: appliedDesign.revisionId })}
              </p>
            )}
            {stale && !historical && (
              <p role="status" className="notice" data-testid="optimal-stale">
                {t("blocking.staleDesign")}
              </p>
            )}
            {!historical && (
              <button
                type="button"
                className="button"
                disabled={stale || applied || varianceBusy}
                onClick={apply}
              >
                {t("design.optimal.apply")}
              </button>
            )}
            {applied && !historical && (
              <p role="status" className="muted" data-testid="optimal-applied">
                {t("design.optimal.applied", { count: result.runs.filter((r) => !r.fixed).length })}
                {leftEmpty !== "" && ` ${t("design.optimal.appliedEmpty", { names: leftEmpty })}`}
              </p>
            )}
            <OptimalVariancePanel
              key={varianceScopeKey}
              design={result}
              designId={appliedDesign?.id}
              value={variance && matchesOptimalVariance(result, variance) ? variance : null}
              draftView={varianceView}
              onDraftView={setVarianceView}
              language={language}
              unavailable={Boolean(historicalPrecisionMismatch)}
              disabled={busy}
              onBusy={(busy) =>
                setVarianceWork((current) =>
                  busy ? varianceScopeKey : current === varianceScopeKey ? null : current,
                )
              }
              onValue={(profile) => {
                if (
                  varianceScope.current === varianceScopeKey &&
                  matchesOptimalVariance(result, profile)
                )
                  setVariance(profile);
              }}
            />
          </section>
        )}
        {applied && !historical && <FillResponsesButton />}
      </FlowBlock>
    </section>
  );
}
