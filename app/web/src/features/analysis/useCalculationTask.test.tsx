import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useCalculationTask } from "./useCalculationTask";

const state = vi.hoisted(() => ({
  project: { id: "e1", name: "Example" },
  workspace: { projectId: "p1", epoch: 0 },
  client: { cancel: vi.fn() },
}));
vi.mock("../../services/engine/EngineContext", () => ({
  useEngine: () => ({ client: state.client }),
}));
vi.mock("../../state/ProjectContext", () => ({
  useProject: () => state.project,
  useWorkspace: () => state.workspace,
}));
beforeEach(() => {
  state.project = { id: "e1", name: "Example" };
  state.workspace = { projectId: "p1", epoch: 0 };
  state.client.cancel.mockClear();
});
it("cancels on destination change, rejects the old generation, and resets busy for the new destination", () => {
  const hook = renderHook(() => useCalculationTask("power"));
  for (const change of [
    () => {
      state.project = { ...state.project, id: "e2" };
    },
    () => {
      state.workspace = { ...state.workspace, projectId: "p2" };
    },
    () => {
      state.workspace = { ...state.workspace, epoch: 1 };
    },
  ]) {
    let task = 0;
    act(() => {
      task = hook.result.current.begin();
    });
    expect(hook.result.current.busy).toBe(true);
    change();
    hook.rerender();
    expect(hook.result.current.isCurrent(task)).toBe(false);
    expect(hook.result.current.busy).toBe(false);
    act(() => hook.result.current.finish(task));
    expect(hook.result.current.busy).toBe(false);
  }
  expect(state.client.cancel).toHaveBeenCalledTimes(3);
});
it("preserves an in-flight request through edits and cancels on unmount", () => {
  const hook = renderHook(() => useCalculationTask("nonlinear"));
  let task = 0;
  act(() => {
    task = hook.result.current.begin();
  });
  state.project = { ...state.project, name: "Edited during calculation" };
  hook.rerender();
  expect(hook.result.current.isCurrent(task)).toBe(true);
  expect(state.client.cancel).not.toHaveBeenCalled();
  hook.unmount();
  expect(state.client.cancel).toHaveBeenCalledWith("nonlinear");
});
