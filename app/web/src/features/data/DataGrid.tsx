// Grade de observações (U04): células de texto editáveis, colagem do Excel e erros por célula.
// Teclado: Tab/Shift+Tab entre células; Enter e ↓ descem; ↑ sobe.
import { type ClipboardEvent, type KeyboardEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import type { CellError } from "../analysis/buildRequest";
import { gridColumns } from "./columnRoles";
import { applyPaste, parseClipboard } from "./editing";

interface Props {
  cellErrors: CellError[];
}

export function DataGrid({ cellErrors }: Props) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const gridId = useId();
  const [ignored, setIgnored] = useState(0);
  const columns = gridColumns(state);
  const errorAt = new Map(cellErrors.map((e) => [`${e.row}:${e.column}`, e]));

  if (columns.filter((c) => c.role !== "unit").length === 0) {
    return <p className="muted">{t("data.needColumns")}</p>;
  }

  const focusCell = (row: number, column: number) => {
    document.getElementById(`${gridId}-${row}-${column}`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, row: number, column: number) => {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(row + 1, column);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(row - 1, column);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>, row: number, column: number) => {
    const text = event.clipboardData.getData("text/plain");
    const matrix = parseClipboard(text);
    // Um único valor sem tabulação: deixa o navegador colar normalmente na célula.
    if (matrix.length === 1 && matrix[0]?.length === 1) return;
    event.preventDefault();
    const out = applyPaste(state, row, column, matrix);
    dispatch({ type: "setRows", rows: out.rows, counters: out.counters });
    setIgnored(out.ignoredColumns);
  };

  return (
    <div>
      <div className="grid-scroll">
        <table className="data-grid">
          <caption>{t("data.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("data.rowLabel")}</th>
              {columns.map((c) => (
                <th key={c.index} scope="col">
                  {c.role === "unit" ? t("data.unitColumn") : c.name || `(${c.id})`}
                  {c.unit ? <span className="muted"> [{c.unit}]</span> : null}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">{t("workflow.step.data")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row, r) => (
              <tr key={row.id}>
                <th scope="row">{r + 1}</th>
                {columns.map((c) => {
                  const value =
                    c.role === "unit"
                      ? row.unitId
                      : c.role === "factor"
                        ? (row.factors[c.index - 1] ?? "")
                        : (row.responses[c.index - 1 - state.factors.length] ?? "");
                  const error = errorAt.get(`${r}:${c.index}`);
                  const label = `${c.role === "unit" ? t("data.unitColumn") : c.name || c.id} — ${t("data.rowLabel")} ${r + 1}`;
                  return (
                    <td key={c.index}>
                      <input
                        id={`${gridId}-${r}-${c.index}`}
                        type="text"
                        inputMode={c.role === "response" ? "decimal" : "text"}
                        aria-label={label}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${gridId}-${r}-${c.index}-err` : undefined}
                        value={value}
                        onChange={(e) =>
                          dispatch({
                            type: "setCell",
                            row: r,
                            column: c.index,
                            value: e.target.value,
                          })
                        }
                        onKeyDown={(e) => onKeyDown(e, r, c.index)}
                        onPaste={(e) => onPaste(e, r, c.index)}
                      />
                      {error && (
                        <span
                          id={`${gridId}-${r}-${c.index}-err`}
                          className="cell-error"
                          role="note"
                        >
                          <span className="sr-only">{t("data.cellError")}: </span>
                          {t(`cellErrors.${error.code}`, { ns: "diagnostics" })}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => dispatch({ type: "removeRow", row: r })}
                  >
                    {t("data.removeRow", { n: r + 1 })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.rows.length === 0 && <p className="muted">{t("data.empty")}</p>}
      {ignored > 0 && (
        <p role="status" className="muted">
          {t("data.pasteIgnored", { count: ignored })}
        </p>
      )}
      <button type="button" className="button" onClick={() => dispatch({ type: "addRow" })}>
        {t("data.addRow")}
      </button>
    </div>
  );
}
