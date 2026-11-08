import type { TFunction } from "i18next";
import type { VariancePlotSpec } from "../../services/charts/optimalVariance";
import type { GeneratedOptimal, OptimalVariance, OptimalVarianceView } from "../../services/engine";

interface Input {
  design: GeneratedOptimal;
  value: OptimalVariance | null;
  preference?: OptimalVarianceView;
  designId?: string;
  profileId?: string;
  revisionId?: string;
  t: TFunction;
  format: (value: number) => string;
}

/** Present the stored geometry with the same scale, slice and provenance on screen and in reports. */
export function buildOptimalVariancePresentation({
  design,
  value,
  preference,
  designId,
  profileId,
  revisionId,
  t,
  format,
}: Input) {
  const factors = design.spec.factors;
  const scaled = preference?.scaled ?? true;
  const distributionBlock = preference?.distributionBlock;
  const distribution =
    distributionBlock !== undefined &&
    value?.curves.some((curve) => curve.block === distributionBlock)
      ? String(distributionBlock)
      : "all";
  const mapBlock =
    design.spec.blocks?.labels[preference?.mapBlock ?? 0] !== undefined
      ? (preference?.mapBlock ?? 0)
      : 0;
  const x = factors[preference?.axes[0] ?? 0] ? (preference?.axes[0] ?? 0) : 0;
  const savedY = preference?.axes[1] ?? 1;
  const y = factors[savedY] && savedY !== x ? savedY : x === 0 ? 1 : 0;
  const fixed = preference?.fixed ?? {};
  const categorySlice = JSON.stringify(preference?.categorySlice ?? []);
  const view: OptimalVarianceView = {
    scaled,
    distributionBlock: distribution === "all" ? undefined : Number(distribution),
    mapBlock,
    axes: [x, y],
    fixed,
    categorySlice: preference?.categorySlice ?? [],
  };
  const scaleKey: "scaled" | "relative" = scaled ? "scaled" : "relative";
  const curve = value?.curves.find((curve) =>
    distribution === "all" ? curve.block === undefined : curve.block === Number(distribution),
  );
  const selectedCurve = curve ?? value?.curves[0];
  const blockName = (block: number | undefined) =>
    block === undefined
      ? t("optimalVariance.all")
      : (design.spec.blocks?.labels[block] ?? String(block + 1));
  const pointBlockName = (block: number | undefined) =>
    design.spec.blocks ? blockName(block) : t("optimalVariance.unblockedShort");
  const scaleLabel = t(scaled ? "optimalVariance.scaled" : "optimalVariance.relative");
  const categoryFactors = design.spec.categories?.factors ?? [];
  const tupleKeys = [
    ...new Set(value?.points.map((point) => JSON.stringify(point.categories ?? [])) ?? []),
  ];
  const selectedTuple = tupleKeys.includes(categorySlice) ? categorySlice : tupleKeys[0];
  const tupleDescription = (key: string | undefined) => {
    const labels: string[] = key ? JSON.parse(key) : [];
    return labels.map((label, i) => `${categoryFactors[i]?.name}: ${label}`).join("; ");
  };
  const context =
    (design.spec.blocks
      ? `${t("optimalVariance.blockContext")} ${blockName(mapBlock)}`
      : t("optimalVariance.unblocked")) +
    (categoryFactors.length ? `; ${tupleDescription(selectedTuple)}` : "");
  const definitions = t("optimalVariance.definition");
  const figureDefinition =
    t("optimalVariance.figureDefinition", {
      runs: value?.runs,
      model: t(`design.optimal.models.${design.spec.model}`),
    }) + (categoryFactors.length ? ` ${t("design.optimal.categories.measure")}` : "");
  const metadata = JSON.stringify({
    method: value?.provenance,
    designId,
    profileId,
    revision: revisionId,
    request: value?.request,
    scale: scaleKey,
    distribution,
    axes: [x, y],
    fixed,
    mapBlock,
    categorySlice: selectedTuple,
  });
  const fds: VariancePlotSpec | undefined = selectedCurve
    ? {
        id: "optimal-variance-fds",
        title: t("optimalVariance.fdsTitle"),
        description: `${definitions} ${blockName(selectedCurve.block)}`,
        xLabel: t("optimalVariance.fraction"),
        yLabel: scaleLabel,
        legend: `${figureDefinition} ${t("optimalVariance.fdsLegend", { count: selectedCurve.quantiles.length, block: blockName(selectedCurve.block) })}`,
        kind: "distribution",
        metadata,
        points: selectedCurve.quantiles.map((q) => ({
          x: q.fraction,
          y: q.value[scaleKey],
          value: q.value[scaleKey],
          label: `${q.point + 1}; ${blockName(q.block)}`,
        })),
      }
    : undefined;
  const axisName = (i: number) => `z${i + 1} — ${factors[i]?.name ?? ""}`;
  const fixedIndexes = factors
    .map((_, i) => i)
    .filter((i) => i !== x && (factors.length === 1 || i !== y));
  const levelsByFactor = factors.map((_, i) =>
    [
      ...new Set(
        value?.points.map((p) => p.coded[i]).filter((v): v is number => v !== undefined) ?? [],
      ),
    ].sort((a, b) => a - b),
  );
  const levels = (i: number) => levelsByFactor[i] ?? [];
  const fixedAt = (i: number) => {
    const available = levels(i),
      requested = fixed[i];
    return requested !== undefined && available.includes(requested)
      ? requested
      : available.includes(0)
        ? 0
        : (available[0] ?? 0);
  };
  const slice =
    value?.points.filter(
      (point) =>
        (!categoryFactors.length || JSON.stringify(point.categories ?? []) === selectedTuple) &&
        fixedIndexes.every((i) => point.coded[i] === fixedAt(i)),
    ) ?? [];
  const mapCurve = value?.curves.find((curve) => curve.block === mapBlock) ?? value?.curves[0];
  const spatial: VariancePlotSpec | undefined =
    mapCurve && slice.length
      ? {
          id: "optimal-variance-spatial",
          title: t(
            factors.length === 1 ? "optimalVariance.curveTitle" : "optimalVariance.mapTitle",
          ),
          description: `${context}. ${definitions}`,
          xLabel: axisName(x),
          yLabel: factors.length === 1 ? scaleLabel : axisName(y),
          legend: `${figureDefinition} ${t(factors.length === 1 ? "optimalVariance.curveLegend" : "optimalVariance.spatialLegend", { scale: scaleLabel })} ${context}. ${fixedIndexes.map((i) => `${axisName(i)}=${format(fixedAt(i))}`).join("; ")}`,
          kind: factors.length === 1 ? "curve" : "map",
          metadata,
          colorDomain: [mapCurve.minimum[scaleKey], mapCurve.maximum[scaleKey]],
          points: slice.flatMap((point) => {
            const px = point.coded[x],
              varianceValue = point.values[mapBlock]?.[scaleKey];
            const py = factors.length === 1 ? varianceValue : point.coded[y];
            if (px === undefined || py === undefined || varianceValue === undefined) return [];
            return [
              {
                x: px,
                y: py,
                value: varianceValue,
                label: `${point.real.map((v, i) => `${factors[i]?.name}=${format(v)}`).join("; ")}; ${context}; ${scaleLabel}=${format(varianceValue)}`,
              },
            ];
          }),
        }
      : undefined;
  return {
    view,
    scaleKey,
    scaleLabel,
    distribution,
    mapBlock,
    x,
    y,
    fixed,
    selectedCurve,
    pointBlockName,
    factors,
    categoryFactors,
    tupleKeys,
    selectedTuple,
    tupleDescription,
    fixedIndexes,
    levels,
    fixedAt,
    definitions,
    metadata,
    fds,
    spatial,
  };
}
