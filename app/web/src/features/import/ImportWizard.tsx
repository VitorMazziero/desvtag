// Importação de CSV e XLSX com prévia, papéis de coluna e confirmação (U05).
// Não presume o planejamento pelo nome do arquivo: o usuário mapeia as colunas.
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import type { Issue, SheetData } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages, issueMessage } from "../../services/errors/presentation";
import {
  DELIMITERS,
  type Delimiter,
  decodeText,
  detectDelimiter,
  MAX_TEXT_BYTES,
  parseCsv,
  splitMetadata,
  type TextEncodingName,
} from "../../services/import/csv";
import { bytesToBase64 } from "../../services/storage";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { fillResponses, planSheet, responseLabel } from "./fillResponses";
import {
  buildExperimentData,
  type ColumnMapping,
  type ColumnRole,
  type FactorKindChoice,
  guessMapping,
  looksLikeHeader,
} from "./mapping";

export interface ImportFile {
  name: string;
  bytes: Uint8Array;
}

const ROLES: ColumnRole[] = ["factor", "response", "unit", "observation", "ignore"];
const PREVIEW_ROWS = 8;

type Source =
  | { phase: "loading" }
  | { phase: "error"; messages: string[] }
  | { phase: "ready"; rows: string[][]; warnings: string[]; sheets: string[]; selected: string };

