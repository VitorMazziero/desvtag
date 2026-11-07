import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { repeatedProfilesChart } from "../../services/charts/repeatedProfiles";
import type { AdvancedMixedResult } from "../../services/engine";
import { ChartFigure } from "./ChartFigure";
import { useFigureFormat } from "./useFigureFormat";
export function MixedProfileChart({
  result,
  language,
  unitLabel,
  timeLabel,
  responseLabel,
  metadata,
  unitCount,
}: {
  result: AdvancedMixedResult;
  language: Language;
  unitLabel: (id: string) => string;
  timeLabel: (index: number) => string;
  responseLabel: string;
  metadata: string;
  unitCount: number;
}) {
  const { t } = useTranslation();
  const format = useFigureFormat(language);
  const hasIntervals = result.meanProfiles.some(
    ({ inference }) =>
      inference.ciLower.status === "defined" && inference.ciUpper.status === "defined",
  );
  const spec = {
    id: "mixed-profiles",
    title: t("mixedAdvanced.profiles"),
    xLabel: t("mixedAdvanced.time"),
    yLabel: responseLabel,
    note: t(
      hasIntervals ? "mixedAdvanced.profileLegend" : "mixedAdvanced.profileLegendWithoutIntervals",
      {
        units: unitCount,
      },
    ),
    metadata,
    unitCount,
    result,
    unitLabel,
    timeLabel,
  };
  return (
    <ChartFigure
      testId="mixed-profile-chart"
      screenSvg={repeatedProfilesChart(spec, "css", format)}
      exportSvg={repeatedProfilesChart(spec, "static", format)}
      pngMetadata={metadata}
      fileBase="mixed-profiles"
    />
  );
}
