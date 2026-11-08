import type { TFunction } from "i18next";
import { hasUnsavedChanges, type Workspace } from "../../state/workspace";
export function saveLabel(
  t: TFunction,
  workspace: Workspace,
  downloads: boolean,
  language: string,
): string {
  const unsaved = hasUnsavedChanges(workspace);
  if (!downloads) return t(unsaved ? "status.unsaved" : "status.clean");
  if (!workspace.lastSavedAt) return t(unsaved ? "status.newEdits" : "status.notDownloaded");
  const time = new Date(workspace.lastSavedAt).toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${t(workspace.lastSavedDestination === "drive" ? "status.driveAt" : "status.downloadAt", { time })}${unsaved ? ` — ${t("status.newEdits")}` : ""}`;
}
