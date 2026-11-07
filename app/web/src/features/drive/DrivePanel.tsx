// Google Drive opcional na barra do projeto (U14): conectar, abrir, salvar e desconectar. Tudo é
// disparado pelo usuário; nenhum script do Google é carregado antes de «Conectar». Salvar nunca
// sobrescreve um arquivo alterado por outra pessoa (vira cópia), e erros não afetam o trabalho
// local nem o salvamento em arquivo.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PROJECT_EXTENSION, projectFileStem } from "../../lib/projectFileName";
import { DriveClient } from "../../services/drive/client";
import { NativeDriveAuth } from "../../services/drive/nativeAuth";
import { pickDriveFile } from "../../services/drive/picker";
import { resumeDriveSaves } from "../../services/drive/resumeSaves";
import {
  DRIVE_SAVE_LOCK,
  enqueueDriveSave,
  type PendingSave,
  readDriveQueue,
  removeDriveSave,
} from "../../services/drive/saveQueue";
import { openFromDrive, saveToDrive } from "../../services/drive/sync";
import { DriveError, type DriveLink } from "../../services/drive/types";
import { WebDriveAuth } from "../../services/drive/webAuth";
import { isTauri } from "../../services/engine";
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
  const auth = useMemo(() => (isTauri() ? new NativeDriveAuth() : new WebDriveAuth()), []);
  const native = auth instanceof NativeDriveAuth;
  const client = useMemo(() => new DriveClient(auth), [auth]);
  const [connected, setConnected] = useState(false);
  // No Windows a conexão pode não existir nesta compilação (sem credencial do cliente).
  const [available, setAvailable] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [link, setLink] = useState<DriveLink | null>(() => readLink(workspace.projectId));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [working, setWorking] = useState(false);
  const projectId = workspace.projectId;
  const [shareEmail, setShareEmail] = useState("");
  useEffect(() => {
    setLink(readLink(projectId));
    setShareEmail("");
  }, [projectId]);
  const [pending, setPending] = useState<PendingSave[]>([]);

  useEffect(() => {
    let live = true;
    void readDriveQueue().then(
      (items) => {
        if (live) setPending(items);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);

  // No Windows o cofre guarda a conexão: ao abrir, reconhece-a sem pedir novo consentimento.
  useEffect(() => {
    if (!(auth instanceof NativeDriveAuth)) return;
    let live = true;
    auth
      .status()
      .then((status) => {
        if (!live) return;
        setConnected(status.connected);
        setAvailable(status.available);
      })
      .catch((error) => {
        if (!live) return;
        const code = error instanceof DriveError ? error.code : "unknown";
        setMessage({ kind: "error", text: t(`drive.errors.${code}`) });
      });
    return () => {
      live = false;
    };
  }, [auth, t]);

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

  const resume = async () => {
    let sent = 0;
    const copies: string[] = [];
    try {
      await resumeDriveSaves(client, (item, outcome) => {
        sent++;
        if (outcome.kind === "conflict") {
          copies.push(outcome.copy.name);
        } else if (!item.copy) {
          const current = readLink(item.projectId);
          if (
            (current?.fileId ?? null) === (item.base?.fileId ?? null) &&
            (current?.version ?? null) === (item.base?.version ?? null)
          ) {
            writeLink(item.projectId, outcome.link);
            if (item.projectId === workspace.projectId) setLink(outcome.link);
          }
        }
      });
    } finally {
      setPending(await readDriveQueue());
    }
    setMessage({
      kind: "ok",
      text:
        copies.length > 0
          ? t("drive.queueCopies", { names: copies.join(", ") })
          : t(sent > 0 ? "drive.queueSent" : "drive.queueNoMatch", { count: sent }),
    });
  };

  const connect = () =>
    run(async () => {
      setConnecting(true);
      try {
        await auth.connect();
        setConnected(true);
      } finally {
        setConnecting(false);
      }
      if (native && (await readDriveQueue()).length > 0) await resume();
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
      setConnecting(native);
      let picked: { id: string } | null;
      try {
        picked =
          auth instanceof NativeDriveAuth
            ? await auth.pick()
            : await pickDriveFile(await auth.getToken());
      } finally {
        setConnecting(false);
      }
      if (!picked) return;
      const opened = await openFromDrive(client, picked.id);
      const loaded = await actions.loadOpened(
        { name: opened.link.name, bytes: opened.bytes },
        (id) => writeLink(id, opened.link),
      );
      if (!loaded) return;
      setLink(opened.link);
      setMessage({ kind: "ok", text: t("drive.opened", { name: opened.link.name }) });
    });

  const saveDrive = (copy = false) =>
    run(async () => {
      if (!connected) {
        setMessage({ kind: "error", text: t("drive.connectFirst") });
        return;
      }
      let outcome: Awaited<ReturnType<typeof saveToDrive>> | null = null;
      let driveError: unknown = null;
      const saved = await actions.saveWith(
        (bytes, name) =>
          navigator.locks.request(DRIVE_SAVE_LOCK, async () => {
            try {
              const existing = await readDriveQueue();
              if (existing.some((item) => item.projectId === workspace.projectId)) {
                setPending(existing);
                setMessage({ kind: "ok", text: t("drive.queueAdded") });
                return null;
              }
              const session = await client.accountSession();
              const createId = await session.client.reserveFileId();
              const base = copy ? null : link;
              const filename = copy
                ? `${t("drive.copyName", { name: projectFileStem(name) })}${PROJECT_EXTENSION}`
                : name;
              const id = await enqueueDriveSave({
                accountId: session.accountId,
                projectId: workspace.projectId,
                bytes,
                name: filename,
                base,
                createId,
                copy,
              });
              if (id === null) {
                setMessage({ kind: "error", text: t("drive.queueFull") });
                return null;
              }
              try {
                outcome = await saveToDrive(
                  session.client,
                  bytes,
                  filename,
                  base,
                  undefined,
                  createId,
                );
              } catch (error) {
                if (
                  error instanceof DriveError &&
                  (["network", "rateLimit", "auth"].includes(error.code) || error.status >= 500)
                ) {
                  setPending(await readDriveQueue());
                  setMessage({ kind: "ok", text: t("drive.queueAdded") });
                  if (error.code === "auth") setConnected(false);
                  return null;
                }
                if (
                  error instanceof DriveError &&
                  error.status >= 400 &&
                  error.status < 500 &&
                  error.status !== 409
                ) {
                  await removeDriveSave(id);
                } else {
                  setPending(await readDriveQueue());
                }
                throw error;
              }
              await removeDriveSave(id);
            } catch (error) {
              // O erro do Drive aparece no painel do Drive; o projeto não é marcado como salvo.
              driveError = error;
              return null;
            }
            return { name: outcome.kind === "saved" ? outcome.link.name : outcome.copy.name };
          }),
        { destination: "drive", markAsSaved: !copy },
      );
      if (driveError) {
        fail(driveError);
        return;
      }
      const result = outcome as Awaited<ReturnType<typeof saveToDrive>> | null;
      if (!saved || !result) return;
      if (result.kind === "saved") {
        if (!copy) {
          writeLink(workspace.projectId, result.link);
          setLink(result.link);
        }
        setMessage({
          kind: "ok",
          text: t(copy ? "drive.copySaved" : result.created ? "drive.created" : "drive.saved", {
            name: result.link.name,
          }),
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
      {pending.length > 0 && (
        <p className="muted small" role="status" data-testid="drive-pending">
          {t("drive.queueCount", { count: pending.length })}
        </p>
      )}
      {native && !available && (
        <p className="muted small" role="status" data-testid="drive-unavailable">
          {t("drive.unavailable")}
        </p>
      )}
      {connecting && (
        <p className="muted small" role="status" data-testid="drive-waiting">
          {t("drive.waitingBrowser")}
        </p>
      )}
      <ul className="menu-list">
        {!connected ? (
          <>
            <li>
              <button
                type="button"
                className="button secondary"
                disabled={working || !available}
                onClick={connect}
              >
                {t("drive.connect")}
              </button>
            </li>
            {auth instanceof NativeDriveAuth && connecting && (
              <li>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void auth.cancel()}
                >
                  {t("drive.cancelConnect")}
                </button>
              </li>
            )}
          </>
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
            {auth instanceof NativeDriveAuth && connecting && (
              <li>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void auth.cancel()}
                >
                  {t("drive.cancelConnect")}
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                className="button"
                disabled={working || pending.some((item) => item.projectId === workspace.projectId)}
                onClick={() => void saveDrive()}
              >
                {t("drive.save")}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="button secondary"
                disabled={working || pending.some((item) => item.projectId === projectId)}
                onClick={() => void saveDrive(true)}
              >
                {t("drive.saveCopy")}
              </button>
            </li>
            {pending.length > 0 && (
              <li>
                <button
                  type="button"
                  className="button secondary"
                  disabled={working}
                  onClick={() => void run(resume)}
                >
                  {t("drive.queueResume")}
                </button>
              </li>
            )}
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
      {connected && link && (
        <details className="advanced">
          <summary>{t("drive.shareReadOnly")}</summary>
          <p className="muted small">{t("drive.shareTarget", { name: link.name })}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const email = shareEmail.trim();
              if (!email || working) return;
              void run(async () => {
                await client.shareReadOnly(link.fileId, email);
                setShareEmail("");
                setMessage({ kind: "ok", text: t("drive.shareDone", { email }) });
              });
            }}
          >
            <label className="field">
              <span>{t("drive.shareEmail")}</span>
              <input
                type="email"
                required
                value={shareEmail}
                disabled={working}
                onChange={(event) => setShareEmail(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="button secondary"
              disabled={working || !shareEmail.trim()}
            >
              {t("drive.grantRead")}
            </button>
          </form>
        </details>
      )}
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
