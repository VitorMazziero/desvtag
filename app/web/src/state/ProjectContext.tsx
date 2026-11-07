import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from "react";
import { nowIso } from "../lib/ids";
import type { ProjectState } from "./project";
import {
  createWorkspace,
  currentExperiment,
  initialWorkspace,
  type Workspace,
  type WorkspaceAction,
  workspaceReducer,
} from "./workspace";

const WorkspaceContext = createContext<Workspace>(initialWorkspace);
const DispatchContext = createContext<Dispatch<WorkspaceAction>>(() => {});

export function ProjectProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Workspace;
}) {
  const [workspace, dispatch] = useReducer(
    workspaceReducer,
    initial,
    (provided) =>
      provided ??
      createWorkspace(
        initialWorkspace.projectId,
        initialWorkspace.name,
        currentExperiment(initialWorkspace).name,
        nowIso(),
      ),
  );
  return (
    <WorkspaceContext.Provider value={workspace}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </WorkspaceContext.Provider>
  );
}

/** O projeto aberto. */
export const useWorkspace = (): Workspace => useContext(WorkspaceContext);

/** O experimento atual (as telas existentes editam este estado). */
export function useProject(): ProjectState {
  return currentExperiment(useContext(WorkspaceContext));
}

export const useProjectDispatch = () => useContext(DispatchContext);
