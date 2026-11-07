// Calculadora de potência, tamanho de amostra e precisão (v0.3), para usar **antes** dos ensaios.
// As fórmulas são exatas (F e t não centrais); a potência vale para o σ e o efeito informados, que
// são suposições suas. O resultado é guardado com as hipóteses do cálculo.
import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { PowerSelection } from "../../services/engine";
import { StaleResponseError } from "../../services/engine/EngineClient";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { savedPowerSignature } from "../analysis/familySignatures";
import { useCalculationTask } from "../analysis/useCalculationTask";
import { useFamilyRecorder } from "../analysis/useFamilyRecorder";
import { useProblemFocus } from "../menus/useProblemFocus";
import { PowerAdvancedOptions } from "./PowerAdvancedOptions";
import { defaultPowerAdvanced, isAdvancedPower } from "./powerDesignInput";
import { buildPowerRequest } from "./powerRequest";
import {
  type PowerField,
  type PowerGoalKind,
  type PowerKind,
  validatePower,
} from "./powerValidation";

type Kind = PowerKind;
type Goal = PowerGoalKind;

export function PowerCalculator({
  language,
  embedded = false,
  onCalculated,
}: {
  language: Language;
  /** Dentro de uma janela do menu «Extras»: sempre aberta, sem o título recolhível. */
  embedded?: boolean;
  onCalculated?: () => void;
}) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const [open, setOpen] = useState(false);
  const state = useProject();
  const dispatch = useProjectDispatch();
  const selection: PowerSelection = state.powerResult?.selection ?? {
    kind: "twoSampleT" as Kind,
    goal: "sampleSizeFor" as Goal,
    means: "10; 12; 14; 12",
    difference: "1",
    sigma: "1.5",
    alpha: "0.05",
    target: "0.8",
    n: "10",
    halfWidth: "0.5",
    twoSided: true,
  };
  const { kind, goal, means, difference, sigma, alpha, target, n, halfWidth, twoSided } = selection;
  const update = (patch: Partial<typeof selection>) =>
    dispatch({
      type: "setFamilySelection",
      family: "power",
      selection: { ...selection, ...patch },
    });
  const setGoal = (goal: Goal) => update({ goal });
  const setMeans = (means: string) => update({ means });
  const setDifference = (difference: string) => update({ difference });
  const setSigma = (sigma: string) => update({ sigma });
  const setAlpha = (alpha: string) => update({ alpha });
  const setTarget = (target: string) => update({ target });
  const setN = (n: string) => update({ n });
  const setHalfWidth = (halfWidth: string) => update({ halfWidth });
  const setTwoSided = (twoSided: boolean) => update({ twoSided });
  const record = state.powerResult?.records.at(-1);
  const capture = useFamilyRecorder();
  const [problems, setProblems] = useState<string[]>([]);
  const problemFocus = useProblemFocus(problems);
  const taskState = useCalculationTask("power");
  const { busy } = taskState;
  // Assinatura das entradas que produziram `result`; difere da atual quando algo foi alterado.

  const [attempted, setAttempted] = useState(false);
  const idBase = useId();
  const form = useRef<HTMLDivElement>(null);

  const inputs = selection;
  const fieldProblems = useMemo(() => validatePower(inputs), [inputs]);
  const stale = Boolean(record && record.signature !== savedPowerSignature(selection));
  const errorId = (field: PowerField) => `${idBase}-${field}`;
  const fieldProps = (field: PowerField) => ({
    "aria-label": t(field === "n" && isAdvancedPower(kind) ? "powerAdvanced.n" : `power.${field}`),
    "data-testid": `power-input-${field}`,
    ...(attempted && fieldProblems[field]
      ? { "aria-invalid": true as const, "aria-describedby": errorId(field) }
      : {}),
  });
  const fieldError = (field: PowerField) => {
    const code = fieldProblems[field];
    return attempted && code ? (
      <small id={errorId(field)} className="error">
        {t(`issues.${code}`, { ns: "diagnostics" })}
      </small>
    ) : null;
  };

  const calculate = async () => {
    setAttempted(true);
    if (Object.keys(fieldProblems).length > 0) {
      setProblems([]);
      requestAnimationFrame(() => {
        const field = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        field?.focus({ preventScroll: true });
        field?.scrollIntoView({ block: "nearest" });
      });
      return;
    }
    const signature = savedPowerSignature(selection);
    const request = buildPowerRequest(selection);
    if (!request) return;
    const save = capture(signature);
    const task = taskState.begin();
    setProblems([]);
    try {
      const response = await client.request(
        { type: "powerAnalyze", ...request },
        { channel: "power" },
      );
      if (!taskState.isCurrent(task)) return;
      if (response.outcome.status === "ok" && response.outcome.result.type === "powerAnalyze") {
        const { type: _type, ...result } = response.outcome.result;
        save({ family: "power", selection, input: request, result });
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
      data-testid="power-calculator"
      open={embedded || open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("power.title")}</summary>
      {(embedded || open) && (
        <div className="tool-form" ref={form} aria-busy={busy}>
          {busy && (
            <p role="status">
              {t(client.kind === "tauri" ? "execution.nativeBusy" : "execution.webBusy")}
            </p>
          )}
          <p className="muted">
            {t(isAdvancedPower(kind) ? "powerAdvanced.generalIntro" : "power.intro")}
          </p>
          <details className="advanced" data-report-skip>
            <summary>{t("methodDetails")}</summary>
            <p className="muted">{t("power.methodDetails")}</p>
          </details>
          <div className="row">
            <label className="field">
              <span>{t("power.design")}</span>
              <select
                data-testid="power-design"
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as Kind;
                  update({
                    kind: next,
                    ...((next === "anova" || next === "regression") && goal === "precisionFor"
                      ? { goal: "sampleSizeFor" }
                      : {}),
                    ...(isAdvancedPower(next)
                      ? { advanced: selection.advanced ?? defaultPowerAdvanced }
                      : {}),
                  });
                }}
              >
                <option value="twoSampleT">{t("power.designs.twoSampleT")}</option>
                <option value="pairedT">{t("power.designs.pairedT")}</option>
                <option value="oneSampleT">{t("power.designs.oneSampleT")}</option>
                <option value="anova">{t("power.designs.anova")}</option>
                <option value="regression">{t("power.designs.regression")}</option>
                <option value="contrast">{t("power.designs.contrast")}</option>
                <option value="twoLevel">{t("power.designs.twoLevel")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("power.goal")}</span>
              <select
                data-testid="power-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
              >
                <option value="sampleSizeFor">{t("power.goals.sampleSizeFor")}</option>
                <option value="powerAt">{t("power.goals.powerAt")}</option>
                <option value="precisionFor" disabled={kind === "anova" || kind === "regression"}>
                  {t("power.goals.precisionFor")}
                </option>
              </select>
            </label>
          </div>
          <div className="row">
            {kind === "anova" || kind === "contrast" ? (
              <label className="field">
                <span>{t("power.means")}</span>
                <input
                  type="text"
                  value={means}
                  onChange={(e) => setMeans(e.target.value)}
                  {...fieldProps("means")}
                />
                {fieldError("means")}
              </label>
            ) : !isAdvancedPower(kind) && goal !== "precisionFor" ? (
              <label className="field">
                <span>{t("power.difference")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={difference}
                  onChange={(e) => setDifference(e.target.value)}
                  {...fieldProps("difference")}
                />
                {fieldError("difference")}
              </label>
            ) : null}
            <label className="field">
              <span>{t("power.sigma")}</span>
              <input
                type="text"
                inputMode="decimal"
                value={sigma}
                onChange={(e) => setSigma(e.target.value)}
                {...fieldProps("sigma")}
              />
              {fieldError("sigma")}
            </label>
            <label className="field">
              <span>{t("power.alpha")}</span>
              <input
                type="text"
                inputMode="decimal"
                value={alpha}
                onChange={(e) => setAlpha(e.target.value)}
                {...fieldProps("alpha")}
              />
              {fieldError("alpha")}
            </label>
            {goal === "sampleSizeFor" && (
              <label className="field">
                <span>{t("power.target")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  {...fieldProps("target")}
                />
                {fieldError("target")}
              </label>
            )}
            {goal === "powerAt" && (
              <label className="field">
                <span>{t(isAdvancedPower(kind) ? "powerAdvanced.n" : "power.n")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={n}
                  onChange={(e) => setN(e.target.value)}
                  {...fieldProps("n")}
                />
                {fieldError("n")}
              </label>
            )}
            {goal === "precisionFor" && (
              <label className="field">
                <span>{t("power.halfWidth")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={halfWidth}
                  onChange={(e) => setHalfWidth(e.target.value)}
                  {...fieldProps("halfWidth")}
                />
                {fieldError("halfWidth")}
              </label>
            )}
          </div>
          {kind !== "anova" && kind !== "regression" && goal !== "precisionFor" && (
            <label className="check">
              <input
                type="checkbox"
                checked={twoSided}
                onChange={(e) => setTwoSided(e.target.checked)}
              />
              <span>{t("power.twoSided")}</span>
            </label>
          )}
          <PowerAdvancedOptions
            selection={selection}
            update={update}
            errors={fieldProblems}
            attempted={attempted}
          />
          <div className="row actions">
            <button type="button" className="button" disabled={busy} onClick={calculate}>
              {t("power.calculate")}
            </button>
            {busy && (
              <button
                type="button"
                className="button secondary"
                data-testid="power-cancel"
                onClick={() => {
                  taskState.cancel();
                }}
              >
                {t("powerAdvanced.cancel")}
              </button>
            )}
          </div>
          {stale && (
            <p role="status" className="stale-notice" data-testid="power-stale">
              {t("power.stale")}
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
