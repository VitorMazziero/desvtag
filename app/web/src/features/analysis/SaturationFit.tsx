// Ajuste de curvas de saturação (v0.3): Monod / Michaelis–Menten, Haldane (inibição pelo substrato)
// e Hill, por Levenberg–Marquardt com vários inícios. O substrato é um fator **numérico** do
// experimento e a resposta, uma das respostas. O resultado é calculado ao pedir e guardado com suas entradas e revisão.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { SaturationModel } from "../../services/engine";
import { StaleResponseError } from "../../services/engine/EngineClient";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";
import { useProblemFocus } from "../menus/useProblemFocus";
import { nonlinearSignature } from "./familySignatures";
import { NonlinearOptions } from "./NonlinearOptions";
import { nonlinearParameterLabels, parseNonlinearOptions } from "./parseNonlinearOptions";
import { useCalculationTask } from "./useCalculationTask";
import { useFamilyRecorder } from "./useFamilyRecorder";

export function SaturationFit({
  language,
  embedded = false,
  onCalculated,
}: {
  language: Language;
  /** Dentro de uma janela do menu «Extras»: sempre aberto, sem o título recolhível. */
  embedded?: boolean;
  onCalculated?: () => void;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const { client } = useEngine();
  const factors = state.factors.filter((f) => f.kind === "numeric" && f.name.trim() !== "");
  const responses = state.responses.filter((r) => r.name.trim() !== "");
  const [open, setOpen] = useState(false);
  const dispatch = useProjectDispatch();
  const selection = state.nonlinearResult?.selection ?? {
    factorId: factors[0]?.id ?? null,
    responseId: state.analysis.responseId ?? responses[0]?.id ?? null,
    model: "monod" as SaturationModel,
  };
  const { factorId, responseId, model } = selection;
  const update = (patch: Partial<typeof selection>) =>
    dispatch({
      type: "setFamilySelection",
      family: "nonlinear",
      selection: { ...selection, ...patch },
    });
  const setFactorId = (factorId: string) => update({ factorId });
  const setResponseId = (responseId: string) => update({ responseId });
  const setModel = (model: SaturationModel) =>
    update({ model, initial: undefined, lower: undefined, upper: undefined });
  const taskState = useCalculationTask("nonlinear");
  const { busy } = taskState;
  const [problems, setProblems] = useState<string[]>([]);
  const problemFocus = useProblemFocus(problems);
  const currentSignature = nonlinearSignature(state, selection);
  const capture = useFamilyRecorder();
  const record = state.nonlinearResult?.records.at(-1);
  const stale = Boolean(record && record.signature !== currentSignature);

  const run = async () => {
    const f = state.factors.findIndex((x) => x.id === factorId);
    const r = state.responses.findIndex((x) => x.id === responseId);
    if (f < 0 || r < 0) return;
    const xs: number[] = [];
    const ys: number[] = [];
    const bad: number[] = [];
    state.rows.forEach((row, i) => {
      const x = parseNumberCell(row.factors[f] ?? "");
      const y = parseNumberCell(row.responses[r] ?? "");
      if (!x.ok || !y.ok) bad.push(i + 1);
      else if (x.value !== null && y.value !== null) {
        xs.push(x.value);
        ys.push(y.value);
      }
    });
    if (bad.length > 0) {
      setProblems([t("saturation.badCells", { rows: bad.slice(0, 5).join(", ") })]);
      return;
    }
    const options = parseNonlinearOptions(selection);
    if (Object.keys(options.errors).length) return;
    const { errors: _errors, ...parsedOptions } = options;
    const request = {
      x: xs,
      y: ys,
      model,
      ...parsedOptions,
      alpha: state.analysis.alpha,
    };
    const save = capture(currentSignature);
    const task = taskState.begin();
    setProblems([]);
    try {
      const response = await client.request(
        { type: "modelNonlinear", ...request },
        { channel: "nonlinear" },
      );
      if (!taskState.isCurrent(task)) return;
      if (response.outcome.status === "ok" && response.outcome.result.type === "modelNonlinear") {
        const { type: _type, ...result } = response.outcome.result;
        save({
          family: "nonlinear",
          selection,
          input: { factorId: factorId!, responseId: responseId!, request },
          result,
        });
        onCalculated?.();
      } else if (response.outcome.status === "error") {
        setProblems(engineErrorMessages(t, response.outcome.error));
      }
    } catch (error) {
      if (taskState.isCurrent(task) && !(error instanceof StaleResponseError))
        setProblems([t("execution.transportFailure")]);
    } finally {
      taskState.finish(task);
    }
  };

  return (
    <details
      className={embedded ? "advanced embedded" : "advanced"}
      data-testid="saturation-fit"
      open={embedded || open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("saturation.title")}</summary>
      {(embedded || open) && (
        <div className="tool-form" aria-busy={busy}>
          {busy && (
            <p role="status">
              {t(client.kind === "tauri" ? "execution.nativeBusy" : "execution.webBusy")}
            </p>
          )}
          <p className="muted">{t("saturation.intro")}</p>
          <details className="advanced" data-report-skip>
            <summary>{t("methodDetails")}</summary>
            <p className="muted">{t("saturation.methodDetails")}</p>
            <p className="muted">{t("profile.capacity")}</p>
          </details>
          {factors.length === 0 ? (
            <p className="muted">{t("saturation.needFactor")}</p>
          ) : (
            <div className="row">
              <label className="field">
                <span>{t("saturation.substrate")}</span>
                <select value={factorId ?? ""} onChange={(e) => setFactorId(e.target.value)}>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("saturation.response")}</span>
                <select value={responseId ?? ""} onChange={(e) => setResponseId(e.target.value)}>
                  {responses.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("saturation.model")}</span>
                <select
                  data-testid="saturation-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value as SaturationModel)}
                >
                  <option value="monod">{t("saturation.models.monod")}</option>
                  <option value="haldane">{t("saturation.models.haldane")}</option>
                  <option value="hill">{t("saturation.models.hill")}</option>
                </select>
              </label>
            </div>
          )}
          {factors.length > 0 && (
            <>
              <NonlinearOptions
                selection={selection}
                onChange={update}
                disabled={busy}
                labels={nonlinearParameterLabels(
                  model,
                  state.factors.find((f) => f.id === factorId)?.unit ?? "",
                  state.responses.find((r) => r.id === responseId)?.unit ?? "",
                )}
              />
              <div className="actions">
                <button
                  type="button"
                  className="button"
                  disabled={busy || Object.keys(parseNonlinearOptions(selection).errors).length > 0}
                  onClick={run}
                >
                  {t("saturation.fit")}
                </button>
                {busy && (
                  <button
                    type="button"
                    className="button secondary"
                    data-testid="nonlinear-cancel"
                    onClick={() => {
                      taskState.cancel();
                    }}
                  >
                    {t("saturationOptions.cancel")}
                  </button>
                )}
              </div>
            </>
          )}
          {stale && (
            <p role="status" className="stale-notice" data-testid="saturation-stale">
              {t("saturation.stale")}
            </p>
          )}
          {record && <p className="muted small">{t("family.savedInResults")}</p>}
          {problems.length > 0 && (
            <div ref={problemFocus} role="alert" tabIndex={-1} className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
