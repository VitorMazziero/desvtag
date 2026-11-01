import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StaleResponseError } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { buildDataset, buildOperation, inputSignature } from "./buildRequest";

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

  const run = async () => {
    const { dataset } = buildDataset(state);
    const operation = buildOperation(state, dataset);
    if (!operation) return;
    const signature = inputSignature(state);
    setRunning(true);
    setMessages([]);
    try {
      const response = await client.request(operation, { channel: "descriptive" });
      if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "descriptiveSummarize"
      ) {
        const { type: _type, ...result } = response.outcome.result;
        dispatch({ type: "storeResult", result: { signature, result } });
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
      <h2 id="analysis-title">{t("analysis.title")}</h2>
      <p className="muted">{t("analysis.intro")}</p>
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
      {state.factors.length > 0 && (
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
        disabled={running || state.analysis.responseId === null}
      >
        {running ? t("analysis.running") : t("analysis.run")}
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
