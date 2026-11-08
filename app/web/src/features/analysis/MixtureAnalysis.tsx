// Análise de misturas (v0.3): modelos de Scheffé (linear, quadrático, cúbico especial) sem
// intercepto, ANOVA centrada na média, previsões sobre o triângulo (três componentes). O cálculo é
// do motor (`mixture.analyze`); o resultado é calculado ao pedir e é guardado com as entradas e a revisão do cálculo.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { type MixtureModel, StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";
import { mixtureSignature } from "./familySignatures";
import { MixtureOptimizationOptions, mixtureGoalFieldKeys } from "./MixtureOptimizationOptions";
import {
  collectMixtureResponse,
  defaultMixtureOptimization,
  parseMixtureOptimization,
} from "./mixtureOptimizationSetup";
import { useFamilyRecorder } from "./useFamilyRecorder";

export function MixtureAnalysis({
  language,
  onCurrent,
  onCalculated,
}: {
  language: Language;
  onCurrent?: (current: boolean) => void;
  onCalculated?: () => void;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const spec = state.mixture;
  const responses = state.responses.filter((r) => r.name.trim() !== "");
  const selection = state.mixtureResult?.selection ?? {
    responseId: state.analysis.responseId ?? responses[0]?.id ?? null,
  };
  const responseId = selection.responseId ?? "";
  const setResponseId = (responseId: string) =>
    dispatch({
      type: "setFamilySelection",
      family: "mixture",
      selection: { ...selection, responseId },
    });
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const record = state.mixtureResult?.records.at(-1);
  const signature = mixtureSignature(state, selection);
  const capture = useFamilyRecorder();
  const result = record?.result ?? null;
  const resultSignature = record?.signature;
  const current = result !== null && signature === resultSignature;
  useEffect(() => {
    onCurrent?.(current);
  }, [onCurrent, current]);

  if (!spec) return null;

  const names = spec.components.map((c) => c.name);

  const fit = async () => {
    const invalid = root.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
    if (invalid) {
      const details = invalid.closest("details");
      if (details) details.open = true;
      invalid.focus();
      setProblems([t("optimization.decision.invalidNumber")]);
      return;
    }
    const collected = collectMixtureResponse(state, responseId);
    if (!collected.known) {
      setProblems([t("issues.request.unknown_response", { ns: "diagnostics" })]);
      return;
    }
    if (collected.bad.length) {
      setProblems([t("mixture.analysis.badCells", { rows: collected.bad.slice(0, 5).join(", ") })]);
      return;
    }
    const { proportions, response } = collected.data;
    const coxReference = selection.coxReference?.map((text) => {
      const parsed = parseNumberCell(text);
      return parsed.ok ? parsed.value : null;
    });
    if (coxReference?.some((value) => value === null)) {
      setProblems([t("mixture.analysis.coxNumericReference")]);
      return;
    }
    const parsedOptimization = selection.optimization
      ? parseMixtureOptimization(state, selection.optimization, (key, name) => {
          const label = t(mixtureGoalFieldKeys[key] ?? key);
          return name ? `${name} — ${label}` : label;
        })
      : null;
    if (parsedOptimization?.invalid.length) {
      setProblems([
        t("mixture.analysis.optimInvalid", { fields: parsedOptimization.invalid.join("; ") }),
      ]);
      return;
    }
    const request = {
      optimization: parsedOptimization?.spec ?? undefined,
      coxReference: coxReference as number[] | undefined,
      componentNames: names,
      lowerBounds: spec.components.map((c) => c.lower),
      upperBounds: spec.upperBounds,
      proportions,
      response,
      model: state.mixtureModel,
      alpha: state.analysis.alpha,
    };
    const save = capture(signature);
    setBusy(true);
    setProblems([]);
    setNotice(null);
    try {
      const r = await client.request(
        { type: "mixtureAnalyze", ...request },
        { channel: "mixture-analysis" },
      );
      if (r.outcome.status === "ok" && r.outcome.result.type === "mixtureAnalyze") {
        const { type: _type, ...result } = r.outcome.result;
        save({
          family: "mixture",
          selection,
          input: { responseId, componentIds: spec.components.map((c) => c.id), request },
          result,
        });
        onCalculated?.();
      } else if (r.outcome.status === "error") {
        setProblems(engineErrorMessages(t, r.outcome.error));
      }
    } catch (error) {
      if (!(error instanceof StaleResponseError))
        setProblems([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      ref={root}
      className="mixture-analysis"
      aria-labelledby="mixture-analysis-title"
      data-testid="mixture-analysis"
    >
      {!current && result && (
        <p className="error" role="status">
          {t("stale", { ns: "results" })}
        </p>
      )}
      <h2 id="mixture-analysis-title">{t("mixture.analysis.title")}</h2>
      <p className="muted">{t("mixture.analysis.intro")}</p>
      <div className="row">
        <label className="field">
          <span>{t("mixture.analysis.response")}</span>
          <select value={responseId} onChange={(e) => setResponseId(e.target.value)}>
            {responses.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("mixture.analysis.model")}</span>
          <select
            data-testid="mixture-model"
            value={state.mixtureModel}
            onChange={(e) =>
              dispatch({ type: "setMixtureModel", model: e.target.value as MixtureModel })
            }
          >
            <option value="linear">{t("mixture.analysis.models.linear")}</option>
            <option value="quadratic">{t("mixture.analysis.models.quadratic")}</option>
            {spec.components.length >= 3 && (
              <option value="specialCubic">{t("mixture.analysis.models.specialCubic")}</option>
            )}
          </select>
        </label>
      </div>
      <fieldset className="editor-card" data-testid="cox-reference">
        <legend>{t("mixture.analysis.coxTitle")}</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={selection.coxReference !== undefined}
            onChange={(event) =>
              dispatch({
                type: "setFamilySelection",
                family: "mixture",
                selection: {
                  ...selection,
                  coxReference: event.target.checked ? spec.components.map(() => "") : undefined,
                },
              })
            }
          />
          <span>{t("mixture.analysis.coxEnable")}</span>
        </label>
        {selection.coxReference && (
          <>
            <p className="muted">{t("mixture.analysis.coxHelp")}</p>
            <div className="form-grid">
              {spec.components.map((component, index) => (
                <label className="field" key={component.id}>
                  <span>
                    {t("mixture.analysis.coxReferenceLabel", { component: component.name })}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={selection.coxReference?.[index] ?? ""}
                    onChange={(event) =>
                      dispatch({
                        type: "setFamilySelection",
                        family: "mixture",
                        selection: {
                          ...selection,
                          coxReference: spec.components.map((_, i) =>
                            i === index ? event.target.value : (selection.coxReference?.[i] ?? ""),
                          ),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </>
        )}
      </fieldset>
      <fieldset className="editor-card" data-testid="mixture-optimization-config">
        <legend>{t("mixture.analysis.optimTitle")}</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={selection.optimization !== undefined}
            disabled={!responseId}
            onChange={(event) =>
              dispatch({
                type: "setFamilySelection",
                family: "mixture",
                selection: {
                  ...selection,
                  optimization: event.target.checked
                    ? defaultMixtureOptimization(state, responseId)
                    : undefined,
                },
              })
            }
          />
          <span>{t("mixture.analysis.optimEnable")}</span>
        </label>
        {selection.optimization && (
          <MixtureOptimizationOptions
            draft={selection.optimization}
            onChange={(optimization) =>
              dispatch({
                type: "setFamilySelection",
                family: "mixture",
                selection: { ...selection, optimization },
              })
            }
          />
        )}
      </fieldset>
      <button type="button" className="button" disabled={busy || !responseId} onClick={fit}>
        {t(selection.optimization ? "mixture.analysis.fitOptimize" : "mixture.analysis.fit")}
      </button>
      {busy && (
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            client.cancel("mixture-analysis");
            setBusy(false);
            setNotice(t("optimization.run.cancelled"));
          }}
        >
          {t("optimization.run.cancel")}
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
      {problems.length > 0 && (
        <div role="alert" className="error">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
    </section>
  );
}
