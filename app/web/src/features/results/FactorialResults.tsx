// Resultado da ANOVA multifatorial (com blocos): tabela de ANOVA, médias marginais com
// comparações e letras, contrastes e gráfico de médias marginais.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { meansChart } from "../../services/charts";
import type { FactorialResult, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { useProject } from "../../state/ProjectContext";
import { ChartFigure } from "./ChartFigure";
import { FactorialGeometryDetails } from "./FactorialGeometryDetails";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";
import { slug, useResultMetadata } from "./useResultMetadata";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function FactorialResults({
  result,
  signature,
  language,
}: {
  result: FactorialResult;
  signature: string;
  language: Language;
}) {
  const { t } = useTranslation("results");
  const tc = useTranslation("diagnostics").t;
  const state = useProject();
  const { record, revision, metadataText, exportMeta } = useResultMetadata(signature);
  const fmt = useFigureFormat(language);
  const [notice, setNotice] = useState<string | null>(null);
  const responseId = record?.options.responseId ?? (record ? null : state.analysis.responseId);
  const response = (revision?.data.responses ?? (record ? [] : state.responses)).find(
    (r) => r.id === responseId,
  );
  const responseName = response?.name || "";
  const base = `${slug(state.name)}-${slug(responseName)}-anova`;
  const text = (s: Stat, digits = 4) =>
    s.status === "defined"
      ? formatSignificant(s.value, language, digits)
      : t(`undefinedReason.${s.reason}`);
  const num = (s: Stat, digits = 4) => <StatNumber stat={s} language={language} digits={digits} />;
  const pText = (s: Stat) => <StatNumber stat={s} language={language} p />;

  const rows = [...result.terms, result.residual, result.total];
  const anovaHeader = ["term", "df", "sum_squares", "mean_square", "f_value", "p_value"];
  const anovaRows = rows.map((r) => [
    r.term,
    r.df,
    val(r.sumSquares),
    val(r.meanSquare),
    val(r.fValue),
    val(r.pValue),
  ]);
  const partial =
    result.estimability?.terms.some((term) => term.estimableDf < term.nominalDf) ??
    result.issues.some((issue) => issue.code === "anova.empty_cells");
  const significant = result.terms.filter((r) => (val(r.pValue) ?? 1) < result.alpha);
  const knownAffected =
    result.provenance.methodVersion < 2 &&
    (partial ||
      result.marginals.some((m) =>
        m.pairs.some((p) => p.pValue.status !== "defined" && p.pAdjusted.status === "defined"),
      ) ||
      result.contrasts.some(
        (c) => c.pValue.status !== "defined" && c.pAdjusted.status === "defined",
      ));
  const first = result.marginals[0];

  const chartSpec = (withMetadata: boolean) => {
    const m = first;
    return {
      id: "factorial-means",
      title: t("factorial.chart.title", {
        response: responseName,
        factors: m?.factorNames.join(" × ") ?? "",
      }),
      description: t("factorial.chart.description"),
      yLabel: `${responseName}${response?.unit ? ` [${response.unit}]` : ""}`,
      uncertaintyName:
        t("factorial.chart.ci", {
          level: formatSignificant((1 - result.alpha) * 100, language, 4),
        }) + `; n = ${result.n} (${t("figure.nInModel")})`,
      lettersLegend: m?.letters
        ? t("factorial.chart.letters", { alpha: formatSignificant(result.alpha, language, 4) })
        : "",
      groups: (m?.cells ?? []).map((c, i) => ({
        label: c.levels.join(" · "),
        mean: val(c.estimate),
        lower: val(c.ciLower),
        upper: val(c.ciUpper),
        letters: m?.letters?.letters[i] ?? "",
      })),
      metadata: withMetadata ? metadataText : undefined,
    };
  };

  return (
    <>
      <div data-section="summary">
        <section
          className="panel"
          aria-labelledby="factorial-title"
          data-testid="factorial-summary"
        >
          <h3 id="factorial-title">{t("factorial.title")}</h3>
          <p>
            {t("factorial.summary", {
              type: t(`factorial.ssType.${result.ssType}`),
              n: result.n,
              r2: text(result.rSquared),
              adj: text(result.adjustedRSquared),
            })}
          </p>
          {knownAffected && (
            <p role="note" className="validation-warning">
              {t("factorial.geometry.legacyWarning")}
            </p>
          )}
          {partial && <p role="note">{t("factorial.geometry.partialTests")}</p>}
          <p data-testid="factorial-significant">
            {significant.length > 0
              ? t(partial ? "factorial.geometry.significantProjections" : "factorial.significant", {
                  terms: significant.map((s) => s.term).join(", "),
                })
              : t(
                  result.residual.df === 0
                    ? "factorial.geometry.noInference"
                    : "factorial.noneSignificant",
                )}
          </p>
          {result.issues.filter((i) => i.severity !== "info").length > 0 && (
            <ul className="facts-list" role="note">
              {result.issues
                .filter((i) => i.severity !== "info")
                .map((issue) => (
                  <li key={issue.code + JSON.stringify(issue.params)}>{issueMessage(tc, issue)}</li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <div data-section="tables">
        {result.estimability && (
          <FactorialGeometryDetails
            key={signature}
            geometry={result.estimability}
            language={language}
            recordId={record?.id ?? null}
            metadata={exportMeta}
          />
        )}
        <div className="grid-scroll">
          <table className="results-table" data-testid="factorial-anova">
            <caption>{t("factorial.anova")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("factorial.cols.term")}</th>
                <th scope="col">{t("factorial.cols.df")}</th>
                <th scope="col">{t("factorial.cols.ss")}</th>
                <th scope="col">{t("factorial.cols.ms")}</th>
                <th scope="col">F</th>
                <th scope="col">{t("factorial.cols.p")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.term}>
                  <th scope="row">{r.isBlock ? `${r.term} (${t("factorial.block")})` : r.term}</th>
                  <td className="num">{r.df}</td>
                  <td className="num">{num(r.sumSquares)}</td>
                  <td className="num">{num(r.meanSquare)}</td>
                  <td className="num">{num(r.fValue)}</td>
                  <td className="num">{pText(r.pValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          <TableExportButtons
            label={t("factorial.export.anovaCsv")}
            suffix="anova"
            sheet={t("factorial.anova")}
            header={anovaHeader}
            rows={anovaRows}
            metadata={exportMeta}
            fileBase={base}
            onDone={setNotice}
          />
        </div>

        {result.marginals.map((m) => {
          const names = m.factorNames.join(" × ");
          const cellRows = m.cells.map((c, i) => [
            c.levels.join(" · "),
            val(c.estimate),
            val(c.stdError),
            val(c.ciLower),
            val(c.ciUpper),
            m.letters?.letters[i] ?? "",
          ]);
          const pairRows = m.pairs.map((p) => [
            m.cells[p.cellA]?.levels.join(" · ") ?? "",
            m.cells[p.cellB]?.levels.join(" · ") ?? "",
            val(p.difference),
            val(p.stdError),
            val(p.tValue),
            p.df,
            val(p.pValue),
            val(p.pAdjusted),
          ]);
          return (
            <section
              key={m.factors.join("|")}
              aria-label={names}
              data-testid={`marginal-${m.factors.join("-")}`}
            >
              <h4>{t("factorial.marginal", { factors: names })}</h4>
              {!m.cells.some((cell) => cell.estimate.status === "defined") && (
                <p role="note">{t("factorial.geometry.noMeans")}</p>
              )}
              <div className="grid-scroll">
                <table className="results-table">
                  <caption>
                    {t("factorial.marginalCaption", {
                      adjustment: t(`factorial.adjustment.${m.adjustment}`),
                    })}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{names}</th>
                      <th scope="col">{t("factorial.cols.estimate")}</th>
                      <th scope="col">{t("factorial.cols.se")}</th>
                      <th scope="col">{t("factorial.cols.ci")}</th>
                      {m.letters && <th scope="col">{t("factorial.cols.letters")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {m.cells.map((c, i) => (
                      <tr key={c.levels.join("|")}>
                        <th scope="row">{c.levels.join(" · ")}</th>
                        <td className="num">{num(c.estimate)}</td>
                        <td className="num">{num(c.stdError)}</td>
                        <td className="num">
                          {num(c.ciLower)} – {num(c.ciUpper)}
                        </td>
                        {m.letters && <td>{m.letters.letters[i]}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid-scroll">
                <table
                  className="results-table"
                  data-testid={`marginal-pairs-${m.factors.join("-")}`}
                >
                  <thead>
                    <tr>
                      <th scope="col">{t("procedure.cols.comparison")}</th>
                      <th scope="col">{t("procedure.cols.difference")}</th>
                      <th scope="col">t</th>
                      <th scope="col">{t("procedure.cols.p")}</th>
                      <th scope="col">{t("procedure.cols.pAdjusted")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.pairs.map((p) => (
                      <tr key={`${p.cellA}-${p.cellB}`}>
                        <th scope="row">{`${m.cells[p.cellA]?.levels.join(" · ")} − ${m.cells[p.cellB]?.levels.join(" · ")}`}</th>
                        <td className="num">{num(p.difference)}</td>
                        <td className="num">{num(p.tValue)}</td>
                        <td className="num">{pText(p.pValue)}</td>
                        <td className="num">{pText(p.pAdjusted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row">
                <TableExportButtons
                  label={t("factorial.export.marginalCsv", { factors: names })}
                  suffix={`medias-${slug(names)}`}
                  sheet={names.slice(0, 28)}
                  header={["cell", "estimate", "std_error", "ci_lower", "ci_upper", "letters"]}
                  rows={cellRows}
                  metadata={exportMeta}
                  fileBase={`${base}-medias-${slug(names)}`}
                  onDone={setNotice}
                />
                <TableExportButtons
                  label={t("factorial.export.pairsCsv", { factors: names })}
                  suffix={`comparacoes-${slug(names)}`}
                  sheet={`${names} ${t("procedure.pairs")}`.slice(0, 28)}
                  header={[
                    "cell_a",
                    "cell_b",
                    "difference",
                    "std_error",
                    "t",
                    "df",
                    "p_value",
                    "p_adjusted",
                  ]}
                  rows={pairRows}
                  metadata={exportMeta}
                  fileBase={`${base}-comparacoes-${slug(names)}`}
                  onDone={setNotice}
                />
              </div>
            </section>
          );
        })}

        {result.contrasts.length > 0 && (
          <div className="grid-scroll">
            <table className="results-table" data-testid="factorial-contrasts">
              <caption>{t("factorial.contrasts")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("factorial.cols.contrast")}</th>
                  <th scope="col">{t("factorial.cols.estimate")}</th>
                  <th scope="col">{t("factorial.cols.se")}</th>
                  <th scope="col">t</th>
                  <th scope="col">{t("procedure.cols.p")}</th>
                  <th scope="col">{t("procedure.cols.pAdjusted")}</th>
                  <th scope="col">{t("factorial.cols.ci")}</th>
                </tr>
              </thead>
              <tbody>
                {result.contrasts.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">{c.name}</th>
                    <td className="num">{num(c.estimate)}</td>
                    <td className="num">{num(c.stdError)}</td>
                    <td className="num">{num(c.tValue)}</td>
                    <td className="num">{pText(c.pValue)}</td>
                    <td className="num">{pText(c.pAdjusted)}</td>
                    <td className="num">
                      {num(c.ciLower)} – {num(c.ciUpper)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {notice && (
          <p role="status" className="muted small">
            {notice}
          </p>
        )}
      </div>

      {first?.cells.some((cell) => cell.estimate.status === "defined") && (
        <div data-section="charts">
          <ChartFigure
            testId="factorial-chart"
            screenSvg={meansChart(chartSpec(false), "css", fmt)}
            exportSvg={meansChart(chartSpec(true), "static", fmt)}
            pngMetadata={metadataText}
            fileBase={`${base}-medias`}
          />
        </div>
      )}
    </>
  );
}
