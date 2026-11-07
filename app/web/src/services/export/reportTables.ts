import type { Language } from "../../i18n";
import { formatFull, formatP, formatSignificant } from "../../i18n/format";
import type { Stat } from "../engine";

export type ReportCell = string | number | null | Stat;
interface TableSource {
  rows: ReportCell[][];
  columns: { p?: boolean }[];
  language: Language;
  translate: (key: string) => string;
}
const sources = new WeakMap<HTMLTableElement, TableSource>();

export function registerReportTable(table: HTMLTableElement, source: TableSource) {
  sources.set(table, source);
}

function writeCell(cell: HTMLTableCellElement, value: ReportCell, p: boolean, source: TableSource) {
  if (typeof value === "number" || typeof value === "object") cell.className = "num";
  if (typeof value === "object" && value !== null && value.status === "undefined") {
    const reason = value.reason;
    const label =
      reason === "notEstimable"
        ? "notEstimable"
        : reason === "noValidObservations"
          ? "missing"
          : reason === "noResidualDegreesOfFreedom"
            ? "noDf"
            : null;
    cell.textContent = label ? source.translate(`number.${label}`) : "—";
    cell.title = source.translate(`undefinedReason.${reason}`);
    cell.dataset.statState = reason;
    return;
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "object" && value !== null
        ? value.value
        : null;
  if (number !== null) {
    cell.textContent = p
      ? formatP(number, source.language)
      : formatSignificant(number, source.language);
    cell.title = formatFull(number, source.language);
  } else cell.textContent = typeof value === "string" ? value : "—";
}

/** Keep every source row, yielding between bounded batches rather than mounting per-cell hooks. */
export async function populateReportTables(root: HTMLElement, signal?: AbortSignal) {
  for (const table of root.querySelectorAll<HTMLTableElement>(
    "table[data-deferred-report-table]",
  )) {
    const source = sources.get(table);
    if (!source) throw new Error("Missing report table source");
    const body = table.querySelector("tbody");
    if (!body) throw new Error("Missing report table body");
    body.replaceChildren();
    let started = performance.now();
    let fragment = table.ownerDocument.createDocumentFragment();
    for (const values of source.rows) {
      signal?.throwIfAborted();
      const row = table.ownerDocument.createElement("tr");
      values.forEach((value, index) => {
        const cell = table.ownerDocument.createElement("td");
        writeCell(cell, value, Boolean(source.columns[index]?.p), source);
        row.append(cell);
      });
      fragment.append(row);
      if (performance.now() - started >= 8) {
        body.append(fragment);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        signal?.throwIfAborted();
        fragment = table.ownerDocument.createDocumentFragment();
        started = performance.now();
      }
    }
    body.append(fragment);
    table.removeAttribute("data-deferred-report-table");
  }
}
