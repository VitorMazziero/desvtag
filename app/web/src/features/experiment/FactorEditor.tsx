import { useTranslation } from "react-i18next";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import type { FactorKindDraft } from "../../state/project";

export function FactorEditor() {
  const { t } = useTranslation();
  const { factors, path } = useProject();
  const dispatch = useProjectDispatch();
  return (
    <section aria-labelledby="factors-title" className="editor-section">
      <h3 id="factors-title">{t("variables.factors")}</h3>
      <p className="muted small">
        {t(path === "plan" ? "variables.planKindHelp" : "variables.compareKindHelp")}
      </p>
      {factors.length === 0 && <p className="muted">{t("variables.noFactors")}</p>}
      {factors.map((factor, index) => (
        <fieldset key={factor.id} className="editor-card">
          <legend>
            {t("variables.factorHeading", { n: index + 1 })}
            {factor.name ? ` — ${factor.name}` : ""}
          </legend>
          <div className="form-grid">
            <label className="field">
              <span>{t("variables.name")}</span>
              <input
                type="text"
                value={factor.name}
                onChange={(e) =>
                  dispatch({ type: "updateFactor", id: factor.id, patch: { name: e.target.value } })
                }
              />
            </label>
            <label className="field">
              <span>{t("variables.kind")}</span>
              <select
                aria-label={t("variables.kind")}
                value={factor.kind}
                onChange={(e) =>
                  dispatch({
                    type: "updateFactor",
                    id: factor.id,
                    patch: { kind: e.target.value as FactorKindDraft },
                  })
                }
              >
                <option value="categorical">{t("variables.kindCategorical")}</option>
                <option value="numeric">{t("variables.kindNumeric")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("variables.unit")}</span>
              <input
                type="text"
                aria-label={t("variables.unitOf", {
                  name: factor.name || t("variables.factorHeading", { n: index + 1 }),
                })}
                value={factor.unit}
                onChange={(e) =>
                  dispatch({ type: "updateFactor", id: factor.id, patch: { unit: e.target.value } })
                }
              />
            </label>
            {
              <label className="field wide">
                <span>{t("variables.levels")}</span>
                <input
                  type="text"
                  value={factor.levelsText}
                  aria-describedby={`levels-help-${factor.id}`}
                  onChange={(e) =>
                    dispatch({
                      type: "updateFactor",
                      id: factor.id,
                      patch: { levelsText: e.target.value },
                    })
                  }
                />
                <small id={`levels-help-${factor.id}`} className="muted">
                  {t("variables.levelsHelp")}
                </small>
              </label>
            }
          </div>
          <button
            type="button"
            className="button secondary small"
            onClick={() => dispatch({ type: "removeFactor", id: factor.id })}
          >
            {t("variables.remove")}
          </button>
        </fieldset>
      ))}
      <button type="button" className="button" onClick={() => dispatch({ type: "addFactor" })}>
        {t("variables.addFactor")}
      </button>
    </section>
  );
}
