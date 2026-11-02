import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { newProjectId, nowIso } from "../../lib/ids";
import { APP_VERSION } from "../../lib/version";
import { useEngine } from "../../services/engine/EngineContext";
import type { OpenedFile } from "../../services/storage";
import { useStorage } from "../../services/storage/context";
import { clearRecovery } from "../../services/storage/recovery";
import { useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { commitWorkspace, hasUnsavedChanges, toDocument } from "../../state/workspace";
import { decodeBytes, encodeDocument } from "./projectFile";

/** Slug de arquivo: sem caracteres inválidos em nomes do Windows. */
export function suggestedFileName(projectName: string): string {
  const invalid = '<>:"/\\|?*';
  const cleaned = Array.from(projectName.trim())
    .map((ch) => (ch.charCodeAt(0) < 32 || invalid.includes(ch) ? "_" : ch))
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return `${cleaned || "projeto"}.enzitag`;
}

export interface ActionNotice {
  kind: "error" | "info";
  messages: string[];
}

/** Operações de projeto: novo, abrir, salvar. Falhas nunca alteram o projeto aberto. */
export function useProjectActions() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const storage = useStorage();
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDiscard = useCallback(
    () => !hasUnsavedChanges(workspace) || window.confirm(t("project.confirmDiscard")),
    [workspace, t],
  );

  const newProject = useCallback(async () => {
    if (!confirmDiscard()) return;
    await storage.detach().catch(() => {});
    dispatch({
      type: "newProject",
      projectId: newProjectId(),
      name: "",
      experimentName: t("project.newExperimentName", { n: 1 }),
      now: nowIso(),
    });
    await clearRecovery();
    setNotice(null);
  }, [confirmDiscard, dispatch, storage, t]);

  const loadOpened = useCallback(
    async (file: OpenedFile) => {
      const result = await decodeBytes(client, file.bytes, t);
      if (!result.ok) {
        setNotice({ kind: "error", messages: result.messages });
        return;
      }
      const { decoded, warnings } = result.value;
      dispatch({
        type: "loadDocument",
        document: decoded.document,
        fileName: file.name,
        now: nowIso(),
      });
      await clearRecovery();
      const messages = [
        ...(decoded.migratedFrom !== null
          ? [t("project.migrated", { from: decoded.migratedFrom })]
          : []),
        ...warnings,
      ];
      setNotice(
        messages.length > 0
          ? { kind: "info", messages: [t("project.warningsTitle"), ...messages] }
          : null,
      );
    },
    [client, dispatch, t],
  );

  const open = useCallback(async () => {
    if (!confirmDiscard()) return;
    setBusy(true);
    try {
      const file = await storage.open();
      if (file) await loadOpened(file);
    } catch {
      setNotice({ kind: "error", messages: [t("project.failed")] });
    } finally {
      setBusy(false);
    }
  }, [confirmDiscard, loadOpened, storage, t]);

  const openRecent = useCallback(
    async (index: number) => {
      if (!confirmDiscard()) return;
      setBusy(true);
      try {
        await loadOpened(await storage.openRecent(index));
      } catch {
        setNotice({ kind: "error", messages: [t("project.failed")] });
      } finally {
        setBusy(false);
      }
    },
    [confirmDiscard, loadOpened, storage, t],
  );

  /**
   * Registra as versões, codifica pelo motor e grava com `write` (arquivo local, cópia ou Drive).
   * Em falha, o projeto continua editável. `write` devolve `null` quando o usuário cancela;
   * `markAsSaved = false` grava uma cópia sem ligar o projeto ao destino.
   */
  const saveWith = useCallback(
    async (
      write: (bytes: Uint8Array, name: string) => Promise<{ name: string } | null>,
      options: { markAsSaved?: boolean } = {},
    ) => {
      setBusy(true);
      setNotice(null);
      try {
        const now = nowIso();
        const seq = workspace.changeSeq;
        const committed = commitWorkspace(workspace, "manualSave", now);
        const encoded = await encodeDocument(client, toDocument(committed, now, APP_VERSION), t);
        if (!encoded.ok) {
          setNotice({ kind: "error", messages: encoded.messages });
          return false;
        }
        const saved = await write(encoded.value, suggestedFileName(workspace.name));
        if (!saved) return false; // cancelado pelo usuário
        dispatch({ type: "commitAll", reason: "manualSave", now });
        if (options.markAsSaved ?? true) {
          dispatch({ type: "markSaved", fileName: saved.name, now, seq });
          await clearRecovery();
        }
        return true;
      } catch (error) {
        setNotice({
          kind: "error",
          messages: [
            error instanceof Error && error.message.startsWith("drive.")
              ? t(`drive.errors.${error.message.slice(6)}`, { defaultValue: t("project.failed") })
              : t("project.failed"),
          ],
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [client, dispatch, t, workspace],
  );

  const save = useCallback(
    async (options: { saveAs?: boolean; copy?: boolean } = {}) => {
      await saveWith(
        (bytes, name) =>
          options.copy
            ? storage.saveCopy(bytes, name)
            : storage.save(bytes, { saveAs: options.saveAs ?? false, suggestedName: name }),
        { markAsSaved: !options.copy },
      );
    },
    [saveWith, storage],
  );

  return {
    notice,
    setNotice,
    busy,
    setBusy,
    newProject,
    open,
    openRecent,
    save,
    saveWith,
    loadOpened,
    confirmDiscard,
  };
}
