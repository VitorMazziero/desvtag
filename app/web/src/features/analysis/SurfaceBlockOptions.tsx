import { useTranslation } from "react-i18next";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";

export function SurfaceBlockOptions() {
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { t } = useTranslation();
  const columns = state.factors.filter((factor) => factor.kind === "categorical");
  const selection = state.analysis.surfaceBlock;
  const levels = (id: string) => {
    const index = state.factors.findIndex((factor) => factor.id === id);
    const declared =
      state.factors[index]?.levelsText
        .split(";")
        .map((level) => level.trim())
        .filter(Boolean) ?? [];
    return declared.length
      ? declared
      : [
          ...new Set(
            state.rows
              .map((row) => row.factors[index]?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ].sort();
  };
  if (!columns.length && !selection) return null;
  const known = columns.some((factor) => factor.id === selection?.factorId);
  return (
    <fieldset className="editor-card" data-testid="surface-block-options">
      <legend>{t("blocking.title")}</legend>
      <p className="muted">{t("blocking.help")}</p>
      <div className="form-grid">
        <label className="field">
          <span>{t("blocking.factor")}</span>
          <select
            value={selection?.factorId ?? ""}
            onChange={(event) =>
              dispatch({
                type: "setAnalysis",
                patch: {
                  surfaceBlock: event.target.value
                    ? {
                        factorId: event.target.value,
                        reference: levels(event.target.value)[0] ?? "",
                      }
                    : null,
                },
              })
            }
          >
            <option value="">{t("blocking.none")}</option>
            {selection && !known && (
              <option value={selection.factorId}>{t("blocking.missing")}</option>
            )}
            {columns.map((factor) => (
              <option key={factor.id} value={factor.id}>
                {factor.name || factor.id}
              </option>
            ))}
          </select>
        </label>
        {selection && (
          <label className="field">
            <span>{t("blocking.reference")}</span>
            <select
              value={selection.reference}
              onChange={(event) =>
                dispatch({
                  type: "setAnalysis",
                  patch: { surfaceBlock: { ...selection, reference: event.target.value } },
                })
              }
            >
              {!levels(selection.factorId).includes(selection.reference) && (
                <option value={selection.reference}>
                  {selection.reference || t("blocking.missing")}
                </option>
              )}
              {levels(selection.factorId).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {selection && <p className="muted small">{t("blocking.referenceHelp")}</p>}
    </fieldset>
  );
}
