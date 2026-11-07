// Resultado dos procedimentos de comparação múltipla (Games–Howell, Dunnett, Bonferroni, Holm,
// Kruskal–Wallis/Dunn): teste global, grupos, comparações, letras e gráfico de médias.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import { meansChart } from "../../services/charts";
import type { ProcedureResult, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { useProject } from "../../state/ProjectContext";
import { ChartFigure } from "./ChartFigure";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";
import { slug, useResultMetadata } from "./useResultMetadata";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function ProcedureResults({
  result,
  signature,
  language,
}: {
  result: ProcedureResult;
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
  const knownAffected =
    result.provenance.methodVersion < 2 &&
    result.pairs.some((p) => p.pValue.status !== "defined" && p.pAdjusted.status === "defined");
  const responseName = response?.name || "";
  const kind = result.procedure.type;
  const text = (s: Stat, digits = 4) =>
    s.status === "defined"
      ? formatSignificant(s.value, language, digits)
      : t(`undefinedReason.${s.reason}`);
  const num = (s: Stat, digits = 4) => <StatNumber stat={s} language={language} digits={digits} />;
  const pText = (s: Stat) => <StatNumber stat={s} language={language} p />;

  const name = (i: number) => result.groups[i]?.label ?? String(i);
  const letters = result.letters?.letters ?? [];
  const isRank = kind === "kruskalDunn";
  const base = `${slug(state.name)}-${slug(responseName)}-${slug(kind)}`;
  const g = result.globalTest;

  const groupHeader = [
    "group",
    "n",
    "mean",
    "sd",
    "median",
    ...(isRank ? ["mean_rank"] : []),
    ...(letters.length ? ["letters"] : []),
  ];
  const groupRows = result.groups.map((grp, i) => [
    grp.label,
    grp.n,
    val(grp.mean),
    val(grp.sd),
    val(grp.median),
    ...(isRank ? [val(grp.meanRank)] : []),
    ...(letters.length ? [letters[i] ?? ""] : []),
  ]);
  const pairHeader = [
    "group_a",
    "group_b",
    "difference",
    "std_error",
    "statistic",
    "df",
    "p_value",
    "p_adjusted",
    "ci_lower",
    "ci_upper",
    "significant",
  ];
  const pairRows = result.pairs.map((p) => [
    name(p.groupA),
    name(p.groupB),
    val(p.difference),
    val(p.stdError),
    val(p.statistic),
    val(p.df),
    val(p.pValue),
    val(p.pAdjusted),
    val(p.ciLower),
    val(p.ciUpper),
    p.significant === null ? "" : String(p.significant),
  ]);

  const chartSpec = (withMetadata: boolean) => ({
    id: "procedure-means",
    title: t("procedure.chart.title", { response: responseName }),
    description: t("procedure.chart.description"),
    yLabel: `${responseName}${response?.unit ? ` [${response.unit}]` : ""}`,
    uncertaintyName: t("procedure.chart.sd"),
    lettersLegend: letters.length
      ? t("procedure.chart.letters", { alpha: formatSignificant(result.alpha, language, 4) })
      : "",
    groups: result.groups.map((grp, i) => {
      const mean = val(grp.mean);
      const sd = val(grp.sd);
      return {
        label: grp.label,
        n: grp.n,
        mean,
        lower: sd === null || mean === null ? null : mean - sd,
        upper: sd === null || mean === null ? null : mean + sd,
        letters: letters[i] ?? "",
      };
    }),
    metadata: withMetadata ? metadataText : undefined,
  });

  return (
    <>
      <div data-section="summary">
        {knownAffected && (
          <p role="note" className="validation-warning">
            {t("factorial.geometry.legacyWarning")}
          </p>
        )}
        <section
          className="panel"
          aria-labelledby="procedure-title"
          data-testid="procedure-summary"
        >
          <h3 id="procedure-title">{t(`procedure.names.${kind}`)}</h3>
          <p>{t(`procedure.explain.${kind}`)}</p>
          <p data-testid="procedure-global">
            {t(`procedure.global.${g.name}`, {
              stat: text(g.statistic, 5),
              df1: text(g.df1, 4),
              df2: text(g.df2, 4),
              p: g.pValue.status === "defined" ? formatP(g.pValue.value, language) : text(g.pValue),
            })}
          </p>
          {result.control !== null && (
            <p className="muted small">
              {t("procedure.controlNote", { control: name(result.control) })}
            </p>
          )}
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
        <section
          className="grid-scroll procedure-table-scroll"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Permite rolar a tabela pelo teclado.
          tabIndex={0}
          aria-label={t("procedure.groups")}
        >
          <table className="results-table" data-testid="procedure-groups">
            <caption>{t("procedure.groups")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("procedure.cols.group")}</th>
                <th scope="col">n</th>
                <th scope="col">{t("procedure.cols.mean")}</th>
                <th scope="col">{t("procedure.cols.sd")}</th>
                <th scope="col">{t("procedure.cols.median")}</th>
                {isRank && <th scope="col">{t("procedure.cols.meanRank")}</th>}
                {letters.length > 0 && <th scope="col">{t("procedure.cols.letters")}</th>}
              </tr>
            </thead>
            <tbody>
              {result.groups.map((grp, i) => (
                <tr key={grp.label}>
                  <th scope="row">{grp.label}</th>
                  <td className="num">{grp.n}</td>
                  <td className="num">{num(grp.mean)}</td>
                  <td className="num">{num(grp.sd)}</td>
                  <td className="num">{num(grp.median)}</td>
                  {isRank && <td className="num">{num(grp.meanRank)}</td>}
                  {letters.length > 0 && (
                    <td data-testid={`procedure-letters-${i}`}>{letters[i]}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section
          className="grid-scroll procedure-table-scroll"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Permite rolar a tabela pelo teclado.
          tabIndex={0}
          aria-label={t("procedure.pairs")}
        >
          <table className="results-table" data-testid="procedure-pairs">
            <caption>{t("procedure.pairs")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("procedure.cols.comparison")}</th>
                <th scope="col">
                  {t(isRank ? "procedure.cols.rankDifference" : "procedure.cols.difference")}
                </th>
                <th scope="col">{t("procedure.cols.stdError")}</th>
                <th scope="col">{t("procedure.cols.statistic")}</th>
                <th scope="col">{t("procedure.cols.p")}</th>
                <th scope="col">{t("procedure.cols.pAdjusted")}</th>
                <th scope="col">{t("procedure.cols.result")}</th>
              </tr>
            </thead>
            <tbody>
              {result.pairs.map((p) => (
                <tr key={`${p.groupA}-${p.groupB}`}>
                  <th scope="row">{`${name(p.groupA)} − ${name(p.groupB)}`}</th>
                  <td className="num">{num(p.difference)}</td>
                  <td className="num">{num(p.stdError)}</td>
                  <td className="num">{num(p.statistic)}</td>
                  <td className="num">{pText(p.pValue)}</td>
                  <td className="num">{pText(p.pAdjusted)}</td>
                  <td>
                    {p.significant === null
                      ? "—"
                      : p.significant
                        ? t("procedure.different")
                        : t("procedure.notDetected")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="muted small" data-report-skip>
          {t("procedure.pairsHelp")}
        </p>
        <div className="row">
          <TableExportButtons
            label={t("procedure.export.groupsCsv")}
            suffix="grupos"
            sheet={t("procedure.groups")}
            header={groupHeader}
            rows={groupRows}
            metadata={exportMeta}
            fileBase={`${base}-grupos`}
            onDone={setNotice}
          />
          <TableExportButtons
            label={t("procedure.export.pairsCsv")}
            suffix="comparacoes"
            sheet={t("procedure.pairs")}
            header={pairHeader}
            rows={pairRows}
            metadata={exportMeta}
            fileBase={`${base}-comparacoes`}
            onDone={setNotice}
          />
        </div>
        {notice && (
          <p role="status" className="muted small">
            {notice}
          </p>
        )}
      </div>

      <div data-section="charts">
        <ChartFigure
          testId="procedure-chart"
          screenSvg={meansChart(chartSpec(false), "css", fmt)}
          exportSvg={meansChart(chartSpec(true), "static", fmt)}
          pngMetadata={metadataText}
          fileBase={`${base}-medias`}
        />
      </div>
    </>
  );
}
