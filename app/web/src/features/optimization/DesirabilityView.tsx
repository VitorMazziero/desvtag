// U10 / U09 — desejabilidade global sobre dois fatores (malha do motor), com os candidatos marcados.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { contourChart } from "../../services/charts";
import type { OptimizationRequest, OptimizationResult, SurfaceGrid } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { ChartFigure } from "../results/ChartFigure";

export function DesirabilityView({
  request,
  result,
  language,
}: {
  request: OptimizationRequest;
  result: OptimizationResult;
  language: Language;
}) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const factors = request.factors;
  const best = result.candidates[0];
  const [xIndex, setXIndex] = useState(0);
  const [yIndex, setYIndex] = useState(Math.min(1, factors.length - 1));
  const [grid, setGrid] = useState<SurfaceGrid | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const x = factors[xIndex];
  const y = factors[yIndex];
  const key = JSON.stringify([xIndex, yIndex, best?.real, request.setup]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dependências resumidas em `key`
  useEffect(() => {
    if (!x || !y || xIndex === yIndex || !best) return;
    let live = true;
    client
      .request(
        {
          type: "optimizationGrid",
          optimization: request,
          xFactor: x.id,
          yFactor: y.id,
          // Demais fatores fixados nas condições do melhor candidato.
          fixed: factors.flatMap((f, j) =>
            j === xIndex || j === yIndex ? [] : [{ factorId: f.id, value: best.real[j] ?? 0 }],
          ),
          steps: 41,
        },
        { channel: "optimization-grid" },
      )
      .then((response) => {
        if (!live) return;
        if (
          response.outcome.status === "ok" &&
          response.outcome.result.type === "optimizationGrid"
        ) {
          const { type: _type, ...rest } = response.outcome.result;
          setGrid(rest as SurfaceGrid);
          setProblems([]);
        } else if (response.outcome.status === "error") {
          setProblems(engineErrorMessages(t, response.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, key]);

  if (!best || factors.length < 2) return null;
  const fmt = (v: number) => formatSignificant(v, language, 4);
  const spec = (id: string) =>
    grid
      ? {
          id,
          title: t("optimization.view.title"),
          description: t("optimization.view.description"),
          grid,
          responseLabel: t("optimization.view.response"),
          points: result.candidates.map((c) => ({
            x: c.real[xIndex] ?? 0,
            y: c.real[yIndex] ?? 0,
          })),
          texts: {
            extrapolated: t("optimization.view.extrapolated"),
            points: t("optimization.view.points"),
            reading: t("optimization.view.reading"),
          },
        }
      : null;
  const screen = spec("desirability");
  const exported = spec("desirability");
  return (
    <section aria-labelledby="desirability-title" data-testid="desirability-view">
      <h3 id="desirability-title">{t("optimization.view.heading")}</h3>
      <div className="row">
        <label className="field">
          <span>{t("optimization.view.xAxis")}</span>
          <select value={xIndex} onChange={(e) => setXIndex(Number(e.target.value))}>
            {factors.map((f, i) => (
              <option key={f.id} value={i}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("optimization.view.yAxis")}</span>
          <select value={yIndex} onChange={(e) => setYIndex(Number(e.target.value))}>
            {factors.map((f, i) => (
              <option key={f.id} value={i}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {xIndex === yIndex && (
        <p role="alert" className="error">
          {t("optimization.view.sameAxis")}
        </p>
      )}
      {problems.length > 0 && (
        <div role="alert" className="error">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {screen && exported && (
        <ChartFigure
          testId="desirability-chart"
          screenSvg={contourChart(screen, "css", fmt)}
          exportSvg={contourChart(exported, "static", fmt)}
          pngMetadata=""
          fileBase="desejabilidade"
        />
      )}
    </section>
  );
}
