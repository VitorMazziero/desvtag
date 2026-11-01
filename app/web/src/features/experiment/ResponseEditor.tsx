import { useTranslation } from "react-i18next";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";

export function ResponseEditor() {
  const { t } = useTranslation();
  const { responses } = useProject();
  const dispatch = useProjectDispatch();
  return (
    <section aria-labelledby="responses-title" className="editor-section">
      <h3 id="responses-title">{t("variables.responses")}</h3>
      {responses.length === 0 && <p className="muted">{t("variables.noResponses")}</p>}
      {responses.map((response, index) => (
        <fieldset key={response.id} className="editor-card">
          <legend>{t("variables.responseHeading", { n: index + 1 })}</legend>
          <div className="form-grid">
            <label className="field">
              <span>{t("variables.name")}</span>
              <input
                type="text"
                value={response.name}
                onChange={(e) =>
                  dispatch({
                    type: "updateResponse",
                    id: response.id,
                    patch: { name: e.target.value },
                  })
                }
              />
            </label>
            <label className="field">
              <span>{t("variables.unit")}</span>
              <input
                type="text"
                value={response.unit}
                onChange={(e) =>
                  dispatch({
                    type: "updateResponse",
                    id: response.id,
                    patch: { unit: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => dispatch({ type: "removeResponse", id: response.id })}
          >
            {t("variables.remove")}
          </button>
        </fieldset>
      ))}
      <button type="button" className="button" onClick={() => dispatch({ type: "addResponse" })}>
        {t("variables.addResponse")}
      </button>
    </section>
  );
}
