import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { saturationChart } from "../../services/charts/saturation";
import type { CurvePoint } from "../../services/engine";
import { ChartFigure } from "./ChartFigure";
import { useFigureFormat } from "./useFigureFormat";

export function SaturationChart({
  points,
  curve,
  xLabel,
  yLabel,
  label,
  level,
  language,
}: {
  points: Array<{ x: number; y: number }>;
  curve: CurvePoint[];
  xLabel: string;
  yLabel: string;
  label: string;
  level: number;
  language: Language;
}) {
  const { t } = useTranslation();
  const format = useFigureFormat(language);
  if (!curve.length) return null;
  const spec = {
    id: "saturation",
    title: label,
    xLabel,
    yLabel,
    points,
    curve,
    bandLabel: t("saturation.bandLabel", { level: format(level) }),
    pointsLabel: t("saturation.pointsLabel"),
    curveLabel: t("saturation.curveLabel"),
    unavailableLabel: t("saturation.noBand"),
  };
  return (
    <ChartFigure
      testId="saturation-chart"
      screenSvg={saturationChart(spec, "css", format)}
      exportSvg={saturationChart(spec, "static", format)}
      fileBase="saturation"
      pngMetadata={JSON.stringify({ label, xLabel, yLabel, level })}
    />
  );
}
