import { useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import {
  analysisKind,
  buildDataset,
  buildOperation,
  designTermIds,
  inputSignature,
  surfaceFactors,
} from "./buildRequest";

interface Props {
  /** Chamado quando um resultado novo foi calculado e guardado. */
  onDone: () => void;
}

export function AnalysisSetup({ onDone }: Props) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  if (state.responses.length === 0) return <p className="muted">{t("analysis.noResponse")}</p>;

  const kind = analysisKind(state);
  const run = async () => {
    const { dataset } = buildDataset(state);
    const operation = buildOperation(state, dataset);
    if (!operation) return;
    const signature = inputSignature(state);
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
          result: { signature, kind: "surface", result },
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
        {kind === "oneWay"
          ? t("analysis.compare.title")
          : kind === "design"
            ? t("analysis.design.title")
            : kind === "surface"
              ? t("analysis.surface.title")
              : t("analysis.title")}
      </h2>
      <p className="muted">
        {kind === "oneWay"
          ? t("analysis.compare.intro")
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
      {kind === "oneWay" && (
        <>
          {state.factors.length === 0 ? (
            <p className="muted" role="status">
              {t("analysis.compare.needFactor")}
            </p>
          ) : (
            <label className="field">
              <span>{t("analysis.compare.factor")}</span>
              <select
                value={state.analysis.factorId ?? ""}
                onChange={(e) =>
                  dispatch({ type: "setAnalysis", patch: { factorId: e.target.value || null } })
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
            <small className="muted">{t("analysis.compare.alphaHelp")}</small>
          </label>
        </>
      )}
      {kind === "design" && (
        <DesignModel
          selected={designTermIds(state)}
          onChange={(terms) => dispatch({ type: "setAnalysis", patch: { designTerms: terms } })}
        />
      )}
      {kind === "surface" && <SurfaceModel />}
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
      <button
        type="button"
        className="button"
        onClick={run}
        disabled={
          running ||
          state.analysis.responseId === null ||
          (kind === "oneWay" && state.analysis.factorId === null) ||
          (kind === "design" && state.design === null) ||
          (kind === "surface" &&
            (surfaceFactors(state).length < 2 || state.analysis.designTerms?.length === 0))
        }
      >
        {running
          ? t("analysis.running")
          : kind === "oneWay"
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
  if (factors.length < 2)
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
