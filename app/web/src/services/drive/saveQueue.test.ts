import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { enqueueDriveSave, MAX_PENDING_SAVES, readDriveQueue, removeDriveSave } from "./saveQueue";

beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());

const project = () => ({
  projectId: "project",
  accountId: "account",
  name: "project.enzitag",
  bytes: Uint8Array.of(1, 2, 3),
  base: { fileId: "remote", name: "project.enzitag", version: "5" },
});

it("reopens the original bytes and remote revision in a new database connection", async () => {
  const input = project();
  const saving = enqueueDriveSave(input);
  input.bytes[0] = 9;
  input.base.version = "6";
  const id = await saving;
  const items = await readDriveQueue();
  expect(items.map((item) => ({ ...item, bytes: Array.from(item.bytes) }))).toEqual([
    { ...project(), bytes: [1, 2, 3], id },
  ]);
  if (id === null) throw new Error("The queue unexpectedly rejected the save");
  await removeDriveSave(id);
  expect(await readDriveQueue()).toEqual([]);
});

it("enforces capacity across concurrent writers without dropping existing saves", async () => {
  const ids = await Promise.all(
    Array.from({ length: MAX_PENDING_SAVES + 2 }, () => enqueueDriveSave(project())),
  );
  const accepted = ids.filter((id) => id !== null);
  expect(accepted).toHaveLength(MAX_PENDING_SAVES);
  expect(new Set(accepted).size).toBe(MAX_PENDING_SAVES);
  expect((await readDriveQueue()).map(({ id }) => id)).toEqual([...accepted].sort((a, b) => a - b));
});
