// Exportação de tabelas (CSV e XLSX) com proveniência, no formato e no idioma das preferências de
// exportação. O motor escreve o XLSX; o CSV é montado em `services/export/csv.ts`.
import { useTranslation } from "react-i18next";
import { useEngine } from "../../services/engine/EngineContext";
import {
  buildWorkbook,
  type Cell,
  EXCEL_PT,
  exportLanguage,
  TECHNICAL,
  toCsv,
  utf8,
  writeXlsx,
} from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";

export function useTableExport(metadata: Record<string, string> | null, fileBase: string) {
  const storage = useStorage();
  const { client } = useEngine();
  const { settings } = useExportSettings();
  const { t, i18n } = useTranslation("results");
  const language = exportLanguage(settings, i18n.language);
  const dialect = settings.csv === "excel" && language === "pt-BR" ? EXCEL_PT : TECHNICAL;
  const meta = {
    ...(metadata ?? {}),
    export_language: language,
    csv_format:
      dialect === EXCEL_PT ? "excel-pt (; e vírgula decimal)" : "technical (, e ponto decimal)",
  };
  return {
    /** Grava a tabela em CSV; devolve o arquivo salvo ou `null` se o usuário cancelou. */
    exportCsv: (suffix: string, header: string[], rows: Cell[][]) =>
      storage.exportFile(utf8(toCsv(header, rows, meta, dialect)), `${fileBase}-${suffix}.csv`),
    /** Grava a tabela em XLSX (com a planilha de proveniência). */
    exportXlsx: async (suffix: string, sheet: string, header: string[], rows: Cell[][]) =>
      storage.exportFile(
        await writeXlsx(
          client,
          buildWorkbook(sheet, header, rows, meta, t("export.provenanceSheet")),
        ),
        `${fileBase}-${suffix}.xlsx`,
      ),
  };
}
