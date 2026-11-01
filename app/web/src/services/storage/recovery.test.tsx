import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspace, type Workspace, workspaceReducer } from "../../state/workspace";
import { useAutosave } from "./autosave";
import { clearRecovery, RECOVERY_VERSION, readRecovery, writeRecovery } from "./recovery";

const T = "2026-11-01T10:00:00.000Z";

function edited(): Workspace {
  return workspaceReducer(createWorkspace("p1", "Projeto", "E1", T), {
    type: "renameProject",
    name: "Alterado",
  });
}

beforeEach(async () => {
  await clearRecovery();
});

describe("recovery storage", () => {
  it("writes, reads and clears the workspace", async () => {
    expect(await readRecovery()).toBeNull();
    const ok = await writeRecovery({ version: RECOVERY_VERSION, savedAt: T, workspace: edited() });
    expect(ok).toBe(true);
    const back = await readRecovery();
    expect(back?.workspace.name).toBe("Alterado");
    await clearRecovery();
    expect(await readRecovery()).toBeNull();
  });

  it("ignores a snapshot written by another format version", async () => {
    await writeRecovery({ version: RECOVERY_VERSION + 1, savedAt: T, workspace: edited() });
    expect(await readRecovery()).toBeNull();
  });
});

describe("useAutosave", () => {
  it("does nothing while there are no unsaved changes", async () => {
    const { result } = renderHook(() => useAutosave(createWorkspace("p", "", "E", T), 20));
    await new Promise((r) => setTimeout(r, 60));
    expect(result.current).toEqual({ state: "idle" });
    expect(await readRecovery()).toBeNull();
  });

  it("waits for a pause, restarts on every change and writes once", async () => {
    let ws = edited();
    const { result, rerender } = renderHook(({ w }) => useAutosave(w, 120), {
      initialProps: { w: ws },
    });
    expect(result.current.state).toBe("pending");
    // Alterações contínuas dentro da janela adiam a gravação.
    for (const name of ["a", "ab", "abc"]) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      ws = workspaceReducer(ws, { type: "renameProject", name });
      rerender({ w: ws });
      expect(await readRecovery()).toBeNull();
    }
    await waitFor(() => expect(result.current.state).toBe("saved"), { timeout: 2000 });
    expect((await readRecovery())?.workspace.name).toBe("abc");
  });

  it("removes the recovery when the project is saved to a file", async () => {
    let ws = edited();
    const { result, rerender } = renderHook(({ w }) => useAutosave(w, 20), {
      initialProps: { w: ws },
    });
    await waitFor(() => expect(result.current.state).toBe("saved"), { timeout: 2000 });
    expect(await readRecovery()).not.toBeNull();
    ws = workspaceReducer(ws, {
      type: "markSaved",
      fileName: "a.enzitag",
      now: T,
      seq: ws.changeSeq,
    });
    rerender({ w: ws });
    await waitFor(async () => expect(await readRecovery()).toBeNull(), { timeout: 2000 });
    expect(result.current).toEqual({ state: "idle" });
  });

  it("reports an error state when storage is unavailable, without throwing", async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simula navegador sem IndexedDB
    globalThis.indexedDB = undefined;
    try {
      const { result } = renderHook(() => useAutosave(edited(), 20));
      await waitFor(() => expect(result.current.state).toBe("error"), { timeout: 2000 });
    } finally {
      globalThis.indexedDB = original;
    }
  });
});

describe("autosave delay default", () => {
  it("is two seconds (approved decision §8)", async () => {
    const { AUTOSAVE_DELAY_MS } = await import("./autosave");
    expect(AUTOSAVE_DELAY_MS).toBe(2000);
    vi.useRealTimers();
  });
});
