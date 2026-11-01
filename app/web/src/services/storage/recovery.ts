// Recuperação local da sessão (U13): guarda o espaço de trabalho no armazenamento do navegador
// (IndexedDB; no Windows, o do WebView). NÃO é um backup externo: se o armazenamento do
// navegador for apagado, a recuperação some. Só existe enquanto há alterações não salvas em arquivo.
import type { Workspace } from "../../state/workspace";

const DB_NAME = "enzitag-optima";
const STORE = "recovery";
const KEY = "workspace";
export const RECOVERY_VERSION = 1;

export interface RecoverySnapshot {
  version: number;
  /** Instante da gravação (RFC 3339). */
  savedAt: string;
  workspace: Workspace;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Grava a recuperação. Devolve `false` se o armazenamento estiver indisponível ou cheio. */
export async function writeRecovery(snapshot: RecoverySnapshot): Promise<boolean> {
  try {
    await run("readwrite", (store) => store.put(snapshot, KEY));
    return true;
  } catch {
    return false;
  }
}

/** Lê a recuperação; `null` se não houver, se for de outra versão ou estiver ilegível. */
export async function readRecovery(): Promise<RecoverySnapshot | null> {
  try {
    const value = (await run("readonly", (store) => store.get(KEY))) as
      | RecoverySnapshot
      | undefined;
    if (
      !value ||
      value.version !== RECOVERY_VERSION ||
      typeof value.savedAt !== "string" ||
      !value.workspace
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export async function clearRecovery(): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(KEY));
  } catch {
    // Sem armazenamento: nada a limpar.
  }
}
