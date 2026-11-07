import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { optimalVarianceChart } from "../../services/charts/optimalVariance";
import type { OptimalDesignRecord, Revision, SurfaceResult } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";
import { buildOptimalVariancePresentation } from "../design/optimalVariancePresentation";
import { ChartFigure } from "./ChartFigure";
import { useFigureFormat } from "./useFigureFormat";
import { useResultMetadata } from "./useResultMetadata";

function matchesSurfaceDesign(
  design: OptimalDesignRecord,
  surface: SurfaceResult,
  revision: Revision,
): boolean {
  const { factors, categories, blocks } = design.result.spec;
  if (
    categories ||
    factors.length !== surface.ranges.length ||
    design.blockFactorId !== surface.block?.context.factorId
  )
    return false;
  const indexes = factors.map((factor) =>
    revision.data.factors.findIndex((f) => f.id === factor.id),
  );
  if (
    indexes.includes(-1) ||
    !factors.every((factor) => surface.ranges.some((r) => r.id === factor.id))
  )
    return false;
  const rowIds = new Set(design.rowIds);
  if (surface.fit.observations.some((row) => !row.observationId || !rowIds.has(row.observationId)))
    return false;
  const rows = new Map(revision.data.rows.map((row) => [row.id, row]));
  const blockIndex = revision.data.factors.findIndex(
    (factor) => factor.id === design.blockFactorId,
  );
  return design.result.runs.every((run, i) => {
    const row = rows.get(design.rowIds[i] ?? "");
    return (
      row &&
      (!blocks || row.factors[blockIndex] === blocks.labels[run.block ?? -1]) &&
      indexes.every((column, j) => {
        const parsed = parseNumberCell(row.factors[column] ?? "");
        return parsed.ok && parsed.value === run.real[j];
      })
    );
  });
}

/** Attach only a stored profile belonging to the design of this saved analysis. */
export function OptimalVarianceReport({
  signature,
  language,
  surface,
}: {
  signature: string;
  language: Language;
  surface?: SurfaceResult;
}) {
  const { t } = useTranslation();
  const { t: reportText } = useTranslation("results", { keyPrefix: "optimalVarianceReport" });
  const state = useProject();
  const { record, revision } = useResultMetadata(signature);
  const format = useFigureFormat(language);
  if (!record || !revision) return null;
  const design = surface
    ? [...state.optimalDesigns]
        .reverse()
        .find((item) => matchesSurfaceDesign(item, surface, revision))
    : state.optimalDesigns.find((item) => item.id === record.options.optimalDesignId);
  if (!design) return null;
  const candidates = state.optimalVariances.filter((profile) => profile.designId === design.id);
  const selection = state.optimalArtifactSelection?.varianceByDesign[design.id];
  const profile = candidates.find((item) => item.id === selection) ?? candidates.at(-1);
  if (!profile) return null;
  const value = profile.result;
  const { fds, spatial, metadata, pointBlockName, scaleKey, scaleLabel } =
    buildOptimalVariancePresentation({
      design: design.result,
      value,
      preference: profile.view,
      designId: design.id,
      profileId: profile.id,
      revisionId: profile.revisionId,
      t,
      format,
    });
  return (
    <section data-testid="optimal-variance-report">
      <div
        data-report-keep-together={
          value.curves.every((curve) => pointBlockName(curve.block).length <= 80) ? "" : undefined
        }
      >
        <h3>{t("optimalVariance.title")}</h3>
        <p>{reportText("scope")}</p>
        <p>
          {reportText("source", {
            design: design.id,
            profile: profile.id,
            revision: profile.revisionId,
            version: value.provenance.methodVersion,
          })}
        </p>
        <table className="results-table">
          <caption>{reportText("summary", { scale: scaleLabel })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("optimalVariance.distribution")}</th>
              <th scope="col">{t("optimalVariance.minimum")}</th>
              <th scope="col">{t("optimalVariance.average")}</th>
              <th scope="col">{t("optimalVariance.maximum")}</th>
            </tr>
          </thead>
          <tbody>
            {value.curves.map((curve) => (
              <tr key={curve.block ?? "all"}>
                <th scope="row">{pointBlockName(curve.block)}</th>
                <td className="num">{format(curve.minimum[scaleKey])}</td>
                <td className="num">{format(curve.average[scaleKey])}</td>
                <td className="num">{format(curve.maximum[scaleKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {[fds, spatial].map((figure) =>
        figure?.points.length ? (
          <ChartFigure
            key={figure.id}
            recordId={profile.id}
            testId={figure.id}
            screenSvg={optimalVarianceChart(figure, "css", format)}
            exportSvg={optimalVarianceChart(figure, "static", format)}
            pngMetadata={metadata}
            fileBase={figure.id}
          />
        ) : null,
      )}
      {design.result.spec.factors.length > 0 && !spatial && (
        <p>{t("optimalVariance.emptySlice")}</p>
      )}
      <p>{reportText("sourceData")}</p>
    </section>
  );
}
