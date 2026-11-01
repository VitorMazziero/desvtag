// Três estados DISTINTOS: alterações em relação ao arquivo, recuperação local e arquivo salvo.
// A recuperação local nunca é apresentada como cópia de segurança externa.
import { useTranslation } from "react-i18next";
import type { RecoveryStatus } from "../../services/storage/autosave";
import { hasUnsavedChanges, type Workspace } from "../../state/workspace";

function clock(iso: string, language: string): string {
  return new Date(iso).toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface Props {
  workspace: Workspace;
  recovery: RecoveryStatus;
  /** `true` quando "salvar" baixa um arquivo (navegador). */
  downloads: boolean;
}

export function SaveStatus({ workspace, recovery, downloads }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const unsaved = hasUnsavedChanges(workspace);
  const recoveryText =
    recovery.state === "saved"
      ? t("status.recoverySaved", { time: clock(recovery.at, lang) })
      : recovery.state === "pending"
        ? t("status.recoveryPending")
        : recovery.state === "error"
          ? t("status.recoveryError")
          : t("status.recoveryIdle");
  const fileText =
    workspace.fileName && workspace.lastSavedAt
      ? t(downloads ? "status.fileDownloaded" : "status.fileSaved", {
          name: workspace.fileName,
          time: clock(workspace.lastSavedAt, lang),
        })
      : workspace.fileName
        ? workspace.fileName
        : t("status.fileNone");
  return (
    <section
      className="save-status"
      aria-label={t("status.title")}
      aria-live="polite"
      data-testid="save-status"
    >
      <p data-testid="status-changes" data-unsaved={unsaved}>
        <strong>{unsaved ? t("status.unsaved") : t("status.clean")}</strong>
      </p>
      <p data-testid="status-recovery" data-state={recovery.state}>
        {t("status.recovery")}: {recoveryText}
        {recovery.state === "saved" && (
          <span className="muted small"> — {t("status.recoveryNote")}</span>
        )}
      </p>
      <p data-testid="status-file">
        {t("status.file")}: {fileText}
      </p>
    </section>
  );
}
