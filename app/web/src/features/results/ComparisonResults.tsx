// Resultados da comparação de tratamentos de um fator (U08/U09/U16): explicação curta, tabelas,
// gráficos com incerteza nomeada e letras, diagnósticos e exportação com proveniência.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import { boxChart, meansChart, scatterChart } from "../../services/charts";
import type { AnalysisRecord, OneWayResult, Stat } from "../../services/engine";
import { type ExportMetadata, exportMetadata, flat } from "../../services/export";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { ChartFigure } from "./ChartFigure";
import { ComparisonInterpretation } from "./ComparisonInterpretation";
import { AnovaTable, GroupTable, PairTable } from "./ComparisonTables";
import {
  ANOVA_HEADER,
  anovaRows,
  GROUP_HEADER,
  groupRows,
  PAIR_HEADER,
  pairRows,
} from "./comparisonRows";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";

type Uncertainty = "ci" | "sd" | "se";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

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
  result: OneWayResult;
  signature: string;
  language: Language;
}

export function ComparisonResults({ result, signature, language }: Props) {
  const { t } = useTranslation("results");
  const state = useProject();
  const workspace = useWorkspace();
  const [uncertainty, setUncertainty] = useState<Uncertainty>("ci");
  const [notice, setNotice] = useState<string | null>(null);

  const response = state.responses.find((r) => r.id === result.responseId);
  const factor = state.factors.find((f) => f.id === result.factorId);
  const responseName = response?.name || result.responseId;
  const factorName = factor?.name || result.factorId;
  const unit = response?.unit ?? "";

  const record: AnalysisRecord | undefined = [...state.analyses]
    .reverse()
    .find((a) => a.signature === signature);
  const revision = state.revisions.find((r) => r.id === record?.revisionId);
  const metadata: ExportMetadata | null = useMemo(
    () =>
      record
        ? exportMetadata({
            record,
            revisionHash: revision?.contentHash ?? "",
            project: workspace.name,
            experiment: state.name,
            appVersion: "0.1.0",
            now: new Date().toISOString(),
          })
        : null,
    [record, revision, workspace.name, state.name],
  );
  const metadataText = metadata ? JSON.stringify(metadata) : "";
  const fmt = useFigureFormat(language);
  const levelPercent = formatSignificant((1 - result.alpha) * 100, language, 4);

  const meansSpec = (withMetadata: boolean) => ({
    id: "means",
    title: t("comparison.charts.meansTitle", { response: responseName, factor: factorName }),
    description: t("comparison.charts.meansDescription"),
    yLabel: unit ? `${responseName} [${unit}]` : responseName,
    uncertaintyName:
      uncertainty === "ci"
        ? t("comparison.charts.uncertaintyCi", { level: levelPercent })
        : uncertainty === "sd"
          ? t("comparison.charts.uncertaintySd")
          : t("comparison.charts.uncertaintySe"),
    lettersLegend: result.letters
      ? t("comparison.charts.lettersLegend", {
          alpha: formatSignificant(result.alpha, language, 4),
        })
      : "",
    groups: result.groups.map((g, i) => {
      const mean = val(g.mean) ?? 0;
      const [lower, upper] =
        uncertainty === "ci"
          ? [val(g.ciLower), val(g.ciUpper)]
          : uncertainty === "sd"
            ? [val(g.sdLower), val(g.sdUpper)]
            : [val(g.seLower), val(g.seUpper)];
      return { label: g.label, mean, lower, upper, letters: result.letters?.letters[i] ?? "" };
    }),
    metadata: withMetadata ? metadataText : undefined,
  });
  const boxSpec = (withMetadata: boolean) => ({
    id: "box",
    title: t("comparison.charts.boxTitle", { response: responseName, factor: factorName }),
    description: t("comparison.charts.boxDescription"),
    yLabel: unit ? `${responseName} [${unit}]` : responseName,
    legend: t("comparison.charts.boxLegend"),
    groups: result.groups.map((g) => ({ label: g.label, box: g.boxplot })),
    metadata: withMetadata ? metadataText : undefined,
  });
  const residualPoints = result.diagnostics.residuals.flatMap((r) =>
    r.standardized.status === "defined" ? [{ x: r.fitted, y: r.standardized.value }] : [],
  );
  const residualSpec = (withMetadata: boolean) => ({
    id: "residuals",
    title: t("comparison.charts.residualsTitle"),
    description: t("comparison.charts.residualsDescription"),
    xLabel: t("comparison.charts.residualsX"),
    yLabel: t("comparison.charts.residualsY"),
    points: residualPoints,
    reference: "zero" as const,
    legend: t("comparison.charts.residualsLegend"),
    metadata: withMetadata ? metadataText : undefined,
  });
  const qqSpec = (withMetadata: boolean) => ({
    id: "qq",
    title: t("comparison.charts.qqTitle"),
    description: t("comparison.charts.qqDescription"),
    xLabel: t("comparison.charts.qqX"),
    yLabel: t("comparison.charts.qqY"),
    points: result.diagnostics.qq.map((p) => ({ x: p.theoretical, y: p.sample })),
    reference: "quartiles" as const,
    legend: t("comparison.charts.qqLegend"),
    metadata: withMetadata ? metadataText : undefined,
  });

  const base = `${slug(state.name)}-${slug(responseName)}`;
  const exportMeta = metadata ? flat(metadata) : null;
  const bf = result.diagnostics.brownForsythe;
  const farPoints = result.groups.reduce(
    (total, g) => total + (g.boxplot?.outliers.length ?? 0),
    0,
  );
  const hasResiduals = residualPoints.length > 0;

  return (
    <>
      <ComparisonInterpretation
        result={result}
        responseName={responseName}
        factorName={factorName}
        language={language}
      />

      <label className="field">
        <span>{t("comparison.charts.uncertainty")}</span>
        <select value={uncertainty} onChange={(e) => setUncertainty(e.target.value as Uncertainty)}>
          <option value="ci">{t("comparison.charts.ci")}</option>
          <option value="sd">{t("comparison.charts.sd")}</option>
          <option value="se">{t("comparison.charts.se")}</option>
        </select>
      </label>

      <ChartFigure
        testId="means-chart"
        screenSvg={meansChart(meansSpec(false), "css", fmt)}
        exportSvg={meansChart(meansSpec(true), "static", fmt)}
        pngMetadata={metadataText}
        fileBase={`${base}-medias`}
      >
        <p className="muted small">{t("comparison.charts.tableHint")}</p>
      </ChartFigure>

      <GroupTable result={result} factorName={factorName} language={language} />
      <AnovaTable result={result} responseName={responseName} language={language} />
      <p className="muted small">
        {[
          result.effectSizes.etaSquared,
          result.effectSizes.omegaSquared,
          result.effectSizes.cvPercent,
        ].every((s) => s.status === "defined") &&
          `${t("comparison.effects.eta")}: ${formatSignificant(val(result.effectSizes.etaSquared) ?? 0, language, 4)} · ${t("comparison.effects.omega")}: ${formatSignificant(val(result.effectSizes.omegaSquared) ?? 0, language, 4)} · ${t("comparison.effects.cv")}: ${formatSignificant(val(result.effectSizes.cvPercent) ?? 0, language, 4)}%`}
      </p>

      {result.tukey && (
        <details open>
          <summary>{t("comparison.pairs.show")}</summary>
          <PairTable result={result} language={language} />
        </details>
      )}

      <section aria-labelledby="diagnostics-title">
        <h3 id="diagnostics-title">{t("comparison.diagnostics.title")}</h3>
        <p data-testid="brown-forsythe">
          {bf.f.status === "defined" && bf.pValue.status === "defined"
            ? t("comparison.diagnostics.bf", {
                df1: bf.dfBetween,
                df2: bf.dfWithin,
                f: formatSignificant(bf.f.value, language, 5),
                p: formatP(bf.pValue.value, language),
              })
            : t("comparison.diagnostics.bfUndefined")}
        </p>
        {result.diagnostics.sdRatio.status === "defined" && (
          <p>
            {t("comparison.diagnostics.ratio", {
              ratio: formatSignificant(result.diagnostics.sdRatio.value, language, 4),
            })}
          </p>
        )}
        {farPoints > 0 && <p>{t("comparison.diagnostics.outliers", { count: farPoints })}</p>}
        <ChartFigure
          testId="box-chart"
          screenSvg={boxChart(boxSpec(false), "css", fmt)}
          exportSvg={boxChart(boxSpec(true), "static", fmt)}
          pngMetadata={metadataText}
          fileBase={`${base}-boxplot`}
        />
        {hasResiduals && (
          <>
            <ChartFigure
              testId="residuals-chart"
              screenSvg={scatterChart(residualSpec(false), "css", fmt)}
              exportSvg={scatterChart(residualSpec(true), "static", fmt)}
              pngMetadata={metadataText}
              fileBase={`${base}-residuos`}
            />
            <ChartFigure
              testId="qq-chart"
              screenSvg={scatterChart(qqSpec(false), "css", fmt)}
              exportSvg={scatterChart(qqSpec(true), "static", fmt)}
              pngMetadata={metadataText}
              fileBase={`${base}-qq`}
            />
          </>
        )}
      </section>

      <section aria-labelledby="export-title" data-report-skip>
        <h3 id="export-title">{t("comparison.export.title")}</h3>
        <div className="row">
          <TableExportButtons
            label={t("comparison.export.csvAnova")}
            suffix="anova"
            sheet="ANOVA"
            header={ANOVA_HEADER}
            rows={anovaRows(result)}
            metadata={exportMeta}
            fileBase={base}
            onDone={setNotice}
          />
          <TableExportButtons
            label={t("comparison.export.csvGroups")}
            suffix="grupos"
            sheet={t("comparison.export.sheetGroups")}
            header={GROUP_HEADER}
            rows={groupRows(result)}
            metadata={exportMeta}
            fileBase={base}
            onDone={setNotice}
          />
          {result.tukey && (
            <TableExportButtons
              label={t("comparison.export.csvPairs")}
              suffix="pares"
              sheet={t("comparison.export.sheetPairs")}
              header={PAIR_HEADER}
              rows={pairRows(result)}
              metadata={exportMeta}
              fileBase={base}
              onDone={setNotice}
            />
          )}
        </div>
        {notice && (
          <p role="status" className="muted small" data-testid="export-notice">
            {notice}
          </p>
        )}
      </section>
    </>
  );
}
