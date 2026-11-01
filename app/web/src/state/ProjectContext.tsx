import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from "react";
import { initialProject, type ProjectAction, type ProjectState, projectReducer } from "./project";

const StateContext = createContext<ProjectState>(initialProject);
const DispatchContext = createContext<Dispatch<ProjectAction>>(() => {});

export function ProjectProvider({
  children,
  initial = initialProject,
}: {
  children: ReactNode;
  initial?: ProjectState;
}) {
  const [state, dispatch] = useReducer(projectReducer, initial);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export const useProject = () => useContext(StateContext);
export const useProjectDispatch = () => useContext(DispatchContext);
