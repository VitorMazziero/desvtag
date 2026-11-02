// Verificação de atualizações do aplicativo Windows (canal experimental). O Tauri baixa o pacote do
// endereço configurado e só o instala se a assinatura conferir com a chave pública do aplicativo;
// os projetos são arquivos do usuário e não são tocados. No navegador o controle não aparece.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../../lib/version";
import { isTauri } from "../../services/engine";
import { loadChannel, saveChannel, type UpdateChannel } from "../../services/update/channel";
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
  const [channel, setChannel] = useState<UpdateChannel>(() => loadChannel(APP_VERSION));
  if (!isTauri()) return null;

  const choose = (next: UpdateChannel) => {
    setChannel(next);
    saveChannel(next);
    setState({ kind: "idle" });
  };

  const check = async () => {
    setState({ kind: "checking" });
    try {
      // O endereço do manifesto vem do canal e é montado no Rust (a interface só escolhe o canal).
      const { invoke } = await import("@tauri-apps/api/core");
      const update = await invoke<{ version: string; notes: string } | null>("update_check", {
        channel,
      });
      setState(
        update
          ? { kind: "available", version: update.version, notes: update.notes }
          : { kind: "current" },
      );
    } catch {
      setState({ kind: "failed" });
    }
  };

  const install = async () => {
    setState({ kind: "installing" });
    try {
      // No Windows o instalador fecha o aplicativo ao terminar.
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("update_install", { channel });
    } catch {
      setState({ kind: "failed" });
    }
  };

  return (
    <div className="update-check" data-testid="update-check">
      <label className="field">
        <span>{t("update.channel")}</span>
        <select value={channel} onChange={(e) => choose(e.target.value as UpdateChannel)}>
          <option value="experimental">{t("update.channelExperimental")}</option>
          <option value="stable">{t("update.channelStable")}</option>
        </select>
      </label>
      <p className="muted small">{t(`update.channelHelp.${channel}`)}</p>
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
