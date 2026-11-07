// Export the current observation table, including dedicated unit/time columns.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "../../state/ProjectContext";
import { sameData, snapshotData } from "../../state/revisionOps";
import { ExportButton } from "../results/ExportButton";
import { useTableExport } from "../results/useTableExport";
import { parseNumberCell } from "./editing";

function numeric(text: string | null | undefined): number | string | null {
  const parsed = parseNumberCell(text ?? "");
  return parsed.ok ? parsed.value : (text ?? null);
}

export function DataExportButtons() {
  const state = useProject();
  const { t } = useTranslation();
  const { t: tr } = useTranslation("results");
  const [notice, setNotice] = useState<{
    kind: "done" | "cancelled" | "failed";
    name?: string;
  } | null>(null);
  const hasUnits = state.showUnitColumn || state.rows.some((r) => r.unitId.trim() !== "");
  const hasTime = state.showTimeColumn || state.rows.some((r) => Boolean(r.timeText));
  const latest = state.revisions.at(-1);
  const source = latest && sameData(latest.data, snapshotData(state)) ? latest : null;
  const metadata = {
    app: "DesvTAG",
    source: "observation table",
    revision: source?.id ?? "uncommitted working data",
    experiment: state.id,
    columns: JSON.stringify({
      unit: hasUnits,
      time: hasTime,
      factors: state.factors.map((f) => f.id),
      responses: state.responses.map((r) => r.id),
    }),
  };
  const header = [
    "observation_id",
    ...(hasUnits ? ["unit_id"] : []),
    ...state.factors.map((f) => `${f.name}${f.unit ? ` [${f.unit}]` : ""}`),
    ...state.responses.map((r) => `${r.name}${r.unit ? ` [${r.unit}]` : ""}`),
    ...(hasTime ? ["time"] : []),
  ];
  const rows = state.rows.map((r) => [
    r.id,
    ...(hasUnits ? [r.unitId] : []),
    ...state.factors.map((f, i) =>
      f.kind === "numeric" ? numeric(r.factors[i]) : (r.factors[i] ?? ""),
    ),
    ...state.responses.map((_, i) => numeric(r.responses[i])),
    ...(hasTime ? [numeric(r.timeText)] : []),
  ]);
  const { exportCsv, exportXlsx } = useTableExport(metadata, "observations");
  if (!state.rows.length) return null;
  const done = (name: string | null) =>
    setNotice(name === null ? { kind: "cancelled" } : { kind: "done", name });
  return (
    <div className="table-tools" data-testid="data-export">
      <div className="row table-export-actions">
        <ExportButton
          label={`${t("data.export")} (CSV)`}
          onExport={async () => done((await exportCsv("data", header, rows))?.name ?? null)}
          onError={() => setNotice({ kind: "failed" })}
        />
        <ExportButton
          label={`${t("data.export")} (XLSX)`}
          onExport={async () =>
            done((await exportXlsx("data", "Observations", header, rows))?.name ?? null)
          }
          onError={() => setNotice({ kind: "failed" })}
        />
      </div>
      {notice && (
        <p role="status">{tr(`comparison.export.${notice.kind}`, { name: notice.name })}</p>
      )}
    </div>
  );
}
