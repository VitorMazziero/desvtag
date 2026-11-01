import { useTranslation } from "react-i18next";
import type { Cell } from "../../services/export";
import { ExportButton } from "./ExportButton";
import { useTableExport } from "./useTableExport";

interface Props {
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
  const { exportCsv, exportXlsx } = useTableExport(metadata, fileBase);
  const finish = (name: string | null) =>
    onDone(
      name === null ? t("comparison.export.cancelled") : t("comparison.export.done", { name }),
    );
  const failed = () => onDone(t("comparison.export.failed"));
  return (
    <>
      <ExportButton
        label={label}
        onExport={async () => finish((await exportCsv(suffix, header, rows))?.name ?? null)}
        onError={failed}
      />
      <ExportButton
        label={label.replace(/\(CSV\)/, "(XLSX)")}
        onExport={async () => finish((await exportXlsx(suffix, sheet, header, rows))?.name ?? null)}
        onError={failed}
      />
    </>
  );
}
