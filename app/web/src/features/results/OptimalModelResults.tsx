import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { scatterChart } from "../../services/charts";
import type { OptimalModelResult, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { ChartFigure } from "./ChartFigure";
import { MixedResultTable } from "./MixedResultTable";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";
import { useResultMetadata } from "./useResultMetadata";

const value = (stat: Stat) => (stat.status === "defined" ? stat.value : null);

/** Display/export only: the saved fit includes every nominal and numeric model column. */
export function OptimalModelResults({
  result,
  signature,
  language,
  report = false,
}: {
  result: OptimalModelResult;
  signature: string;
  language: Language;
  report?: boolean;
}) {
  const { t } = useTranslation("results");
  const tc = useTranslation("diagnostics").t;
  const { record, revision, metadataText, exportMeta } = useResultMetadata(signature);
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const format = useFigureFormat(language);
  const fit = result.fit;
  const response = revision?.data.responses.find((r) => r.id === result.responseId);
  const responseName = response?.name ?? result.responseId;
  const unit = response?.unit ? ` [${response.unit}]` : "";
  const num = (s: Stat, p = false) => <StatNumber stat={s} language={language} p={p} />;
  const unavailable: Stat = { status: "undefined", reason: "notApplicable" };
  const anova = [fit.anova.model, fit.anova.residual, fit.anova.total];
  const anovaNames = [t("optimalModel.model"), t("optimalModel.residual"), t("optimalModel.total")];
  const coefficientHeader = ["column", "estimate", "std_error", "t", "p", "ci_lower", "ci_upper"];
  const coefficientRows = fit.coefficients.map((c) => [
    c.label,
    value(c.estimate),
    value(c.stdError),
    value(c.tValue),
    value(c.pValue),
    value(c.ciLower),
    value(c.ciUpper),
  ]);
  const observationHeader = [
    "observation",
    "observed",
    "fitted",
    "residual",
    "leverage",
    "standardized_residual",
    "studentized_residual",
    "cooks_distance",
  ];
  const observationRows = fit.observations.map((o) => [
    o.observationId ?? o.row + 1,
    o.observed,
    o.fitted,
    o.residual,
    o.leverage,
    o.standardizedResidual,
    o.studentizedResidual,
    o.cooksDistance,
  ]);
  const current = Math.min(page, Math.max(0, Math.ceil(observationRows.length / 20) - 1));
  const exportTable = (
    suffix: string,
    header: string[],
    rows: (string | number | null)[][],
    label: string,
  ) => (
    <TableExportButtons
      recordId={record?.id ?? null}
      label={`${label} (CSV)`}
      suffix={suffix}
      sheet={label}
      header={header}
      rows={rows}
      metadata={exportMeta}
      fileBase="modelo-otimo"
      onDone={setNotice}
    />
  );
  const charts = (residual: boolean, metadata: boolean) => ({
    id: residual ? "optimal-model-residuals" : "optimal-model-fit",
    title: t(residual ? "optimalModel.residualChart" : "optimalModel.fitChart"),
    description: t("optimalModel.chartDescription"),
    xLabel: `${t("optimalModel.fitted")}: ${responseName}${unit}`,
    yLabel: `${t(residual ? "optimalModel.residual" : "optimalModel.observed")}${unit}`,
    reference: residual ? ("zero" as const) : ("identity" as const),
    legend: t(residual ? "optimalModel.residualLegend" : "optimalModel.fitLegend"),
    points: fit.observations.map((o) => ({
      x: o.fitted,
      y: residual ? o.residual : o.observed,
      label: o.observationId ?? String(o.row + 1),
    })),
    metadata: metadata ? metadataText : undefined,
  });
  return (
    <>
      <div data-section="summary">
        <section className="panel" data-testid="optimal-model-summary">
          <h3>{t("optimalModel.summaryTitle")}</h3>
          <p>
            {t("optimalModel.summary", {
              n: fit.nObservations,
              rank: fit.rank,
              parameters: fit.nColumns,
              df: fit.dfResidual,
            })}
          </p>
          <p>{t("optimalModel.scope")}</p>
          {fit.rank < fit.nColumns && (
            <p role="note" className="validation-warning">
              {t("optimalModel.confounded")}
            </p>
          )}
          <ul className="facts-list">
            {fit.issues.map((issue) => (
              <li key={issue.code + JSON.stringify(issue.params)}>{issueMessage(tc, issue)}</li>
            ))}
          </ul>
        </section>
      </div>
      <div data-section="tables" className="optimal-model-tables">
        <section className="editor-card">
          <h4>{t("optimalModel.coding")}</h4>
          <p>{t("optimalModel.codingHelp")}</p>
          <ul className="facts-list">
            {result.spec.factors.map((factor, i) => (
              <li key={factor.id}>
                <code>
                  z{i + 1}({factor.name}) = ({factor.name} − ({format(factor.low)} +{" "}
                  {format(factor.high)})/2) / (({format(factor.high)} − {format(factor.low)})/2)
                </code>
              </li>
            ))}
            {result.spec.categories?.factors.map((factor) => (
              <li key={factor.id}>
                {factor.name}: {factor.levels.join(" · ")} ·{" "}
                {t("optimalModel.sumBaseline", { baseline: factor.levels.at(-1) })}
              </li>
            ))}
            {result.spec.blocks && (
              <li>
                {t("optimalModel.blockCoding", {
                  labels: result.spec.blocks.labels.join(" · "),
                  baseline: result.spec.blocks.labels.at(-1),
                })}
              </li>
            )}
          </ul>
        </section>
        <div className="grid-scroll">
          <table className="results-table" data-testid="optimal-model-coefficients">
            <caption>{t("optimalModel.coefficients")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("factorial.cols.term")}</th>
                <th scope="col">{t("factorial.cols.estimate")}</th>
                <th scope="col">{t("factorial.cols.se")}</th>
                <th scope="col">t</th>
                <th scope="col">p</th>
                <th scope="col">
                  {t("factorial.cols.ci")} ({format(fit.confidenceLevel * 100)}%)
                </th>
              </tr>
            </thead>
            <tbody>
              {fit.coefficients.map((c) => (
                <tr key={c.label}>
                  <th scope="row">{c.label}</th>
                  <td className="num">{num(c.estimate)}</td>
                  <td className="num">{num(c.stdError)}</td>
                  <td className="num">{num(c.tValue)}</td>
                  <td className="num">{num(c.pValue, true)}</td>
                  <td className="num">
                    {num(c.ciLower)}
                    {"; "}
                    {num(c.ciUpper)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {exportTable(
          "optimal-model-coefficients",
          coefficientHeader,
          coefficientRows,
          t("optimalModel.coefficients"),
        )}
        <div className="grid-scroll">
          <table className="results-table" data-testid="optimal-model-anova">
            <caption>{t("factorial.anova")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("factorial.cols.term")}</th>
                <th scope="col">{t("factorial.cols.df")}</th>
                <th scope="col">{t("factorial.cols.ss")}</th>
                <th scope="col">{t("factorial.cols.ms")}</th>
                <th scope="col">F</th>
                <th scope="col">p</th>
              </tr>
            </thead>
            <tbody>
              {anova.map((r, i) => (
                <tr key={anovaNames[i]}>
                  <th scope="row">{anovaNames[i]}</th>
                  <td className="num">{r.df}</td>
                  <td className="num">{num(r.sumSquares)}</td>
                  <td className="num">{num(r.meanSquare)}</td>
                  <td className="num">{num(i === 0 ? fit.anova.f : unavailable)}</td>
                  <td className="num">{num(i === 0 ? fit.anova.pValue : unavailable, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {exportTable(
          "optimal-model-anova",
          ["term", "df", "sum_squares", "mean_square", "F", "p"],
          anova.map((r, i) => [
            anovaNames[i] ?? "",
            r.df,
            value(r.sumSquares),
            value(r.meanSquare),
            i === 0 ? value(fit.anova.f) : null,
            i === 0 ? value(fit.anova.pValue) : null,
          ]),
          t("factorial.anova"),
        )}
        {report ? (
          <MixedResultTable
            id="optimal-model-observations"
            title={t("optimalModel.observations")}
            columns={observationHeader.map((key) => ({
              key,
              label: t(`optimalModel.columns.${key}`),
            }))}
            rows={observationRows}
            language={language}
            metadata={exportMeta ?? {}}
            onDone={setNotice}
            report
          />
        ) : (
          <details className="advanced">
            <summary>{t("optimalModel.observations")}</summary>
            <div className="grid-scroll">
              <table className="results-table" data-testid="optimal-model-observations">
                <caption>{t("optimalModel.observations")}</caption>
                <thead>
                  <tr>
                    {observationHeader.map((h) => (
                      <th scope="col" key={h}>
                        {t(`optimalModel.columns.${h}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {observationRows.slice(current * 20, current * 20 + 20).map((r) => (
                    <tr key={String(r[0])}>
                      {r.map((cell, i) => (
                        <td key={observationHeader[i]} className={i > 0 ? "num" : undefined}>
                          {typeof cell === "object"
                            ? num(cell)
                            : typeof cell === "number"
                              ? format(cell)
                              : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" data-report-skip>
              <button
                type="button"
                className="button secondary"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                {t("factorial.geometry.previous")}
              </button>
              <span>
                {current + 1} / {Math.max(1, Math.ceil(observationRows.length / 20))}
              </span>
              <button
                type="button"
                className="button secondary"
                disabled={(current + 1) * 20 >= observationRows.length}
                onClick={() => setPage(current + 1)}
              >
                {t("factorial.geometry.next")}
              </button>
            </div>
          </details>
        )}
        {!report &&
          exportTable(
            "optimal-model-observations",
            observationHeader,
            observationRows.map((row) =>
              row.map((cell) => (typeof cell === "object" ? value(cell) : cell)),
            ),
            t("optimalModel.observations"),
          )}
        {fit.excluded.length > 0 && (
          <p role="note">
            {t("optimalModel.excluded", {
              ids: fit.excluded.map((row) => row.observationId).join(", "),
            })}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
      <div data-section="charts">
        {(report ? [true, false] : [false, true]).map((residual) => (
          <ChartFigure
            key={String(residual)}
            recordId={record?.id ?? null}
            testId={residual ? "optimal-model-residuals" : "optimal-model-fit"}
            screenSvg={scatterChart(charts(residual, false), "css", format)}
            exportSvg={scatterChart(charts(residual, true), "static", format)}
            pngMetadata={metadataText}
            fileBase={residual ? "modelo-otimo-residuos" : "modelo-otimo-ajuste"}
          />
        ))}
      </div>
    </>
  );
}
