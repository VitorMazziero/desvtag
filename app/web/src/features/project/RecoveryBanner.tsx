import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  clearRecovery,
  type RecoverySnapshot,
  readRecovery,
} from "../../services/storage/recovery";
import { useProjectDispatch } from "../../state/ProjectContext";

/** Na abertura, oferece restaurar a sessão que ficou com alterações não salvas. */
export function RecoveryBanner() {
  const { t, i18n } = useTranslation();
  const dispatch = useProjectDispatch();
  const [snapshot, setSnapshot] = useState<RecoverySnapshot | null>(null);

  useEffect(() => {
    let active = true;
    void readRecovery().then((s) => {
      if (active) setSnapshot(s);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!snapshot) return null;
  const time = new Date(snapshot.savedAt).toLocaleTimeString(i18n.language, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <section
      className="panel recovery-banner"
      role="alert"
      aria-labelledby="recovery-title"
      data-testid="recovery-banner"
    >
      <h2 id="recovery-title">{t("recovery.title")}</h2>
      <p>{t("recovery.text", { time })}</p>
      <div className="row">
        <button
          type="button"
          className="button"
          onClick={() => {
            dispatch({ type: "restoreWorkspace", workspace: snapshot.workspace });
            setSnapshot(null);
          }}
        >
          {t("recovery.restore")}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            void clearRecovery();
            setSnapshot(null);
          }}
        >
          {t("recovery.discard")}
        </button>
      </div>
    </section>
  );
}
