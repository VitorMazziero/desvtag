// Google Drive opcional na barra do projeto (U14): conectar, abrir, salvar e desconectar. Tudo é
// disparado pelo usuário; nenhum script do Google é carregado antes de «Conectar». Salvar nunca
// sobrescreve um arquivo alterado por outra pessoa (vira cópia), e erros não afetam o trabalho
// local nem o salvamento em arquivo.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DriveClient } from "../../services/drive/client";
import { openFromDrive, saveToDrive } from "../../services/drive/sync";
import { DriveError, type DriveLink } from "../../services/drive/types";
import { WebDriveAuth } from "../../services/drive/webAuth";
import { useWorkspace } from "../../state/ProjectContext";
import type { useProjectActions } from "../project/useProjectActions";

type Actions = ReturnType<typeof useProjectActions>;

const LINK_KEY = (projectId: string) => `optima.drive.link.${projectId}`;

function readLink(projectId: string): DriveLink | null {
  try {
    const raw = localStorage.getItem(LINK_KEY(projectId));
    return raw ? (JSON.parse(raw) as DriveLink) : null;
  } catch {
    return null;
  }
}

function writeLink(projectId: string, link: DriveLink | null): void {
  try {
    if (link) localStorage.setItem(LINK_KEY(projectId), JSON.stringify(link));
    else localStorage.removeItem(LINK_KEY(projectId));
  } catch {
    // armazenamento indisponível: a ligação vale só nesta sessão
  }
}

export function DrivePanel({ actions }: { actions: Actions }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const auth = useMemo(() => new WebDriveAuth(), []);
  const client = useMemo(() => new DriveClient(auth), [auth]);
  const [connected, setConnected] = useState(false);
  const [link, setLink] = useState<DriveLink | null>(() => readLink(workspace.projectId));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const fail = (error: unknown) => {
    const code = error instanceof DriveError ? error.code : "unknown";
    if (code === "auth") setConnected(false);
    setMessage({ kind: "error", text: t(`drive.errors.${code}`) });
  };

  const run = async (task: () => Promise<void>) => {
    setWorking(true);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      fail(error);
    } finally {
      setWorking(false);
    }
  };

  const connect = () =>
    run(async () => {
      await auth.connect();
      setConnected(true);
    });

  const disconnect = () =>
    run(async () => {
      await auth.disconnect();
      setConnected(false);
    });

  const openDrive = () =>
    run(async () => {
      if (!connected) {
        setMessage({ kind: "error", text: t("drive.connectFirst") });
        return;
      }
      if (!actions.confirmDiscard()) return;
      const picked = await auth.pick();
      if (!picked) return;
      const opened = await openFromDrive(client, picked.id);
      await actions.loadOpened({ name: opened.link.name, bytes: opened.bytes });
      writeLink(workspace.projectId, opened.link);
      setLink(opened.link);
      setMessage({ kind: "ok", text: t("drive.opened", { name: opened.link.name }) });
    });

  const saveDrive = () =>
    run(async () => {
      if (!connected) {
        setMessage({ kind: "error", text: t("drive.connectFirst") });
        return;
      }
      let outcome: Awaited<ReturnType<typeof saveToDrive>> | null = null;
      let driveError: unknown = null;
      const saved = await actions.saveWith(async (bytes, name) => {
        try {
          outcome = await saveToDrive(client, bytes, name, link);
        } catch (error) {
          // O erro do Drive aparece no painel do Drive; o projeto não é marcado como salvo.
          driveError = error;
          return null;
        }
        return { name: outcome.kind === "saved" ? outcome.link.name : outcome.copy.name };
      });
      if (driveError) {
        fail(driveError);
        return;
      }
      const result = outcome as Awaited<ReturnType<typeof saveToDrive>> | null;
      if (!saved || !result) return;
      if (result.kind === "saved") {
        writeLink(workspace.projectId, result.link);
        setLink(result.link);
        setMessage({
          kind: "ok",
          text: t(result.created ? "drive.created" : "drive.saved", { name: result.link.name }),
        });
      } else {
        setMessage({ kind: "error", text: t("drive.conflict", { copy: result.copy.name }) });
      }
    });

  return (
    <section className="drive-section" data-testid="drive-panel" aria-label={t("drive.title")}>
      <p className="menu-heading">{t("drive.title")}</p>
      <p className="muted small" role="status">
        {connected ? t("drive.connected") : t("drive.notConnected")}{" "}
        {link ? t("drive.linked", { name: link.name }) : t("drive.unlinked")}
      </p>
      <ul className="menu-list">
        {!connected ? (
          <li>
            <button type="button" className="button secondary" disabled={working} onClick={connect}>
              {t("drive.connect")}
            </button>
          </li>
        ) : (
          <>
            <li>
              <button
                type="button"
                className="button secondary"
                disabled={working}
                onClick={openDrive}
              >
                {t("drive.open")}
              </button>
            </li>
            <li>
              <button type="button" className="button" disabled={working} onClick={saveDrive}>
                {t("drive.save")}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="button secondary"
                disabled={working}
                onClick={disconnect}
              >
                {t("drive.disconnect")}
              </button>
            </li>
          </>
        )}
      </ul>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={message.kind === "error" ? "error" : "muted"}
          data-testid="drive-message"
        >
          {message.text}
        </p>
      )}
      <details className="advanced">
        <summary>{t("drive.learnMore")}</summary>
        <p className="muted small">{t("drive.intro")}</p>
        <p className="muted small">{t("drive.localStillWorks")}</p>
      </details>
    </section>
  );
}
