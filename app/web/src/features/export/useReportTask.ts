import { useEffect, useId, useSyncExternalStore } from "react";

let current: { owner: string; controller: AbortController } | null = null;
const listeners = new Set<() => void>();
const publish = () => {
  for (const listener of listeners) listener();
};
const snapshot = () => current?.owner ?? null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function cancel(owner: string, reason: string) {
  if (current?.owner !== owner) return;
  const task = current;
  current = null;
  task.controller.abort(reason);
  publish();
}

/** One report per window; edits/destination changes cancel before a file can be saved. */
export function useReportTask(identity: string) {
  const owner = useId();
  const activeOwner = useSyncExternalStore(subscribe, snapshot, snapshot);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Identity changes invalidate the captured report inputs.
  useEffect(() => () => cancel(owner, "sourceChanged"), [owner, identity]);
  return {
    busy: activeOwner !== null,
    ownsTask: activeOwner === owner,
    begin() {
      if (current) return null;
      const controller = new AbortController();
      current = { owner, controller };
      publish();
      return controller.signal;
    },
    finish(signal: AbortSignal) {
      if (current?.owner === owner && current.controller.signal === signal) {
        current = null;
        publish();
      }
    },
    cancel() {
      cancel(owner, "userCancelled");
    },
  };
}
