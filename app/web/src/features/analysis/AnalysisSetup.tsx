import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { captureCalculationSource } from "../../state/project";
import { FlowBlock, GuidedFlow } from "../blocks";
import {
  analysisKind,
  buildDataset,
  buildOperation,
  designTermIds,
  inputSignature,
  surfaceFactors,
} from "./buildRequest";
import { MethodChoice } from "./MethodChoice";
import { analysisDescription } from "./presentation";
import { RepeatedMeasures } from "./RepeatedMeasures";
import { SurfaceBlockOptions } from "./SurfaceBlockOptions";

interface Props {
  /** Chamado quando um resultado novo foi calculado e guardado. */
  onDone: () => void;
}

export function AnalysisSetup({ onDone, onPrevious }: Props & { onPrevious?: () => void }) {
  const { t } = useTranslation();
  const state = useProject();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const [structure, setStructure] = useState(() => {
    const units = state.rows.map((r) => r.unitId.trim()).filter(Boolean);
    return new Set(units).size < units.length ? "repeated" : "independent";
  });
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  // Um único fator elegível já vem escolhido (UX27): o «—» só aparece quando há o que escolher.
  const eligible = state.factors.filter((f) => f.kind === "categorical" && f.name.trim());
  const onlyFactor =
    eligible.length === 1
      ? eligible[0]!.id
      : state.factors.length === 1
        ? state.factors[0]!.id
        : null;
  const needsFactor = analysisKind(state) === "oneWay" || analysisKind(state) === "procedure";
  useEffect(() => {
    if (needsFactor && onlyFactor !== null && state.analysis.factorId === null)
      dispatch({ type: "setAnalysis", patch: { factorId: onlyFactor } });
  }, [needsFactor, onlyFactor, state.analysis.factorId, dispatch]);

  if (state.responses.length === 0) return <p className="muted">{t("analysis.noResponse")}</p>;

  const kind = analysisKind(state);
  const invalidOptimalAlpha =
    kind === "optimal" &&
    (!Number.isFinite(state.analysis.alpha) ||
      state.analysis.alpha <= 0 ||
      state.analysis.alpha >= 1);
  // Textos que dependem do procedimento escolhido (UX26): nada de «Tukey» fixo quando o usuário
  // escolheu Dunnett, Games–Howell ou Kruskal–Wallis, nem de «pares» quando o modelo é multifatorial.
  const textKey = kind === "factorial" ? "factorial" : (state.analysis.procedure?.type ?? "tukey");
  const compareIntro = t(`analysis.compare.introFor.${textKey}`);
  const compareAlphaHelp = t(`analysis.compare.alphaHelpFor.${textKey}`);
  const run = async () => {
    const { dataset } = buildDataset(state);
    const operation = buildOperation(state, dataset);
    if (!operation) return;
    const signature = inputSignature(state);
    const source = captureCalculationSource(workspace, state, nowIso());
    setRunning(true);
    setMessages([]);
    try {
      const response = await client.request(operation, { channel: kind });
      if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "descriptiveSummarize"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "descriptive", result },
          now: nowIso(),
        });
        onDone();
      } else if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "comparisonOneWay"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "oneWay", result },
          now: nowIso(),
        });
        onDone();
      } else if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "designAnalyze"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "design", result },
          now: nowIso(),
        });
        onDone();
      } else if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "surfaceAnalyze"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "surface", result },
          now: nowIso(),
        });
        onDone();
      } else if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "comparisonProcedure"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "procedure", result },
          now: nowIso(),
        });
        onDone();
      } else if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "anovaFactorial"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "factorial", result },
          now: nowIso(),
        });
        onDone();
      } else if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "designOptimalAnalyze"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({
          type: "storeResult",
          source,
          result: { signature, kind: "optimal", result },
          now: nowIso(),
        });
        onDone();
      } else if (response.outcome.status === "error") {
        setMessages(engineErrorMessages(t, response.outcome.error));
      }
    } catch (error) {
      if (!(error instanceof StaleResponseError))
        setMessages([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section aria-labelledby="analysis-title">
      <h2 id="analysis-title">
        {kind === "oneWay" || kind === "procedure" || kind === "factorial"
          ? t("analysis.compare.title")
          : kind === "design"
            ? t("analysis.design.title")
            : kind === "surface"
              ? t("analysis.surface.title")
              : t("analysis.title")}
      </h2>
      <p className="muted">
        {kind === "oneWay" || kind === "procedure" || kind === "factorial"
          ? compareIntro
          : kind === "design"
            ? t("analysis.design.intro")
            : kind === "surface"
              ? t("analysis.surface.intro")
              : t("analysis.intro")}
      </p>
      {state.path === "analyze" && (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={state.analysis.surface}
              onChange={(e) =>
                dispatch({
                  type: "setAnalysis",
                  patch: { surface: e.target.checked, designTerms: null },
                })
              }
            />
            <span>{t("analysis.surface.asSurface")}</span>
          </label>
          <p className="muted small">{t("analysis.surface.asSurfaceHelp")}</p>
        </>
      )}
      <GuidedFlow
        testId="analysis-blocks"
        storageKey={`${workspace.projectId}:${workspace.createdAt}:${state.id}:analysis`}
        onPrevious={onPrevious}
      >
        <FlowBlock id="analysis-response" title={t("analysis.response")} order={0}>
          <label className="field">
            <span>{t("analysis.structure")}</span>
            <select value={structure} onChange={(e) => setStructure(e.target.value)}>
              <option value="independent">{t("analysis.independent")}</option>
              <option value="repeated">{t("analysis.dependent")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("analysis.response")}</span>
            <select
              value={state.analysis.responseId ?? ""}
              onChange={(e) =>
                dispatch({ type: "setAnalysis", patch: { responseId: e.target.value || null } })
              }
            >
              {state.responses.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.id}
                  {r.unit ? ` [${r.unit}]` : ""}
                </option>
              ))}
            </select>
          </label>
        </FlowBlock>
        {structure === "repeated" ? (
          <FlowBlock id="analysis-repeated" title={t("analysis.dependent")} order={1}>
            <RepeatedMeasures
              language={t("languageCode") === "en" ? "en" : "pt-BR"}
              embedded
              onShowUnits={() => {
                onPrevious?.();
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLInputElement>('.data-grid td[data-role="unit"] input')
                    ?.focus(),
                );
              }}
            />
          </FlowBlock>
        ) : (
          <>
            {kind === "optimal" && (
              <FlowBlock
                id="analysis-optimal-model"
                title={t("design.optimal.categories.analysisTitle")}
                order={1}
              >
                <p>{t("design.optimal.categories.analysisHelp")}</p>
                <label className="field">
                  <span>{t("design.optimal.categories.savedModel")}</span>
                  <select
                    value={state.analysis.optimalDesignId ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "setAnalysis",
                        patch: { optimalDesignId: e.target.value || null },
                      })
                    }
                  >
                    {state.optimalDesigns
                      .filter((d) => d.result.spec.categories)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {t("design.optimal.categories.modelOption", {
                            id: d.id,
                            parameters: d.result.metrics.parameters,
                            model: t(`design.optimal.models.${d.result.spec.model}`),
                            factors: d.result.spec.categories?.factors
                              .map((f) => f.name)
                              .join(" × "),
                          })}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("analysis.compare.alpha")}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    aria-invalid={invalidOptimalAlpha || undefined}
                    aria-describedby={invalidOptimalAlpha ? "optimal-alpha-error" : undefined}
                    value={state.analysis.alpha}
                    onChange={(e) =>
                      dispatch({ type: "setAnalysis", patch: { alpha: Number(e.target.value) } })
                    }
                  />
                </label>
                {invalidOptimalAlpha && (
                  <p id="optimal-alpha-error" className="error" role="alert">
                    {t("issues.comparison.invalid_alpha", { ns: "diagnostics" })}
                  </p>
                )}
              </FlowBlock>
            )}
            {(kind === "oneWay" || kind === "procedure" || kind === "factorial") && (
              <>
                <MethodChoice />
                <FlowBlock
                  id="analysis-factor"
                  title={t(
                    kind === "factorial" ? "analysis.compare.alpha" : "analysis.compare.factor",
                  )}
                  order={2.5}
                >
                  {kind === "factorial" ? null : state.factors.length === 0 ? (
                    <p className="muted" role="status">
                      {t("analysis.compare.needFactor")}
                    </p>
                  ) : (
                    <label className="field">
                      <span>{t("analysis.compare.factor")}</span>
                      <select
                        value={state.analysis.factorId ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "setAnalysis",
                            patch: { factorId: e.target.value || null },
                          })
                        }
                      >
                        <option value="">—</option>
                        {state.factors.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name || f.id}
                          </option>
                        ))}
                      </select>
                      <small className="muted">{t("analysis.compare.factorHelp")}</small>
                    </label>
                  )}
                  <label className="field">
                    <span>{t("analysis.compare.alpha")}</span>
                    <select
                      value={String(state.analysis.alpha)}
                      onChange={(e) =>
                        dispatch({ type: "setAnalysis", patch: { alpha: Number(e.target.value) } })
                      }
                    >
                      {[0.1, 0.05, 0.01].map((a) => (
                        <option key={a} value={String(a)}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <small className="muted">{compareAlphaHelp}</small>
                  </label>
                </FlowBlock>
              </>
            )}
            {(kind === "design" ||
              kind === "surface" ||
              (kind === "descriptive" && state.factors.length > 0)) && (
              <FlowBlock id="analysis-regression" title={t("analysis.modelOptions")} order={2}>
                {kind === "design" && (
                  <DesignModel
                    selected={designTermIds(state)}
                    onChange={(terms) =>
                      dispatch({ type: "setAnalysis", patch: { designTerms: terms } })
                    }
                  />
                )}
                {kind === "surface" && (
                  <>
                    <SurfaceModel />
                    <SurfaceBlockOptions />
                  </>
                )}
                {kind === "descriptive" && state.factors.length > 0 && (
                  <fieldset className="editor-card">
                    <legend>{t("analysis.groupBy")}</legend>
                    <p className="muted small">{t("analysis.groupByHelp")}</p>
                    {state.factors.map((f) => (
                      <label key={f.id} className="check">
                        <input
                          type="checkbox"
                          checked={state.analysis.groupBy.includes(f.id)}
                          onChange={(e) =>
                            dispatch({
                              type: "setAnalysis",
                              patch: {
                                groupBy: e.target.checked
                                  ? [...state.analysis.groupBy, f.id]
                                  : state.analysis.groupBy.filter((id) => id !== f.id),
                              },
                            })
                          }
                        />
                        <span>{f.name || f.id}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </FlowBlock>
            )}
            <FlowBlock id="analysis-run" title={t("analysis.reviewRun")} order={4}>
              <p data-testid="analysis-summary">
                {analysisDescription(
                  t,
                  state,
                  {
                    ...state.analysis,
                    surfaceBlock: state.analysis.surfaceBlock ?? undefined,
                    factorId: state.analysis.factorId ?? undefined,
                    procedure: state.analysis.procedure ?? undefined,
                    optimalDesignId: state.analysis.optimalDesignId ?? undefined,
                    factorial: state.analysis.factorial ?? undefined,
                    terms: state.analysis.designTerms ?? undefined,
                  },
                  kind,
                )}
              </p>
              <button
                type="button"
                className="button"
                onClick={run}
                disabled={
                  running ||
                  invalidOptimalAlpha ||
                  state.analysis.responseId === null ||
                  ((kind === "oneWay" || kind === "procedure") &&
                    state.analysis.factorId === null) ||
                  (kind === "factorial" &&
                    (state.analysis.factorial?.factorIds.length ?? 0) === 0) ||
                  (kind === "optimal" &&
                    !state.optimalDesigns.some(
                      (design) => design.id === state.analysis.optimalDesignId,
                    )) ||
                  (kind === "design" && state.design === null) ||
                  (kind === "surface" &&
                    (surfaceFactors(state).length < 1 || state.analysis.designTerms?.length === 0))
                }
              >
                {running
                  ? t("analysis.running")
                  : kind === "optimal"
                    ? t("design.optimal.categories.analyze")
                    : kind === "oneWay" || kind === "procedure" || kind === "factorial"
                      ? t("analysis.compare.run")
                      : kind === "design"
                        ? t("analysis.design.run")
                        : kind === "surface"
                          ? t("analysis.surface.run")
                          : t("analysis.run")}
              </button>
              {messages.length > 0 && (
                <div role="alert" className="error">
                  {messages.map((m) => (
                    <p key={m}>{m}</p>
                  ))}
                </div>
              )}
            </FlowBlock>
          </>
        )}
      </GuidedFlow>
    </section>
  );
}

/** Escolha dos termos do modelo do planejamento: principais, principais + interações, personalizado. */
function DesignModel({
  selected,
  onChange,
}: {
  selected: string[][];
  onChange: (terms: string[][]) => void;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const design = state.design;
  if (!design)
    return (
      <p className="muted" role="status">
        {t("analysis.design.needDesign")}
      </p>
    );
  const ids = design.factors.map((f) => f.id);
  const main = ids.map((id) => [id]);
  const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b]));
  const key = (term: string[]) => term.join("|");
  const selectedKeys = new Set(selected.map(key));
  const isMain = selected.length === main.length && main.every((m) => selectedKeys.has(key(m)));
  const isTwo =
    selected.length === main.length + pairs.length &&
    [...main, ...pairs].every((m) => selectedKeys.has(key(m)));
  const mode = isMain ? "main" : isTwo ? "two" : "custom";
  const nameOf = (id: string) => design.factors.find((f) => f.id === id)?.name ?? id;
  const toggle = (term: string[], on: boolean) =>
    onChange(on ? [...selected, term] : selected.filter((s) => key(s) !== key(term)));
  return (
    <>
      <fieldset className="editor-card">
        <legend>{t("analysis.design.model")}</legend>
        <label className="check">
          <input
            type="radio"
            name="design-model"
            checked={mode === "main"}
            onChange={() => onChange(main)}
          />
          <span>{t("analysis.design.modelMain")}</span>
        </label>
        <label className="check">
          <input
            type="radio"
            name="design-model"
            checked={mode === "two"}
            onChange={() => onChange([...main, ...pairs])}
          />
          <span>{t("analysis.design.modelTwoFactor")}</span>
        </label>
        <label className="check">
          <input
            type="radio"
            name="design-model"
            checked={mode === "custom"}
            onChange={() => onChange(selected)}
          />
          <span>{t("analysis.design.modelCustom")}</span>
        </label>
        <p className="muted small">{t("analysis.design.modelHelp")}</p>
        {mode === "custom" && (
          <fieldset>
            <legend>{t("analysis.design.termsLegend")}</legend>
            {[...main, ...pairs].map((term) => (
              <label className="check" key={key(term)}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(key(term))}
                  onChange={(e) => toggle(term, e.target.checked)}
                />
                <span>{term.map(nameOf).join(" × ")}</span>
              </label>
            ))}
          </fieldset>
        )}
      </fieldset>
      <label className="field">
        <span>{t("analysis.compare.alpha")}</span>
        <select
          value={String(state.analysis.alpha)}
          onChange={(e) =>
            dispatch({ type: "setAnalysis", patch: { alpha: Number(e.target.value) } })
          }
        >
          {[0.1, 0.05, 0.01].map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={state.analysis.includeCurvature && design.centerPoints > 0}
          disabled={design.centerPoints === 0}
          onChange={(e) =>
            dispatch({ type: "setAnalysis", patch: { includeCurvature: e.target.checked } })
          }
        />
        <span>
          {design.centerPoints > 0
            ? t("analysis.design.curvature")
            : t("analysis.design.curvatureUnavailable")}
        </span>
      </label>
    </>
  );
}

