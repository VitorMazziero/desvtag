import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";
import { DriveClient } from "./client";
import { FakeAuth, FakeDrive } from "./fakeDrive";
import { resumeDriveSaves } from "./resumeSaves";
import { enqueueDriveSave, readDriveQueue } from "./saveQueue";
import { saveToDrive } from "./sync";

afterEach(() => vi.unstubAllGlobals());

it("keeps pending work across a failed retry and another account, then preserves a remote edit", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("navigator", {
    locks: { request: (_name: string, task: () => Promise<void>) => task() },
  });
  const drive = new FakeDrive();
  const client = new DriveClient(new FakeAuth(), drive.fetch);
  const original = await saveToDrive(client, Uint8Array.of(1), "sample.enzitag", null);
  if (original.kind !== "saved") throw new Error("Expected a new file");
  await enqueueDriveSave({
    accountId: drive.accountId,
    projectId: "project",
    name: original.link.name,
    base: original.link,
    bytes: Uint8Array.of(2),
  });
  const report = vi.fn();
  drive.failures.push("network");
  await expect(resumeDriveSaves(client, report)).rejects.toThrow("drive.network");
  const owner = drive.accountId;
  drive.accountId = "other";
  await resumeDriveSaves(client, report);
  expect(report).not.toHaveBeenCalled();
  expect(await readDriveQueue()).toHaveLength(1);

  drive.accountId = owner;
  drive.externalEdit(original.link.fileId, Uint8Array.of(3));
  await resumeDriveSaves(client, report);
  expect(report).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ kind: "conflict" }),
  );
  expect(Array.from(await client.download(original.link.fileId))).toEqual([3]);
  expect(await readDriveQueue()).toHaveLength(0);
});
