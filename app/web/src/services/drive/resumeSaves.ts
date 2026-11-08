import type { DriveClient } from "./client";
import { DRIVE_SAVE_LOCK, type PendingSave, readDriveQueue, removeDriveSave } from "./saveQueue";
import { saveToDrive } from "./sync";
import type { SaveOutcome } from "./types";

/** Serialize retries across tabs sharing the same IndexedDB queue. */
export async function resumeDriveSaves(
  drive: DriveClient,
  onSaved: (item: PendingSave, outcome: SaveOutcome) => void,
): Promise<void> {
  await navigator.locks.request(DRIVE_SAVE_LOCK, async () => {
    const pending = await readDriveQueue();
    if (pending.length === 0) return;
    const { accountId, client } = await drive.accountSession();
    for (const item of pending) {
      if (item.accountId !== accountId) continue;
      const outcome = await saveToDrive(
        client,
        item.bytes,
        item.name,
        item.base,
        undefined,
        item.createId,
        true,
      );
      await removeDriveSave(item.id);
      onSaved(item, outcome);
    }
  });
}