/** Termos do modelo de segunda ordem: completo (padrão do motor) ou escolhidos à mão, sem eliminação automática. */
function SurfaceModel() {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const factors = surfaceFactors(state);
  if (factors.length < 1)
    return (
      <p className="muted" role="status">
        {t("analysis.surface.needFactors")}
      </p>
    );
  const ids = factors.map((f) => f.id);
  const all: string[][] = [
    ...ids.map((id) => [id]),
    ...ids.map((id) => [id, id]),
    ...ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b])),
  ];
  const key = (term: string[]) => term.join("|");
  const selected = state.analysis.designTerms;
  const selectedKeys = new Set((selected ?? all).map(key));
  const nameOf = (id: string) => factors.find((f) => f.id === id)?.name ?? id;
  const label = (term: string[]) =>
    term.length === 2 && term[0] === term[1]
      ? `${nameOf(term[0] as string)}²`
      : term.map(nameOf).join(" × ");
  const toggle = (term: string[], on: boolean) =>
    dispatch({
      type: "setAnalysis",
      patch: {
        designTerms: on
          ? all.filter((x) => selectedKeys.has(key(x)) || key(x) === key(term))
          : all.filter((x) => selectedKeys.has(key(x)) && key(x) !== key(term)),
      },
    });
  return (
    <>
      <fieldset className="editor-card">
        <legend>{t("analysis.surface.model")}</legend>
        <label className="check">
          <input
            type="radio"
            name="surface-model"
            checked={selected === null}
            onChange={() => dispatch({ type: "setAnalysis", patch: { designTerms: null } })}
          />
          <span>{t("analysis.surface.modelFull")}</span>
        </label>
        <label className="check">
          <input
            type="radio"
            name="surface-model"
            checked={selected !== null}
            onChange={() => dispatch({ type: "setAnalysis", patch: { designTerms: all } })}
          />
          <span>{t("analysis.surface.modelCustom")}</span>
        </label>
        <p className="muted small">{t("analysis.surface.modelHelp")}</p>
        {selected !== null && (
          <fieldset>
            <legend>{t("analysis.surface.termsLegend")}</legend>
            {all.map((term) => (
              <label className="check" key={key(term)}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(key(term))}
                  onChange={(e) => toggle(term, e.target.checked)}
                />
                <span>{label(term)}</span>
              </label>
            ))}
          </fieldset>
        )}
      </fieldset>
      <label className="field">
        <span>{t("analysis.compare.alpha")}</span>
        <select
          value={String(state.analysis.alpha)}
          onChange={(e) =>
            dispatch({ type: "setAnalysis", patch: { alpha: Number(e.target.value) } })
          }
        >
          {[0.1, 0.05, 0.01].map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
