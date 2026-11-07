import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { Stat } from "../../services/engine";
import { registerReportTable } from "../../services/export/reportTables";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";
export type MixedCell = string | number | null | Stat;
export function MixedResultTable({
  id,
  title,
  columns,
  rows,
  language,
  metadata,
  onDone,
  fileBase = "mixed-model",
  previewRows,
  report = false,
}: {
  id: string;
  title: string;
  columns: { key: string; label: string; p?: boolean }[];
  rows: MixedCell[][];
  language: Language;
  metadata: Record<string, string>;
  onDone: (message: string) => void;
  fileBase?: string;
  previewRows?: number;
  report?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const deferred = report && rows.length * columns.length > 4096;
  const shown = deferred
    ? []
    : report || showAll
      ? rows
      : rows.slice(0, previewRows ?? rows.length);
  return (
    <section data-testid={id}>
      <h4>{title}</h4>
      {/* biome-ignore lint/a11y/useSemanticElements: Named scroll region inside the existing scientific result section. */}
      <div
        className="grid-scroll"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard access to the horizontally scrollable table.
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <table
          ref={(table) => {
            if (table && deferred)
              registerReportTable(table, {
                rows,
                columns,
                language,
                translate: i18n.getFixedT(language, "results"),
              });
          }}
          data-deferred-report-table={deferred ? "true" : undefined}
          className="results-table"
          aria-label={title}
          data-paper-row-reference={t("family.paperRowReference")}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th scope="col" key={c.key}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={JSON.stringify(row)}>
                {row.map((cell, j) => (
                  <td
                    key={columns[j]?.key ?? j}
                    className={
                      typeof cell === "number" || typeof cell === "object" ? "num" : undefined
                    }
                  >
                    {typeof cell === "object" && cell !== null ? (
                      <StatNumber stat={cell} language={language} p={columns[j]?.p} />
                    ) : typeof cell === "number" ? (
                      <StatNumber stat={{ status: "defined", value: cell }} language={language} />
                    ) : (
                      (cell ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!report && previewRows !== undefined && rows.length > previewRows && (
        <>
          <p className="muted small">
            {t("family.tablePreview", { shown: shown.length, total: rows.length })}
          </p>
          <button
            type="button"
            className="button quiet"
            data-report-skip
            onClick={() => setShowAll((value) => !value)}
          >
            {t(showAll ? "family.showPreviewRows" : "family.showAllRows")}
          </button>
        </>
      )}
      {!report && (
        <TableExportButtons
          label={`${title} (CSV)`}
          suffix={id}
          sheet={title.slice(0, 31)}
          header={columns.map((c) => c.key)}
          rows={rows.map((row) =>
            row.map((cell) =>
              typeof cell === "object" && cell !== null
                ? cell.status === "defined"
                  ? cell.value
                  : null
                : cell,
            ),
          )}
          metadata={metadata}
          fileBase={fileBase}
          onDone={onDone}
        />
      )}
      {rows.length === 0 && <p className="muted">{t("mixedAdvanced.empty")}</p>}
    </section>
  );
}
