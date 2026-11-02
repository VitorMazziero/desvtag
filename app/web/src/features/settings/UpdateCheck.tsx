// Verificação de atualizações do aplicativo Windows (canal experimental). O Tauri baixa o pacote do
// endereço configurado e só o instala se a assinatura conferir com a chave pública do aplicativo;
// os projetos são arquivos do usuário e não são tocados. No navegador o controle não aparece.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isTauri } from "../../services/engine";
import { ReleaseNotes } from "./ReleaseNotes";

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "available"; version: string; notes: string }
  | { kind: "installing" }
  | { kind: "failed" };

export function UpdateCheck() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: "idle" });
  if (!isTauri()) return null;

  const check = async () => {
    setState({ kind: "checking" });
    try {
      const { check: checkForUpdate } = await import("@tauri-apps/plugin-updater");
      const update = await checkForUpdate();
      setState(
        update
          ? { kind: "available", version: update.version, notes: update.body ?? "" }
          : { kind: "current" },
      );
    } catch {
      setState({ kind: "failed" });
    }
  };

  const install = async () => {
    setState({ kind: "installing" });
    try {
      const { check: checkForUpdate } = await import("@tauri-apps/plugin-updater");
      const update = await checkForUpdate();
      if (!update) {
        setState({ kind: "current" });
        return;
      }
      // No Windows o instalador fecha o aplicativo ao terminar.
      await update.downloadAndInstall();
    } catch {
      setState({ kind: "failed" });
    }
  };

  return (
    <div className="update-check" data-testid="update-check">
      <button
        type="button"
        className="button secondary small"
        disabled={state.kind === "checking" || state.kind === "installing"}
        onClick={check}
      >
        {t("update.check")}
      </button>
      <span role="status" className="muted small">
        {state.kind === "checking" && t("update.checking")}
        {state.kind === "current" && t("update.current")}
        {state.kind === "installing" && t("update.installing")}
        {state.kind === "failed" && t("update.failed")}
        {state.kind === "available" && t("update.available", { version: state.version })}
      </span>
      {state.kind === "available" && (
        <>
          {state.notes !== "" && <ReleaseNotes markdown={state.notes} label={t("update.notes")} />}
          <button type="button" className="button small" onClick={install}>
            {t("update.install")}
          </button>
          <p className="muted small">{t("update.safe")}</p>
        </>
      )}
    </div>
  );
}
