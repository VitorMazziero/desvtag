import { useTranslation } from "react-i18next";
import type { Cell } from "../../services/export";
import { useProject } from "../../state/ProjectContext";
import { CommentThread } from "../comments";
import { ExportButton } from "./ExportButton";
import { useTableExport } from "./useTableExport";
import { useViewedFamily } from "./ViewedFamily";

interface Props {
  /** Explicit saved calculation for planning supplements. */
  recordId?: string | null;
  /** Rótulo do botão CSV (termina em "(CSV)"); o do XLSX troca o sufixo. */
  label: string;
  suffix: string;
  sheet: string;
  header: string[];
  rows: Cell[][];
  metadata: Record<string, string> | null;
  fileBase: string;
  onDone: (message: string) => void;
}

/** Par de botões CSV e XLSX para uma tabela. */
export function TableExportButtons({
  recordId,
  label,
  suffix,
  sheet,
  header,
  rows,
  metadata,
  fileBase,
  onDone,
}: Props) {
  const { t } = useTranslation("results");
  const project = useProject();
  const { exportCsv, exportXlsx } = useTableExport(metadata, fileBase);
  const finish = (name: string | null) =>
    onDone(
      name === null ? t("comparison.export.cancelled") : t("comparison.export.done", { name }),
    );
  const failed = () => onDone(t("comparison.export.failed"));
  // A análise vigente fixa a revisão dos dados em que o comentário foi escrito.
  const { saved: family } = useViewedFamily();
  const analysisId =
    recordId === null
      ? undefined
      : (recordId ??
        family?.record.id ??
        [...project.analyses].reverse().find((a) => a.signature === project.result?.signature)?.id);
  return (
    <div className="table-tools" data-report-skip>
      <div className="row table-export-actions">
        <ExportButton
          label={label}
          onExport={async () => finish((await exportCsv(suffix, header, rows))?.name ?? null)}
          onError={failed}
        />
        <ExportButton
          label={label.replace(/\(CSV\)/, "(XLSX)")}
          onExport={async () =>
            finish((await exportXlsx(suffix, sheet, header, rows))?.name ?? null)
          }
          onError={failed}
        />
      </div>
      <CommentThread
        target={{
          kind: "table",
          key: `${family?.family ?? project.result?.kind ?? "plan"}/${suffix}`,
          ...(analysisId ? { analysisId } : {}),
        }}
        testId={`table-${suffix}`}
      />
    </div>
  );
}
