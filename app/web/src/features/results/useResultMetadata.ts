// Proveniência dos arquivos exportados a partir de um resultado guardado (método, configuração,
// revisão e versões); compartilhada pelas telas de resultado novas.

import { useMemo } from "react";
import { APP_VERSION } from "../../lib/version";
import type { AnalysisRecord, Revision } from "../../services/engine";
import { type ExportMetadata, exportMetadata, flat } from "../../services/export/metadata";
import { useProject, useWorkspace } from "../../state/ProjectContext";

export function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "resultado"
  );
}

export function useResultMetadata(signature: string): {
  record: AnalysisRecord | undefined;
  revision: Revision | undefined;
  metadata: ExportMetadata | null;
  metadataText: string;
  exportMeta: Record<string, string> | null;
} {
  const state = useProject();
  const workspace = useWorkspace();
  const record: AnalysisRecord | undefined = [...state.analyses]
    .reverse()
    .find((a) => a.signature === signature);
  const revision = state.revisions.find((r) => r.id === record?.revisionId);
  const metadata = useMemo(
    () =>
      record
        ? exportMetadata({
            record,
            revisionHash: revision?.contentHash ?? "",
            project: workspace.name,
            experiment: state.name,
            appVersion: APP_VERSION,
            now: new Date().toISOString(),
          })
        : null,
    [record, revision, workspace.name, state.name],
  );
  return {
    record,
    revision,
    metadata,
    metadataText: metadata ? JSON.stringify(metadata) : "",
    exportMeta: metadata ? flat(metadata) : null,
  };
}
