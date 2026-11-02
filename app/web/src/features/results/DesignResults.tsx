// Resultados da análise de um planejamento de dois níveis (U08/U09/U16): explicação curta,
// efeitos e coeficientes (separados), ANOVA, curvatura, falta de ajuste, Lenth, gráficos de
// triagem e exportação com proveniência.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import { APP_VERSION } from "../../lib/version";
import { effectsChart, paretoChart, scatterChart } from "../../services/charts";
import type { AnalysisRecord, DesignAnalysisResult, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { exportMetadata, flat } from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { ChartFigure } from "./ChartFigure";
import { formatFactParams } from "./ComparisonInterpretation";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

function StatCell({ stat, language, p = false }: { stat: Stat; language: Language; p?: boolean }) {
  const { t } = useTranslation("results");
  if (stat.status === "defined")
    return (
      <td className="num">
        {p ? formatP(stat.value, language) : formatSignificant(stat.value, language, 5)}
      </td>
    );
  return (
    <td className="num undefined" title={t(`undefinedReason.${stat.reason}`)}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">
        {t("table.undefined")}: {t(`undefinedReason.${stat.reason}`)}
      </span>
    </td>
  );
}

function slug(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "analise"
  );
}

interface Props {
  result: DesignAnalysisResult;
  signature: string;
  language: Language;
}

