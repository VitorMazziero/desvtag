import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";

export function HistoryView() {
  const { t, i18n } = useTranslation();
  const experiment = useProject();
  const dispatch = useProjectDispatch();
  const fmt = (iso: string) => new Date(iso).toLocaleString(i18n.language);
  const head = experiment.revisions[experiment.revisions.length - 1];
  return (
    <details className="panel history" data-testid="history">
      <summary>{t("history.title")}</summary>
      <p className="muted small">{t("history.intro")}</p>
      <ol className="history-list reverse">
        {[...experiment.revisions].reverse().map((revision) => (
          <li key={revision.id} data-testid="revision">
            <span>
              <strong>{t("history.revision", { id: revision.id })}</strong>
              {revision.id === head?.id && <span className="badge"> {t("history.current")}</span>}
              {" — "}
              {t(`history.reason.${revision.reason}`)} — {fmt(revision.createdAt)} —{" "}
              {t("history.rows", { count: revision.data.rows.length })}
            </span>
            {revision.id !== head?.id && (
              <button
                type="button"
                className="button secondary small"
                onClick={() =>
                  dispatch({ type: "restoreRevision", revisionId: revision.id, now: nowIso() })
                }
              >
                {t("history.restore")}
              </button>
            )}
          </li>
        ))}
      </ol>
      <p className="muted small">{t("history.restoreNote")}</p>
      {experiment.analyses.length > 0 && (
        <>
          <h3>{t("history.analyses")}</h3>
          <ul>
            {experiment.analyses.map((a) => (
              <li key={a.id} data-testid="analysis-record">
                {t("history.analysisItem", {
                  id: a.id,
                  revision: a.revisionId,
                  time: fmt(a.createdAt),
                })}
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
