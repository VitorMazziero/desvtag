// U09 — superfície 3D e contorno da resposta predita. A malha, a região e a extrapolação vêm do
// motor (`surfaceGrid`); aqui só há a escolha dos eixos, dos valores fixados e o desenho.
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { contourChart, surface3dChart, type View3d } from "../../services/charts";
import type { SurfaceGrid, SurfaceResult } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useStorage } from "../../services/storage/context";
import { useProject } from "../../state/ProjectContext";
import { buildDataset, buildSurfaceRequest } from "../analysis";
import { ChartFigure } from "./ChartFigure";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";

interface Props {
  result: SurfaceResult;
  responseName: string;
  responseUnit: string;
  language: Language;
  metadataText: string;
  fileBase: string;
  /** Metadados (chave → valor) gravados no CSV da malha. */
  csvMetadata: Record<string, string>;
}

const STEPS = [21, 31, 41, 61];

export function SurfaceView({
  result,
  responseName,
  responseUnit,
  language,
  metadataText,
  fileBase,
  csvMetadata,
}: Props) {
  const { t } = useTranslation("results");
  const { t: tc } = useTranslation();
  const state = useProject();
  const { client } = useEngine();
  const instance = useId();
  const fmt = useFigureFormat(language);
  const _storage = useStorage();
  const ranges = result.ranges;
  const [xIndex, setXIndex] = useState(0);
  const [yIndex, setYIndex] = useState(Math.min(1, ranges.length - 1));
  const [fixedText, setFixedText] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState(31);
  const [view, setView] = useState<View3d>({ azimuth: 35, elevation: 30 });
  const [grid, setGrid] = useState<SurfaceGrid | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const x = ranges[xIndex];
  const y = ranges[yIndex];
  const fixedFactors = ranges.filter((_, i) => i !== xIndex && i !== yIndex);
  const fixedValues = fixedFactors.map((r) => {
    const text = fixedText[r.id];
    return { id: r.id, value: text === undefined ? r.center : Number(text.replace(",", ".")) };
  });
  const fixedValid = fixedValues.every((f) => Number.isFinite(f.value));
  const key = JSON.stringify([xIndex, yIndex, steps, fixedValues]);

  // Pontos do planejamento, na escala real dos dois eixos.
  const points = useMemo(() => {
    const { dataset } = buildDataset(state);
    const xi = dataset.factors.findIndex((f) => f.id === x?.id);
    const yi = dataset.factors.findIndex((f) => f.id === y?.id);
    return dataset.observations.flatMap((o) => {
      const px = o.factors[xi];
      const py = o.factors[yi];
      return typeof px === "number" && typeof py === "number" ? [{ x: px, y: py }] : [];
    });
  }, [state, x?.id, y?.id]);

  // `key` resume os valores que definem a malha (eixos, resolução e valores fixados).
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependências resumidas em `key`
  useEffect(() => {
    if (!x || !y || xIndex === yIndex || !fixedValid) return;
    const responseId = result.responseId;
    const { dataset } = buildDataset(state);
    const surface = buildSurfaceRequest(state, dataset, responseId);
    surface.alpha = result.alpha;
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      client
        .request(
          {
            type: "surfaceGrid",
            surface,
            xFactor: x.id,
            yFactor: y.id,
            fixed: fixedValues.map((f) => ({ factorId: f.id, value: f.value })),
            stepsX: steps,
            stepsY: steps,
            contourLevels: 8,
          },
          { channel: `surface-grid-${instance}` },
        )
        .then((response) => {
          if (!live) return;
          if (response.outcome.status === "ok" && response.outcome.result.type === "surfaceGrid") {
            const { type: _type, ...rest } = response.outcome.result;
            setGrid(rest as SurfaceGrid);
            setProblems([]);
          } else if (response.outcome.status === "error") {
            setProblems(engineErrorMessages(tc, response.outcome.error));
          }
        })
        .catch(() => {
          if (live) setProblems([t("surface.view.failed")]);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [client, key, result]);

  if (ranges.length < 2) return <p className="muted">{t("surface.view.needTwo")}</p>;
  const label = responseUnit ? `${responseName} [${responseUnit}]` : responseName;
  const spec = (id: string, withMetadata: boolean, kind: "contour" | "surface") =>
    grid
      ? {
          id,
          title: t(kind === "contour" ? "surface.view.contourTitle" : "surface.view.surfaceTitle", {
            response: responseName,
          }),
          description: t(
            kind === "contour"
              ? "surface.view.contourDescription"
              : "surface.view.surfaceDescription",
          ),
          grid,
          responseLabel: label,
          points: kind === "contour" ? points : undefined,
          texts: {
            extrapolated: t("surface.view.extrapolated"),
            points: t("surface.view.points"),
            reading: t(
              kind === "contour" ? "surface.view.readingContour" : "surface.view.readingSurface",
            ),
          },
          metadata: withMetadata ? metadataText : undefined,
        }
      : null;

  const gridTable = () => {
    if (!grid)
      return {
        header: [] as string[],
        rows: [] as (string | number | null)[][],
        meta: csvMetadata,
      };
    const header = [grid.xName, grid.yName, responseName, "extrapolation"];
    const rows = grid.y.flatMap((yv, iy) =>
      grid.x.map((xv, ix) => {
        const cell = grid.z[iy]?.[ix];
        return [
          xv,
          yv,
          cell && cell.status === "defined" ? cell.value : null,
          grid.extrapolated[iy]?.[ix] ? "yes" : "no",
        ];
      }),
    );
    const fixed = Object.fromEntries(grid.fixed.map((f) => [`fixed_${f.name}`, String(f.value)]));
    return { header, rows, meta: { ...csvMetadata, ...fixed } };
  };

  const contourSpec = spec("surface-contour", false, "contour");
  const contourExport = spec("surface-contour", true, "contour");
  const surfaceSpec = spec("surface-3d", false, "surface");
  const surfaceExport = spec("surface-3d", true, "surface");

  return (
    <section
      aria-labelledby="surface-view-title"
      data-testid="surface-view"
      data-loading={loading || undefined}
    >
      <h3 id="surface-view-title">{t("surface.view.title")}</h3>
      <p className="muted">{t("surface.view.intro")}</p>
      <div className="row">
        <label className="field">
          <span>{t("surface.view.xAxis")}</span>
          <select value={xIndex} onChange={(e) => setXIndex(Number(e.target.value))}>
            {ranges.map((r, i) => (
              <option key={r.id} value={i}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("surface.view.yAxis")}</span>
          <select value={yIndex} onChange={(e) => setYIndex(Number(e.target.value))}>
            {ranges.map((r, i) => (
              <option key={r.id} value={i}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("surface.view.steps")}</span>
          <select value={steps} onChange={(e) => setSteps(Number(e.target.value))}>
            {STEPS.map((s) => (
              <option key={s} value={s}>
                {s} × {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      {xIndex === yIndex && (
        <p role="alert" className="error">
          {t("surface.view.sameAxis")}
        </p>
      )}
      {fixedFactors.length > 0 && (
        <div className="row">
          {fixedFactors.map((r) => (
            <label className="field" key={r.id}>
              <span>{t("surface.view.fixed", { name: r.name })}</span>
              <input
                type="text"
                inputMode="decimal"
                value={fixedText[r.id] ?? String(r.center)}
                onChange={(e) => setFixedText({ ...fixedText, [r.id]: e.target.value })}
              />
              <small className="muted">{`${fmt(r.min)} – ${fmt(r.max)}`}</small>
            </label>
          ))}
        </div>
      )}
      {loading && (
        <p role="status" className="muted small">
          {t("surface.view.loading")}
        </p>
      )}
      {problems.length > 0 && (
        <div role="alert" className="error">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {contourSpec && contourExport && grid && (
        <ChartFigure
          testId="contour-chart"
          screenSvg={contourChart(contourSpec, "css", fmt)}
          exportSvg={contourChart(contourExport, "static", fmt)}
          pngMetadata={metadataText}
          fileBase={`${fileBase}-contorno`}
        />
      )}
      {surfaceSpec && surfaceExport && grid && (
        <>
          <div className="row">
            <label className="field">
              <span>{t("surface.view.azimuth")}</span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={view.azimuth}
                onChange={(e) => setView({ ...view, azimuth: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>{t("surface.view.elevation")}</span>
              <input
                type="range"
                min={5}
                max={85}
                step={5}
                value={view.elevation}
                onChange={(e) => setView({ ...view, elevation: Number(e.target.value) })}
              />
            </label>
          </div>
          <ChartFigure
            testId="surface-chart"
            screenSvg={surface3dChart(surfaceSpec, view, "css", fmt)}
            exportSvg={surface3dChart(surfaceExport, view, "static", fmt)}
            pngMetadata={metadataText}
            fileBase={`${fileBase}-superficie`}
          />
        </>
      )}
      {grid && (
        <div className="row">
          <TableExportButtons
            label={t("surface.view.gridCsv")}
            suffix="malha"
            sheet={t("surface.view.title")}
            header={gridTable().header}
            rows={gridTable().rows}
            metadata={gridTable().meta}
            fileBase={fileBase}
            onDone={setNotice}
          />
        </div>
      )}
      {notice && (
        <p role="status" className="muted small">
          {notice}
        </p>
      )}
    </section>
  );
}
