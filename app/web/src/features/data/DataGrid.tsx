// Grade de observações (U04): células de texto editáveis, colagem do Excel e erros por célula.
// Teclado: Tab/Shift+Tab entre células; Enter e ↓ descem; ↑ sobe.
import { type ClipboardEvent, type KeyboardEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import type { CellError } from "../analysis/buildRequest";
import { closeMenuOf, Menu } from "../menus/Menu";
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
  const lastMatrixChange = [...state.revisions]
    .reverse()
    .find((revision) => revision.reason === "design" || revision.reason === "import");
  const generated = Boolean(
    state.design ||
      state.crd ||
      state.rcbd ||
      state.mixed ||
      state.mixture ||
      state.confirmation ||
      (state.path === "plan" && lastMatrixChange?.reason === "design"),
  );
  const [editConditions, setEditConditions] = useState(false);
  const locked = generated && !editConditions;
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
    dispatch({
      type: "setRows",
      rows: locked
        ? out.rows.map((r, i) => ({ ...r, factors: state.rows[i]?.factors ?? r.factors }))
        : out.rows,
      counters: out.counters,
    });
    setIgnored(out.ignoredColumns);
  };

  return (
    <div className="data-entry">
      {generated && (
        <div className="row">
          <p className="muted small">
            {t(locked ? "data.conditionsLocked" : "data.conditionsUnlocked")}
          </p>
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              if (editConditions || window.confirm(t("data.confirmConditions")))
                setEditConditions(!editConditions);
            }}
          >
            {t(editConditions ? "data.lockConditions" : "data.editConditions")}
          </button>
        </div>
      )}
      {cellErrors.length > 0 && (
        <ul className="error" aria-label={t("data.errorsSummary", { count: cellErrors.length })}>
          {cellErrors.map((e) => (
            <li key={`${e.row}:${e.column}`}>
              <button
                type="button"
                className="link-button"
                onClick={() => focusCell(e.row, e.column)}
              >
                {t("data.goCell", {
                  row: e.row + 1,
                  name: columns.find((c) => c.index === e.column)?.name ?? e.column,
                })}
                : {t(`cellErrors.${e.code}`, { ns: "diagnostics" })}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">{t("data.missingNote")}</p>
      <section className="grid-scroll" aria-label={t("data.caption")}>
        <table className="data-grid">
          <caption>{t("data.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("data.rowLabel")}</th>
              {columns.map((c) => (
                <th key={c.index} scope="col">
                  {c.role === "unit"
                    ? t("data.unitColumn")
                    : c.role === "time"
                      ? t("data.timeColumn")
                      : c.name || `(${c.id})`}
                  {c.unit ? <span className="muted"> [{c.unit}]</span> : null}
                </th>
              ))}
              <th scope="col">{t("data.actions")}</th>
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
                      : c.role === "time"
                        ? (row.timeText ?? "")
                        : c.role === "factor"
                          ? (row.factors[c.index - 1] ?? "")
                          : (row.responses[c.index - 1 - state.factors.length] ?? "");
                  const error = errorAt.get(`${r}:${c.index}`);
                  const label = `${c.role === "unit" ? t("data.unitColumn") : c.role === "time" ? t("data.timeColumn") : c.name || c.id} — ${t("data.rowLabel")} ${r + 1}`;
                  return (
                    <td
                      key={c.index}
                      data-role={c.role}
                      data-locked={locked && c.role === "factor"}
                    >
                      <input
                        id={`${gridId}-${r}-${c.index}`}
                        type="text"
                        readOnly={locked && c.role === "factor"}
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
                  <Menu
                    label={
                      <>
                        <span aria-hidden="true">⋯</span>
                        <span className="sr-only">{t("data.rowActions", { n: r + 1 })}</span>
                      </>
                    }
                    buttonClassName="button secondary small row-menu-button"
                    testId={`row-actions-${r + 1}`}
                    alignEnd
                  >
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={(e) => {
                        closeMenuOf(e.currentTarget);
                        dispatch({ type: "removeRow", row: r });
                      }}
                    >
                      {t("data.removeRow", { n: r + 1 })}
                    </button>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
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
