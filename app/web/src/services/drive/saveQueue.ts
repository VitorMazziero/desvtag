import type { DriveLink } from "./types";

const DATABASE = "enzitag-optima-drive";
const STORE = "pending-saves";
export const DRIVE_SAVE_LOCK = "enzitag-optima-drive-saves";
export const MAX_PENDING_SAVES = 8;
export const MAX_PENDING_BYTES = 128 * 1024 * 1024;

export interface PendingSaveInput {
  projectId: string;
  accountId: string;
  name: string;
  bytes: Uint8Array;
  base: DriveLink | null;
  createId?: string;
  copy?: boolean;
}

export interface PendingSave extends PendingSaveInput {
  id: number;
}

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openQueue();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      let value: T;
      transaction.oncomplete = () => resolve(value);
      transaction.onabort = () => reject(transaction.error ?? new Error("Drive queue aborted"));
      run(transaction.objectStore(STORE), (next) => {
        value = next;
      });
    });
  } finally {
    db.close();
  }
}

/** null means the queue is full. Storage errors reject so the UI can distinguish them. */
export async function enqueueDriveSave(input: PendingSaveInput): Promise<number | null> {
  if (input.bytes.byteLength > MAX_PENDING_BYTES) return null;
  const snapshot = { ...input, bytes: input.bytes.slice(), base: input.base && { ...input.base } };
  return transact("readwrite", (store, result) => {
    const read = store.getAll();
    read.onsuccess = () => {
      const pending = read.result as PendingSave[];
      const bytes = pending.reduce((sum, item) => sum + item.bytes.byteLength, 0);
      if (
        pending.length >= MAX_PENDING_SAVES ||
        bytes + snapshot.bytes.byteLength > MAX_PENDING_BYTES
      ) {
        result(null);
        return;
      }
      const write = store.add(snapshot);
      write.onsuccess = () => result(write.result as number);
    };
  });
}

export function readDriveQueue(): Promise<PendingSave[]> {
  return transact("readonly", (store, result) => {
    const read = store.getAll();
    read.onsuccess = () => result(read.result as PendingSave[]);
  });
}

/** Remove an item only after its upload has been confirmed or the user discards it. */
export function removeDriveSave(id: number): Promise<void> {
  return transact("readwrite", (store, result) => {
    const remove = store.delete(id);
    remove.onsuccess = () => result(undefined);
  });
}
