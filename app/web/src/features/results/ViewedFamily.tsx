// Transient historical-result selection, shared by figures, comments and off-screen reports.
import { createContext, type ReactNode, useContext, useState } from "react";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { savedFamily } from "./savedFamily";

const ViewedRecord = createContext<{ id: string | null; select: (id: string) => void } | null>(
  null,
);

function RecordScope({ children }: { children: ReactNode }) {
  const [id, select] = useState<string | null>(null);
  return <ViewedRecord.Provider value={{ id, select }}>{children}</ViewedRecord.Provider>;
}

export function FamilyResultScope({ children }: { children: ReactNode }) {
  const parent = useContext(ViewedRecord);
  const state = useProject();
  const workspace = useWorkspace();
  // Report ResultsView inherits the visible selection; a new result starts a fresh scope.
  if (parent) return children;
  const latest = savedFamily(state);
  return (
    <RecordScope
      key={`${workspace.projectId}.${workspace.epoch}.${state.id}.${state.activeFamily}.${latest?.record.id ?? "none"}`}
    >
      {children}
    </RecordScope>
  );
}

export function useViewedFamily() {
  const state = useProject();
  const view = useContext(ViewedRecord);
  return { saved: savedFamily(state, view?.id), select: view?.select };
}
