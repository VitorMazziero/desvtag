import { useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { analysisKind, buildDataset, buildOperation, inputSignature } from "./buildRequest";

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
        {kind === "oneWay" ? t("analysis.compare.title") : t("analysis.title")}
      </h2>
      <p className="muted">
        {kind === "oneWay" ? t("analysis.compare.intro") : t("analysis.intro")}
      </p>
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
          (kind === "oneWay" && state.analysis.factorId === null)
        }
      >
        {running
          ? t("analysis.running")
          : kind === "oneWay"
            ? t("analysis.compare.run")
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
