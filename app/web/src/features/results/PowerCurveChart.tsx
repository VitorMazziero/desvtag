import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { powerCurveChart } from "../../services/charts/powerCurve";
import type { PowerRecord } from "../../services/engine";
import { ChartFigure } from "./ChartFigure";
import { familyExportMetadata } from "./familyExportMetadata";
import { useFigureFormat } from "./useFigureFormat";
export function PowerCurveChart({ record, language }: { record: PowerRecord; language: Language }) {
  const { t } = useTranslation();
  const format = useFigureFormat(language);
  if (record.result.curve.length === 0 && !record.result.simulation) {
    return <p className="muted">{t("power.curveUnavailable")}</p>;
  }
  const kind = record.input.design.type;
  const xLabel = t(
    kind === "anova" || kind === "twoSampleT"
      ? "powerAdvanced.axisNPerGroup"
      : kind === "pairedT"
        ? "powerAdvanced.axisPairs"
        : kind === "oneSampleT"
          ? "powerAdvanced.axisUnits"
          : `powerAdvanced.axes.${kind}`,
  );
  const metadata = JSON.stringify({ ...familyExportMetadata(record), result: record.result });
  const spec = {
    id: "power-chart",
    title: `${t("powerAdvanced.curveTitle")} — ${t(`power.designs.${kind}`)}`,
    xLabel,
    yLabel: t("power.power"),
    analyticLabel: t("powerAdvanced.analyticLegend"),
    simulationLabel: t("powerAdvanced.mcLegend"),
    targetLabel: t("power.target"),
    result: record.result,
    ...(record.input.goal.type === "sampleSizeFor" ? { target: record.input.goal.power } : {}),
    metadata,
  };
  return (
    <>
      <ChartFigure
        testId="power-chart"
        screenSvg={powerCurveChart(spec, "css", format)}
        exportSvg={powerCurveChart(spec, "static", format)}
        pngMetadata={metadata}
        fileBase="power-curve"
      />
      <p className="muted small">{t("powerAdvanced.curveNote")}</p>
    </>
  );
}
