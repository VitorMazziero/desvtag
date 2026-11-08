import { useEffect, useRef, useState } from "react";
import { nowIso } from "../../lib/ids";
import { hasUnsavedChanges, type Workspace } from "../../state/workspace";
import { clearRecovery, RECOVERY_VERSION, writeRecovery } from "./recovery";

/** Pausa na edição antes de gravar a recuperação (decisão aprovada §8: dois segundos). */
export const AUTOSAVE_DELAY_MS = 2000;

export type RecoveryStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "saved"; at: string }
  | { state: "error" };

/**
 * Grava a recuperação após `delayMs` sem alterações e a remove quando o projeto é salvo em
 * arquivo. Não grava uma cópia a cada tecla: cada nova alteração reinicia a contagem.
 */
export function useAutosave(workspace: Workspace, delayMs = AUTOSAVE_DELAY_MS): RecoveryStatus {
  const [status, setStatus] = useState<RecoveryStatus>({ state: "idle" });
  const latest = useRef(workspace);
  latest.current = workspace;
  const dirty = hasUnsavedChanges(workspace);
  const wasDirty = useRef(false);
  const { changeSeq } = workspace;

  // biome-ignore lint/correctness/useExhaustiveDependencies: changeSeq dispara a regravação; o espaço de trabalho vem de `latest`.
  useEffect(() => {
    if (!dirty) {
      setStatus({ state: "idle" });
      // Initial clean state must not erase the previous session before RecoveryBanner reads it.
      if (wasDirty.current) void clearRecovery();
      wasDirty.current = false;
      return;
    }
    wasDirty.current = true;
    setStatus({ state: "pending" });
    const timer = setTimeout(() => {
      const at = nowIso();
      void writeRecovery({
        version: RECOVERY_VERSION,
        savedAt: at,
        workspace: latest.current,
      }).then((ok) => setStatus(ok ? { state: "saved", at } : { state: "error" }));
    }, delayMs);
    return () => clearTimeout(timer);
  }, [changeSeq, dirty, delayMs]);

  return status;
}
