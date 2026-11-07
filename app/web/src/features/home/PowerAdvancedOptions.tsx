import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { PowerAdvancedSelection, PowerSelection } from "../../services/engine";
import { defaultPowerAdvanced, parsePowerTerms } from "./powerDesignInput";
import type { PowerField } from "./powerValidation";
export function PowerAdvancedOptions({
  selection,
  update,
  errors,
  attempted,
}: {
  selection: PowerSelection;
  update: (patch: Partial<PowerSelection>) => void;
  errors: Partial<Record<PowerField, string>>;
  attempted: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const raw = selection.advanced ?? defaultPowerAdvanced;
  const simulation = selection.simulation;
  const set = (patch: Partial<PowerAdvancedSelection>) =>
    update({ advanced: { ...raw, ...patch } });
  const props = (field: PowerField) => ({
    "aria-invalid": attempted && Boolean(errors[field]),
    "aria-describedby": attempted && errors[field] ? `${id}-${field}` : undefined,
  });
  const error = (field: PowerField) =>
    attempted && errors[field] ? (
      <small className="error" id={`${id}-${field}`}>
        {t(`issues.${errors[field]}`, { ns: "diagnostics" })}
      </small>
    ) : null;
  const input = (field: keyof PowerAdvancedSelection) => (
    <label className="field">
      <span>{t(`powerAdvanced.${field}`)}</span>
      <input
        type="text"
        data-testid={`power-${field}`}
        value={raw[field]}
        onChange={(e) => set({ [field]: e.target.value })}
        {...props(field)}
      />
      {error(field)}
    </label>
  );
  const terms = parsePowerTerms(raw.terms);
  const options = terms
    .map((term, index) => ({ term, value: String(index), key: term.join("*") }))
    .filter((option, index, all) => all.findIndex((other) => other.key === option.key) === index);
  return (
    <>
      {(["regression", "contrast", "twoLevel"] as string[]).includes(selection.kind) && (
        <fieldset className="editor-card" data-testid="power-advanced-options">
          <legend>{t(`powerAdvanced.title.${selection.kind}`)}</legend>
          <p className="muted">{t(`powerAdvanced.intro.${selection.kind}`)}</p>
          {selection.kind === "regression" && (
            <>
              <label className="field">
                <span>{t("powerAdvanced.predictors")}</span>
                <textarea
                  spellCheck={false}
                  wrap="off"
                  rows={6}
                  data-testid="power-predictors"
                  value={raw.predictors}
                  onChange={(e) => set({ predictors: e.target.value })}
                  {...props("predictors")}
                />
                {error("predictors")}
              </label>
              {input("coefficients")}
            </>
          )}
          {selection.kind === "contrast" && (
            <div className="form-grid">
              {input("weights")}
              {input("allocation")}
            </div>
          )}
          {selection.kind === "twoLevel" && (
            <>
              {input("factorCount")}
              {input("terms")}
              {input("effects")}
              <label className="field">
                <span>{t("powerAdvanced.targetTerm")}</span>
                <select
                  data-testid="power-targetTerm"
                  value={raw.targetTerm}
                  onChange={(e) => set({ targetTerm: e.target.value })}
                  {...props("targetTerm")}
                >
                  {options.map((option) => (
                    <option key={option.key} value={option.value}>
                      {option.term.map((f) => `${t("powerAdvanced.factor")} ${f + 1}`).join(" × ")}
                    </option>
                  ))}
                </select>
                {error("targetTerm")}
              </label>
            </>
          )}
          <details className="advanced">
            <summary>{t("methodDetails")}</summary>
            <p className="muted">{t(`powerAdvanced.help.${selection.kind}`)}</p>
          </details>
        </fieldset>
      )}
      <fieldset className="editor-card" data-testid="power-simulation-options">
        <legend>{t("powerAdvanced.simulationTitle")}</legend>
        <label className="check">
          <input
            type="checkbox"
            data-testid="power-simulation"
            checked={Boolean(simulation)}
            onChange={(e) =>
              update({
                simulation: e.target.checked
                  ? { seed: "20261104", replications: "10000" }
                  : undefined,
              })
            }
          />
          <span>{t("powerAdvanced.simulationEnable")}</span>
        </label>
        {simulation && (
          <>
            <p className="muted small">{t("powerAdvanced.simulationHelp")}</p>
            <div className="form-grid">
              <label className="field">
                <span>{t("powerAdvanced.simulationSeed")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="power-simulation-seed"
                  value={simulation.seed}
                  onChange={(e) => update({ simulation: { ...simulation, seed: e.target.value } })}
                  {...props("simulationSeed")}
                />
                {error("simulationSeed")}
              </label>
              <label className="field">
                <span>{t("powerAdvanced.simulationReplications")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="power-simulation-replications"
                  value={simulation.replications}
                  onChange={(e) =>
                    update({
                      simulation: { ...simulation, replications: e.target.value },
                    })
                  }
                  {...props("simulationReplications")}
                />
                {error("simulationReplications")}
              </label>
            </div>
          </>
        )}
      </fieldset>
    </>
  );
}
