// Proveniência gravada em todo arquivo exportado (U16): método, configuração, revisão e versões.
import type { AnalysisRecord, ProjectDocument } from "../engine";

export interface ExportMetadata {
  app: "EnziTAG Optima";
  appVersion: string;
  engineVersion: string;
  methodId: string;
  methodVersion: string;
  analysisId: string;
  revisionId: string;
  revisionHash: string;
  project: string;
  experiment: string;
  configuration: string;
  exportedAt: string;
}

/** Metadados a partir da análise guardada (ligada à revisão dos dados que a gerou). */
export function exportMetadata(args: {
  record: AnalysisRecord;
  revisionHash: string;
  project: string;
  experiment: string;
  appVersion: string;
  now: string;
}): ExportMetadata {
  const { record } = args;
  return {
    app: "EnziTAG Optima",
    appVersion: args.appVersion,
    engineVersion: record.engineVersion,
    methodId: record.methodId,
    methodVersion: String(record.methodVersion),
    analysisId: record.id,
    revisionId: record.revisionId,
    revisionHash: args.revisionHash,
    project: args.project,
    experiment: args.experiment,
    configuration: JSON.stringify(record.options),
    exportedAt: args.now,
  };
}

export type { ProjectDocument };

export const flat = (m: ExportMetadata): Record<string, string> => ({ ...m });