export function ImportWizard({ file, onClose }: { file: ImportFile; onClose: () => void }) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const dispatch = useProjectDispatch();
  const experiment = useProject();
  const id = useId();
  const isXlsx = /\.xlsx$/i.test(file.name);

  const [delimiter, setDelimiter] = useState<Delimiter | null>(null);
  const [encoding, setEncoding] = useState<TextEncodingName | "auto">("auto");
  const [sheet, setSheet] = useState<string | null>(null);
  const [xlsxSource, setXlsxSource] = useState<Source>({ phase: "loading" });

  // CSV/texto: leitura local e síncrona.
  const csvSource = useMemo<Source>(() => {
    if (isXlsx) return { phase: "loading" };
    if (file.bytes.length > MAX_TEXT_BYTES)
      return { phase: "error", messages: [t("import.tooLarge")] };
    try {
      const decoded = decodeText(file.bytes, encoding);
      // Os CSV exportados pelo aplicativo começam por linhas `# chave: valor`: não são dados.
      const { body } = splitMetadata(decoded.text);
      const delim = delimiter ?? detectDelimiter(body);
      return {
        phase: "ready",
        rows: parseCsv(body, delim),
        warnings: decoded.fellBack ? [t("import.encodingFallback")] : [],
        sheets: [],
        selected: "",
      };
    } catch {
      return { phase: "error", messages: [t("import.failed")] };
    }
  }, [file.bytes, isXlsx, delimiter, encoding, t]);

  // XLSX: leitura pelo motor (valores armazenados; fórmulas não são executadas).
  useEffect(() => {
    if (!isXlsx) return;
    let active = true;
    setXlsxSource({ phase: "loading" });
    client
      .request(
        { type: "importXlsx", bytesBase64: bytesToBase64(file.bytes), sheet },
        { channel: "import" },
      )
      .then((response) => {
        if (!active) return;
        if (response.outcome.status === "ok" && response.outcome.result.type === "importXlsx") {
          const data: SheetData = response.outcome.result;
          setXlsxSource({
            phase: "ready",
            rows: data.rows,
            warnings: data.warnings.map((w: Issue) => issueMessage(t, w)),
            sheets: data.sheets,
            selected: data.selected,
          });
        } else if (response.outcome.status === "error") {
          setXlsxSource({
            phase: "error",
            messages: engineErrorMessages(t, response.outcome.error),
          });
        }
      })
      .catch(() => {
        if (active)
          setXlsxSource({
            phase: "error",
            messages: [t("engine.unavailable", { ns: "diagnostics" })],
          });
      });
    return () => {
      active = false;
    };
  }, [client, file.bytes, isXlsx, sheet, t]);

  const source = isXlsx ? xlsxSource : csvSource;
  const rows = source.phase === "ready" ? source.rows : [];
  const [hasHeader, setHasHeader] = useState<boolean | null>(null);
  const header = hasHeader ?? looksLikeHeader(rows);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  // Nova grade ou nova opção de cabeçalho: recomeça a sugestão de mapeamento.
  useEffect(() => {
    setMapping(rows.length > 0 ? guessMapping(rows, header) : []);
  }, [rows, header]);

  const result = useMemo(
    () => (rows.length > 0 ? buildExperimentData(rows, header, mapping) : null),
    [rows, header, mapping],
  );
  const hasData = experiment.rows.length > 0;
  // Planilha de coleta (ET13): o arquivo traz os fatores e as respostas do experimento atual.
  const sheetFactors = useMemo(
    () => experiment.factors.map((f) => ({ name: f.name, kind: f.kind })),
    [experiment.factors],
  );
  const sheetPlan = useMemo(
    () =>
      header && rows.length > 0 && hasData
        ? planSheet(
            rows[0] ?? [],
            sheetFactors,
            experiment.responses.map((r) => ({ name: r.name, unit: r.unit })),
          )
        : null,
    [header, rows, hasData, sheetFactors, experiment.responses],
  );
  const fill = useMemo(
    () =>
      sheetPlan ? fillResponses(rows.slice(1), sheetPlan, experiment.rows, sheetFactors) : null,
    [sheetPlan, rows, experiment.rows, sheetFactors],
  );
  const [mode, setMode] = useState<"fill" | "replace">("fill");
  const filling = fill !== null && mode === "fill";
  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);

  const update = (index: number, patch: Partial<ColumnMapping>) =>
    setMapping((m) => m.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const confirm = () => {
    if (filling && fill) {
      if (fill.cells.length === 0 || fill.invalid.length > 0) return;
      dispatch({ type: "applyResponses", cells: fill.cells, now: nowIso() });
      onClose();
      return;
    }
    if (!result || result.issues.length > 0) return;
    dispatch({ type: "applyImport", data: result.data, now: nowIso() });
    onClose();
  };

  return (
    <section
      className="panel import-wizard"
      aria-labelledby={`${id}-title`}
      data-testid="import-wizard"
    >
      <h2 id={`${id}-title`}>{t("import.title")}</h2>
      <p className="muted">{t("import.intro")}</p>
      <p>
        <strong>{t("import.file")}:</strong> {file.name}
      </p>
      {isXlsx && <p className="muted small">{t("import.formulaNote")}</p>}

      {source.phase === "loading" && <p>{t("engine.loading")}</p>}
      {source.phase === "error" && (
        <div role="alert" className="error">
          <p>{t("import.failed")}</p>
          {source.messages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      {source.phase === "ready" && (
        <>
          <div className="form-grid">
            {isXlsx && source.sheets.length > 0 && (
              <label className="field">
                <span>{t("import.sheet")}</span>
                <select value={source.selected} onChange={(e) => setSheet(e.target.value)}>
                  {source.sheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!isXlsx && (
              <>
                <label className="field">
                  <span>{t("import.delimiter")}</span>
                  <select
                    value={delimiter ?? detectDelimiterOf(file.bytes, encoding)}
                    onChange={(e) => setDelimiter(e.target.value as Delimiter)}
                  >
                    {DELIMITERS.map((d) => (
                      <option key={d} value={d}>
                        {t(`import.delimiterNames.${d}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("import.encoding")}</span>
                  <select
                    value={encoding}
                    onChange={(e) => setEncoding(e.target.value as TextEncodingName | "auto")}
                  >
                    <option value="auto">{t("import.encodingAuto")}</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="windows-1252">Windows-1252</option>
                  </select>
                </label>
              </>
            )}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={header}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            <span>{t("import.header")}</span>
          </label>
          {source.warnings.map((w) => (
            <p key={w} role="status" className="muted">
              {w}
            </p>
          ))}

          <h3>{t("import.preview")}</h3>
          <div className="grid-scroll">
            <table className="data-grid" data-testid="import-preview">
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((row, r) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: linhas da prévia não têm identidade própria.
                  <tr key={r}>
                    {Array.from({ length: width }, (_, c) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: colunas da prévia não têm identidade própria.
                      <td key={c}>{row[c] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {fill && (
            <div className="panel" data-testid="fill-responses">
              <h3>{t("import.fill.title")}</h3>
              <p className="muted">{t("import.fill.intro")}</p>
              <fieldset className="check-group">
                <legend className="visually-hidden">{t("import.fill.modeLegend")}</legend>
                <label className="check">
                  <input
                    type="radio"
                    name={`${id}-mode`}
                    checked={mode === "fill"}
                    onChange={() => setMode("fill")}
                  />
                  <span>{t("import.fill.modeFill")}</span>
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name={`${id}-mode`}
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  <span>{t("import.fill.modeReplace")}</span>
                </label>
              </fieldset>
              {filling && (
                <>
                  <p role="status" data-testid="fill-summary">
                    {t("import.fill.summary", {
                      filled: fill.cells.length,
                      empty: fill.empty,
                    })}
                  </p>
                  <p className="muted small">
                    {t("import.fill.columns", {
                      responses: experiment.responses
                        .filter((_, j) => (sheetPlan?.responseColumns[j] ?? -1) >= 0)
                        .map(responseLabel)
                        .join(", "),
                    })}
                  </p>
                  {fill.replacing > 0 && (
                    <p role="status" className="muted">
                      {t("import.fill.replacing", { count: fill.replacing })}
                    </p>
                  )}
                  {fill.unmatchedLines.length > 0 && (
                    <div role="alert" className="error" data-testid="fill-unmatched">
                      {t("import.fill.unmatched", {
                        count: fill.unmatchedLines.length,
                        lines: fill.unmatchedLines.slice(0, 5).join(", "),
                      })}
                    </div>
                  )}
                  {fill.invalid.length > 0 && (
                    <div role="alert" className="error" data-testid="fill-invalid">
                      {t("import.fill.invalid", {
                        count: fill.invalid.length,
                        lines: fill.invalid
                          .slice(0, 5)
                          .map((i) => `${i.line} (“${i.text}”)`)
                          .join(", "),
                      })}
                    </div>
                  )}
                  {fill.rowsWithoutLine > 0 && (
                    <p className="muted small">
                      {t("import.fill.rowsWithoutLine", { count: fill.rowsWithoutLine })}
                    </p>
                  )}
                  <p className="muted small">{t("import.fill.keeps")}</p>
                </>
              )}
            </div>
          )}

          {!filling && (
            <>
              <h3>{t("import.mapping")}</h3>
              <p className="muted small">{t("import.unitHelp")}</p>
              <div className="grid-scroll">
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{t("variables.name")}</th>
                      <th scope="col">{t("import.role")}</th>
                      <th scope="col">{t("import.kind")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((m, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a coluna do arquivo é identificada pela posição.
                      <tr key={i}>
                        <th scope="row">{i + 1}</th>
                        <td>
                          <input
                            type="text"
                            aria-label={`${t("variables.name")} ${i + 1}`}
                            value={m.name}
                            onChange={(e) => update(i, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`${t("import.role")} ${i + 1}`}
                            value={m.role}
                            onChange={(e) => update(i, { role: e.target.value as ColumnRole })}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {t(`import.roleOptions.${role}`)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {m.role === "factor" && (
                            <select
                              aria-label={`${t("import.kind")} ${i + 1}`}
                              value={m.kind}
                              onChange={(e) =>
                                update(i, { kind: e.target.value as FactorKindChoice })
                              }
                            >
                              <option value="categorical">{t("variables.kindCategorical")}</option>
                              <option value="numeric">{t("variables.kindNumeric")}</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result && result.skippedEmptyRows > 0 && (
                <p className="muted small">
                  {t("import.skippedEmpty", { count: result.skippedEmptyRows })}
                </p>
              )}
              {result && result.issues.length > 0 && (
                <div role="alert" className="error">
                  {result.issues.map((issue) => (
                    <p key={issue.code}>
                      {t(`issues.${issue.code}`, {
                        ns: "diagnostics",
                        rows: issue.rows.join(", "),
                      })}
                    </p>
                  ))}
                </div>
              )}
              {hasData && <p className="muted">{t("import.replaceNote")}</p>}
            </>
          )}
        </>
      )}

      <div className="row">
        <button
          type="button"
          className="button"
          onClick={confirm}
          disabled={
            filling && fill
              ? fill.cells.length === 0 || fill.invalid.length > 0
              : !result || result.issues.length > 0
          }
        >
          {filling ? t("import.fill.confirm") : t("import.confirm")}
        </button>
        <button type="button" className="button secondary" onClick={onClose}>
          {t("import.cancel")}
        </button>
      </div>
    </section>
  );
}

/** Separador sugerido para o seletor enquanto o usuário ainda não escolheu um. */
function detectDelimiterOf(bytes: Uint8Array, encoding: TextEncodingName | "auto"): Delimiter {
  try {
    return detectDelimiter(splitMetadata(decodeText(bytes, encoding).text).body);
  } catch {
    return ";";
  }
}
