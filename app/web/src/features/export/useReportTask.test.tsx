import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useReportTask } from "./useReportTask";

it("keeps one report across formats and invalidates it when the captured source changes", () => {
  const hook = renderHook(
    ({ identity }) => ({ pdf: useReportTask(identity), word: useReportTask(identity) }),
    { initialProps: { identity: "project:experiment:revision1" } },
  );
  const signals: AbortSignal[] = [];
  act(() => {
    const signal = hook.result.current.pdf.begin();
    if (signal) signals.push(signal);
  });
  expect(hook.result.current.word.busy).toBe(true);
  expect(hook.result.current.word.begin()).toBeNull();
  hook.rerender({ identity: "project:experiment:revision2" });
  expect(signals[0]?.aborted).toBe(true);
  expect(signals[0]?.reason).toBe("sourceChanged");
  expect(hook.result.current.word.busy).toBe(false);
  hook.unmount();
});

it("does not let an old completion release a newer report and cancels on unmount", () => {
  const hook = renderHook(() => useReportTask("same-source"));
  const signals: AbortSignal[] = [];
  act(() => {
    const signal = hook.result.current.begin();
    if (signal) signals.push(signal);
  });
  act(() => hook.result.current.cancel());
  act(() => {
    const signal = hook.result.current.begin();
    if (signal) signals.push(signal);
  });
  const old = signals[0];
  if (!old) throw new Error("Missing old signal");
  act(() => hook.result.current.finish(old));
  expect(hook.result.current.busy).toBe(true);
  expect(signals[1]?.aborted).toBe(false);
  hook.unmount();
  expect(signals[1]?.aborted).toBe(true);
});
