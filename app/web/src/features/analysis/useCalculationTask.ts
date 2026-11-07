import { useEffect, useRef, useState } from "react";
import { useEngine } from "../../services/engine/EngineContext";
import { useProject, useWorkspace } from "../../state/ProjectContext";

/** A tool's lifetime includes its destination, not just its mounted React component. */
export function useCalculationTask(channel: string) {
  const { client } = useEngine();
  const project = useProject();
  const workspace = useWorkspace();
  const generation = useRef(0);
  const [busy, setBusy] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Destination identity changes must invalidate an in-flight task.
  useEffect(() => {
    setBusy(false);
    return () => {
      generation.current++;
      client.cancel(channel);
    };
  }, [client, channel, project.id, workspace.projectId, workspace.epoch]);
  return {
    busy,
    begin() {
      setBusy(true);
      return ++generation.current;
    },
    isCurrent(task: number) {
      return task === generation.current;
    },
    finish(task: number) {
      if (task === generation.current) setBusy(false);
    },
    cancel() {
      generation.current++;
      client.cancel(channel);
      setBusy(false);
    },
  };
}
