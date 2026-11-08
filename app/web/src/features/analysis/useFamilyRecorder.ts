import { nowIso } from "../../lib/ids";
import type { FamilyCalculation } from "../../state/familyActions";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { snapshotData } from "../../state/revisionOps";

/** Capture before requesting the engine. Completion remains bound to that project and raw data. */
export function useFamilyRecorder() {
  const project = useProject();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  return (signature: string) => {
    const frame = {
      projectId: workspace.projectId,
      epoch: workspace.epoch,
      experimentId: project.id,
      data: snapshotData(project),
      signature,
      startedAt: nowIso(),
    };
    return (calculation: FamilyCalculation) =>
      dispatch({
        type: "storeFamily",
        ...frame,
        ...calculation,
        now: nowIso(),
      });
  };
}
