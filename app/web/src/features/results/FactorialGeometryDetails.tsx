import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { FactorialEstimability } from "../../services/engine";
import { TableExportButtons } from "./TableExportButtons";

/** A saved geometric diagnosis; displaying it never fits a model. */
export function FactorialGeometryDetails({
  geometry,
  language,
  recordId = null,
  metadata = null,
}: {
  geometry: FactorialEstimability;
  language: Language;
  recordId?: string | null;
  metadata?: Record<string, string> | null;
}) {
  const { t } = useTranslation("results");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(geometry.columns.length / 20));
  const current = Math.min(page, pages - 1);
  const rows = [
    ...geometry.columns.map((c) => [
      "column",
      c.label,
      null,
      null,
      c.estimable ? 1 : 0,
      null,
      null,
    ]),
    ...geometry.terms.map((term) => [
      "term",
      term.term,
      term.nominalDf,
      term.estimableDf,
      null,
      null,
      null,
    ]),
    ...geometry.nullRelations.flatMap((direction, i) =>
      direction.flatMap((weight, j) =>
        weight === 0
          ? []
          : [
              [
                "null_direction",
                geometry.columns[j]?.label ?? String(j),
                null,
                null,
                null,
                i + 1,
                weight,
              ],
            ],
      ),
    ),
  ];
  return (
    <section
      className="factorial-geometry editor-card"
      aria-label={t("factorial.geometry.title")}
      data-testid="factorial-geometry"
    >
      <h4>{t("factorial.geometry.title")}</h4>
      <p>
        {t("factorial.geometry.summary", {
          rank: geometry.rank,
          parameters: geometry.parameters,
          used: geometry.usedRows,
          total: geometry.totalRows,
        })}
      </p>
      <p className="muted small">
        {t(
          geometry.responseId === null
            ? "factorial.geometry.conditions"
            : "factorial.geometry.completeResponse",
        )}
      </p>
      <p>
        {t(
          geometry.rank < geometry.parameters
            ? "factorial.geometry.deficient"
            : "factorial.geometry.fullRank",
        )}
      </p>
      <p className="muted small">{t("factorial.geometry.coding")}</p>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll this wide table. */}
      <section className="grid-scroll" tabIndex={0} aria-label={t("factorial.geometry.terms")}>
        <table className="results-table">
          <caption>{t("factorial.geometry.terms")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("factorial.cols.term")}</th>
              <th scope="col">{t("factorial.geometry.nominal")}</th>
              <th scope="col">{t("factorial.geometry.identified")}</th>
            </tr>
          </thead>
          <tbody>
            {geometry.terms.map((term) => (
              <tr key={term.factors.join("|")}>
                <th scope="row">{term.term}</th>
                <td className="num">{term.nominalDf}</td>
                <td className="num">{term.estimableDf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="muted small">{t("factorial.geometry.projection")}</p>
      <details>
        <summary>{t("factorial.geometry.columns")}</summary>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll this wide table. */}
        <section className="grid-scroll" tabIndex={0} aria-label={t("factorial.geometry.columns")}>
          <table className="results-table">
            <caption>{t("factorial.geometry.columns")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("factorial.geometry.column")}</th>
                <th scope="col">{t("factorial.geometry.unique")}</th>
              </tr>
            </thead>
            <tbody>
              {geometry.columns.slice(current * 20, current * 20 + 20).map((c) => (
                <tr key={c.label}>
                  <th scope="row">{c.label}</th>
                  <td>{t(c.estimable ? "factorial.geometry.yes" : "factorial.geometry.no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {pages > 1 && (
          <div className="row" data-report-skip>
            <button
              type="button"
              className="button secondary small"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              {t("factorial.geometry.previous")}
            </button>
            <span>
              {current + 1} / {pages}
            </span>
            <button
              type="button"
              className="button secondary small"
              disabled={current + 1 === pages}
              onClick={() => setPage(current + 1)}
            >
              {t("factorial.geometry.next")}
            </button>
          </div>
        )}
      </details>
      {geometry.nullRelations.length > 0 && (
        <details>
          <summary>
            {t("factorial.geometry.relations", { count: geometry.nullRelations.length })}
          </summary>
          <p className="muted small">{t("factorial.geometry.nullHelp")}</p>
          <ol className="facts-list factorial-null-directions">
            {geometry.nullRelations.map((direction) => (
              <li key={JSON.stringify(direction)}>
                <code>
                  {direction
                    .flatMap((weight, j) =>
                      Math.abs(weight) < 1e-10
                        ? []
                        : [
                            `Δβ[${geometry.columns[j]?.label}] = ${formatSignificant(weight, language, 6)}·t`,
                          ],
                    )
                    .join("; ")}
                </code>
              </li>
            ))}
          </ol>
        </details>
      )}
      <TableExportButtons
        recordId={recordId}
        label={t("factorial.geometry.export")}
        suffix="estimability"
        sheet={t("factorial.geometry.title")}
        header={[
          "kind",
          "label",
          "nominal_df",
          "estimable_df",
          "unique_coefficient",
          "null_direction",
          "weight",
        ]}
        rows={rows}
        metadata={{
          ...metadata,
          method: `${geometry.provenance.methodId} v${geometry.provenance.methodVersion}`,
          rank: String(geometry.rank),
          parameters: String(geometry.parameters),
          used_rows: String(geometry.usedRows),
          response_scope: geometry.responseId ?? "conditions",
        }}
        fileBase="factorial-estimability"
        onDone={setNotice}
      />
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