export function DesignResults({ result, signature, language }: Props) {
  const { t } = useTranslation("results");
  const { t: tc } = useTranslation();
  const state = useProject();
  const workspace = useWorkspace();
  const _storage = useStorage();
  const [notice, setNotice] = useState<string | null>(null);

  const response = state.responses.find((r) => r.id === result.responseId);
  const responseName = response?.name || result.responseId;
  const record: AnalysisRecord | undefined = [...state.analyses]
    .reverse()
    .find((a) => a.signature === signature);
  const revision = state.revisions.find((r) => r.id === record?.revisionId);
  const metadata = useMemo(
    () =>
      record
        ? exportMetadata({
            record,
            revisionHash: revision?.contentHash ?? "",
            project: workspace.name,
            experiment: state.name,
            appVersion: APP_VERSION,
            now: new Date().toISOString(),
          })
        : null,
    [record, revision, workspace.name, state.name],
  );
  const metadataText = metadata ? JSON.stringify(metadata) : "";
  const fmt = useFigureFormat(language);
  const level = formatSignificant((1 - result.alpha) * 100, language, 4);
  const alpha = formatSignificant(result.alpha, language, 4);
  const base = `${slug(state.name)}-${slug(responseName)}`;

  // Explicação curta.
  const dfResidual = result.fit.dfResidual;
  const activeFact = result.facts.find((f) => f.key === "design.active_effects");
  const activeTerms = activeFact?.params.terms ?? "";
  const evidence =
    dfResidual > 0
      ? activeFact
        ? t("design.summary.evidenceP", { alpha, active: activeTerms })
        : t("design.summary.evidenceNone", { alpha })
      : result.lenth
        ? activeFact
          ? t("design.summary.evidenceLenth", { active: activeTerms })
          : t("design.summary.evidenceNone", { alpha })
        : t("design.summary.evidenceUnavailable");

  // Séries.
  const names = result.factorNames;
  const paretoSpec = (withMetadata: boolean) => ({
    id: "pareto",
    title: t("design.charts.paretoTitle", { response: responseName }),
    description: t("design.charts.paretoDescription"),
    axisLabel:
      result.pareto.basis === "tStatistic"
        ? t("design.charts.paretoT")
        : t("design.charts.paretoEffect"),
    referenceLabel:
      result.pareto.reference === null
        ? null
        : result.pareto.basis === "tStatistic"
          ? t("design.charts.referenceT", { alpha })
          : t("design.charts.referenceLenth"),
    reference: result.pareto.reference,
    legend:
      result.pareto.basis === "tStatistic"
        ? t("design.charts.paretoLegendT")
        : result.pareto.basis === "lenthEffect"
          ? t("design.charts.paretoLegendLenth")
          : t("design.charts.paretoLegendEffect"),
    bars: result.pareto.bars.map((b) => ({
      label: b.label,
      value: b.value,
      significant: b.significant,
    })),
    metadata: withMetadata ? metadataText : undefined,
  });
  const mainSpec = (withMetadata: boolean) => ({
    id: "main-effects",
    title: t("design.charts.mainTitle", { response: responseName }),
    description: t("design.charts.mainDescription"),
    yLabel: response?.unit ? `${responseName} [${response.unit}]` : responseName,
    lowLabel: t("design.charts.low"),
    highLabel: t("design.charts.high"),
    centerLabel: t("design.charts.center"),
    legend: t("design.charts.mainLegend"),
    panels: result.mainEffects.map((m) => ({
      title: names[m.factor] ?? String(m.factor),
      series: [{ name: names[m.factor] ?? "", low: val(m.lowMean), high: val(m.highMean) }],
      center: m.centerMean,
    })),
    metadata: withMetadata ? metadataText : undefined,
  });
  const interactionSpec = (withMetadata: boolean) => ({
    id: "interactions",
    title: t("design.charts.interactionTitle", { response: responseName }),
    description: t("design.charts.interactionDescription"),
    yLabel: response?.unit ? `${responseName} [${response.unit}]` : responseName,
    lowLabel: t("design.charts.low"),
    highLabel: t("design.charts.high"),
    centerLabel: t("design.charts.center"),
    legend: t("design.charts.interactionLegend"),
    panels: result.interactions.map((i) => {
      const [ll, hl, lh, hh] = i.cellMeans.map(val);
      const a = names[i.factorA] ?? "A";
      const b = names[i.factorB] ?? "B";
      return {
        title: `${a} × ${b}`,
        series: [
          {
            name: t("design.charts.atLevel", { factor: b, level: t("design.charts.low") }),
            low: ll ?? null,
            high: hl ?? null,
          },
          {
            name: t("design.charts.atLevel", { factor: b, level: t("design.charts.high") }),
            low: lh ?? null,
            high: hh ?? null,
            dashed: true,
          },
        ],
        center: null,
      };
    }),
    metadata: withMetadata ? metadataText : undefined,
  });
  const opSpec = (withMetadata: boolean) => ({
    id: "observed-predicted",
    title: t("design.charts.opTitle", { response: responseName }),
    description: t("design.charts.opDescription"),
    xLabel: t("design.charts.opX"),
    yLabel: t("design.charts.opY"),
    points: result.observedVsPredicted.map((p) => ({ x: p.predicted, y: p.observed })),
    reference: "identity" as const,
    legend: t("design.charts.opLegend"),
    metadata: withMetadata ? metadataText : undefined,
  });

  const effectsTable = () => {
    const header = [
      "term",
      "order",
      "coefficient",
      "effect",
      "std_error_effect",
      "t",
      "p_value",
      "ci_lower_effect",
      "ci_upper_effect",
      "lenth_active",
      "aliased_with",
    ];
    const rows = [
      [
        "(Intercept)",
        0,
        val(result.intercept),
        null,
        val(result.interceptStdError),
        null,
        null,
        null,
        null,
        null,
        "",
      ] as (string | number | null)[],
      ...result.effects.map((e) => [
        e.label,
        e.order,
        val(e.coefficient),
        val(e.effect),
        val(e.stdError),
        val(e.tValue),
        val(e.pValue),
        val(e.ciLower),
        val(e.ciUpper),
        e.lenthActive === null ? null : e.lenthActive ? "yes" : "no",
        e.aliasedWith.join(" "),
      ]),
    ];
    return { header, rows };
  };
  const anova = result.anova;
  const hasAliases = result.effects.some((e) => e.aliasedWith.length > 0);

  return (
    <>
      <div data-section="summary">
        <section
          className="panel"
          aria-labelledby="interpretation-title"
          data-testid="interpretation"
        >
          <h3 id="interpretation-title" className="sr-only">
            {t("labels.conclusion")}
          </h3>
          <dl className="interpretation">
            <dt>{t("labels.conclusion")}</dt>
            <dd>
              {t("design.summary.conclusion", {
                n: result.fit.nObservations,
                response: responseName,
                factors: names.length,
                terms: result.effects.length,
              })}
            </dd>
            <dt>{t("labels.evidence")}</dt>
            <dd>{evidence}</dd>
            <dt>{t("labels.nextStep")}</dt>
            <dd>{t("design.summary.nextStep")}</dd>
          </dl>
          <ul className="facts-list">
            {result.facts.map((fact) => (
              <li key={fact.key + JSON.stringify(fact.params)}>
                {t(`facts.${fact.key}`, formatFactParams(fact, language))}
              </li>
            ))}
          </ul>
          {result.issues.filter((i) => i.severity !== "info").length > 0 && (
            <div role="note">
              <h4>{t("comparison.warnings")}</h4>
              <ul className="facts-list">
                {result.issues.map((issue) => (
                  <li key={issue.code + JSON.stringify(issue.params)}>{issueMessage(tc, issue)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div data-section="tables">
        <div className="grid-scroll">
          <table className="results-table" data-testid="effects-table">
            <caption>{t("design.effects.caption", { response: responseName })}</caption>
            <thead>
              <tr>
                <th scope="col">{t("design.effects.term")}</th>
                <th scope="col">{t("design.effects.coefficient")}</th>
                <th scope="col">{t("design.effects.effect")}</th>
                <th scope="col">{t("design.effects.se")}</th>
                <th scope="col">{t("design.effects.t")}</th>
                <th scope="col">{t("design.effects.p")}</th>
                <th scope="col">{t("design.effects.ci", { level })}</th>
                {result.lenth && <th scope="col">{t("design.effects.lenth")}</th>}
                {hasAliases && <th scope="col">{t("design.effects.aliases")}</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t("design.effects.intercept")}</th>
                <StatCell stat={result.intercept} language={language} />
                <td />
                <StatCell stat={result.interceptStdError} language={language} />
                <td />
                <td />
                <td />
                {result.lenth && <td />}
                {hasAliases && <td />}
              </tr>
              {result.effects.map((e) => (
                <tr key={e.label}>
                  <th scope="row">{e.label}</th>
                  <StatCell stat={e.coefficient} language={language} />
                  <StatCell stat={e.effect} language={language} />
                  <StatCell stat={e.stdError} language={language} />
                  <StatCell stat={e.tValue} language={language} />
                  <StatCell stat={e.pValue} language={language} p />
                  <td className="num">
                    {e.ciLower.status === "defined" && e.ciUpper.status === "defined"
                      ? `${formatSignificant(e.ciLower.value, language, 4)} – ${formatSignificant(e.ciUpper.value, language, 4)}`
                      : "—"}
                  </td>
                  {result.lenth && (
                    <td>
                      {e.lenthSimultaneous
                        ? t("design.effects.simultaneous")
                        : e.lenthActive
                          ? t("design.effects.active")
                          : t("design.effects.inactive")}
                    </td>
                  )}
                  {hasAliases && <td>{e.aliasedWith.join(" ")}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">{t("design.effects.help")}</p>

        <div className="grid-scroll">
          <table className="results-table" data-testid="design-anova">
            <caption>{t("design.anova.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("design.anova.source")}</th>
                <th scope="col">{t("design.anova.df")}</th>
                <th scope="col">{t("design.anova.ss")}</th>
                <th scope="col">{t("design.anova.ms")}</th>
                <th scope="col">{t("design.anova.f")}</th>
                <th scope="col">{t("design.anova.p")}</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["model", anova.model],
                  ["residual", anova.residual],
                  ["total", anova.total],
                ] as const
              ).map(([key, row]) => (
                <tr key={key}>
                  <th scope="row">{t(`design.anova.${key}`)}</th>
                  <td className="num">{row.df}</td>
                  <StatCell stat={row.sumSquares} language={language} />
                  <StatCell stat={row.meanSquare} language={language} />
                  {key === "model" ? (
                    <>
                      <StatCell stat={anova.f} language={language} />
                      <StatCell stat={anova.pValue} language={language} p />
                    </>
                  ) : (
                    <>
                      <td />
                      <td />
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          {t("design.anova.r2")}:{" "}
          {val(anova.rSquared) === null
            ? "—"
            : formatSignificant(val(anova.rSquared) ?? 0, language, 5)}{" "}
          · {t("design.anova.r2adj")}:{" "}
          {val(anova.adjustedRSquared) === null
            ? "—"
            : formatSignificant(val(anova.adjustedRSquared) ?? 0, language, 5)}{" "}
          · {t("design.anova.sigma")}:{" "}
          {val(result.fit.residualSd) === null
            ? "—"
            : formatSignificant(val(result.fit.residualSd) ?? 0, language, 5)}
        </p>

        <section aria-labelledby="curv-title">
          <h3 id="curv-title">{t("design.curvature.title")}</h3>
          <p data-testid="curvature">
            {result.curvature && val(result.curvature.difference) !== null
              ? t("design.curvature.text", {
                  difference: formatSignificant(val(result.curvature.difference) ?? 0, language, 5),
                  t:
                    val(result.curvature.tValue) === null
                      ? "—"
                      : formatSignificant(val(result.curvature.tValue) ?? 0, language, 4),
                  p:
                    val(result.curvature.pValue) === null
                      ? "—"
                      : formatP(val(result.curvature.pValue) ?? 0, language),
                  points: result.curvature.centerPoints,
                })
              : t("design.curvature.unavailable")}
          </p>
          {result.lackOfFit && (
            <p data-testid="lack-of-fit">
              <strong>{t("design.lackOfFit.title")}: </strong>
              {val(result.lackOfFit.f) !== null
                ? t("design.lackOfFit.text", {
                    ssPure: formatSignificant(result.lackOfFit.ssPureError, language, 5),
                    dfPure: result.lackOfFit.dfPureError,
                    ssLof: formatSignificant(val(result.lackOfFit.ssLackOfFit) ?? 0, language, 5),
                    dfLof: result.lackOfFit.dfLackOfFit,
                    f: formatSignificant(val(result.lackOfFit.f) ?? 0, language, 5),
                    p: formatP(val(result.lackOfFit.pValue) ?? 0, language),
                  })
                : t("design.lackOfFit.noTest", {
                    ssLof: formatSignificant(val(result.lackOfFit.ssLackOfFit) ?? 0, language, 5),
                    dfLof: result.lackOfFit.dfLackOfFit,
                  })}
            </p>
          )}
          {result.lenth && (
            <p data-testid="lenth">
              <strong>{t("design.lenth.title")}: </strong>
              {t("design.lenth.text", {
                pse: formatSignificant(result.lenth.pse, language, 5),
                df: formatSignificant(result.lenth.df, language, 4),
                me: formatSignificant(result.lenth.marginOfError, language, 5),
                sme: formatSignificant(result.lenth.simultaneousMargin, language, 5),
              })}{" "}
              <span className="muted small">{t("design.lenth.help")}</span>
            </p>
          )}
        </section>
      </div>

      <div data-section="charts">
        {result.pareto.bars.length > 0 && (
          <ChartFigure
            testId="pareto-chart"
            screenSvg={paretoChart(paretoSpec(false), "css", fmt)}
            exportSvg={paretoChart(paretoSpec(true), "static", fmt)}
            pngMetadata={metadataText}
            fileBase={`${base}-pareto`}
          />
        )}
        <ChartFigure
          testId="main-effects-chart"
          screenSvg={effectsChart(mainSpec(false), "css", fmt)}
          exportSvg={effectsChart(mainSpec(true), "static", fmt)}
          pngMetadata={metadataText}
          fileBase={`${base}-efeitos-principais`}
        />
        {result.interactions.length > 0 && (
          <ChartFigure
            testId="interaction-chart"
            screenSvg={effectsChart(interactionSpec(false), "css", fmt)}
            exportSvg={effectsChart(interactionSpec(true), "static", fmt)}
            pngMetadata={metadataText}
            fileBase={`${base}-interacoes`}
          />
        )}
        {result.observedVsPredicted.length > 1 && (
          <ChartFigure
            testId="observed-predicted-chart"
            screenSvg={scatterChart(opSpec(false), "css", fmt)}
            exportSvg={scatterChart(opSpec(true), "static", fmt)}
            pngMetadata={metadataText}
            fileBase={`${base}-observado-predito`}
          />
        )}
      </div>

      <div data-section="tables">
        <section aria-labelledby="export-title" data-report-skip>
          <h3 id="export-title">{t("comparison.export.title")}</h3>
          <div className="row">
            <TableExportButtons
              label={t("design.export.effectsCsv")}
              suffix="efeitos"
              sheet={t("design.effects.term")}
              header={effectsTable().header}
              rows={effectsTable().rows}
              metadata={metadata ? flat(metadata) : null}
              fileBase={base}
              onDone={setNotice}
            />
          </div>
          {notice && (
            <p role="status" className="muted small" data-testid="export-notice">
              {notice}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
