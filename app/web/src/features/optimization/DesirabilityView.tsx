// U10 / U09 — desejabilidade global sobre dois fatores (malha do motor), com os candidatos marcados.
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { contourChart } from "../../services/charts";
import type { OptimizationRequest, OptimizationResult, SurfaceGrid } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { ChartFigure } from "../results/ChartFigure";
import { useFigureFormat } from "../results/useFigureFormat";

export function DesirabilityView({
  request,
  result,
  language,
  selected,
}: {
  request: OptimizationRequest;
  result: OptimizationResult;
  language: Language;
  selected?: Set<number>;
}) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const instance = useId();
  const fmt = useFigureFormat(language);
  const factors = request.factors;
  const best = result.candidates[0];
  const [xIndex, setXIndex] = useState(0);
  const [yIndex, setYIndex] = useState(Math.min(1, factors.length - 1));
  const [legacyRequest, setLegacyRequest] = useState<OptimizationResult | null>(null);
  const [computed, setComputed] = useState<{
    key: string;
    result: OptimizationResult;
    grid: SurfaceGrid;
  } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const x = factors[xIndex];
  const y = factors[yIndex];
  const key = JSON.stringify([xIndex, yIndex, best?.real, request.setup]);
  const enabled = Boolean(result.gridModels) || legacyRequest === result;
  const grid = computed?.key === key && computed.result === result ? computed.grid : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: dependências resumidas em `key`
  useEffect(() => {
    if (!enabled || !x || !y || xIndex === yIndex || !best) return;
    let live = true;
    client
      .request(
        {
          type: "optimizationGrid",
          optimization: request,
          fitted: result.gridModels,
          xFactor: x.id,
          yFactor: y.id,
          // Demais fatores fixados nas condições do melhor candidato.
          fixed: factors.flatMap((f, j) =>
            j === xIndex || j === yIndex ? [] : [{ factorId: f.id, value: best.real[j] ?? 0 }],
          ),
          steps: 41,
        },
        { channel: `optimization-grid-${instance}` },
      )
      .then((response) => {
        if (!live) return;
        if (
          response.outcome.status === "ok" &&
          response.outcome.result.type === "optimizationGrid"
        ) {
          const { type: _type, ...rest } = response.outcome.result;
          setComputed({ key, result, grid: rest as SurfaceGrid });
          setProblems([]);
        } else if (response.outcome.status === "error") {
          setProblems(engineErrorMessages(t, response.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, enabled, key, result]);

  if (!best || factors.length < 2) return null;
  if (!enabled)
    return (
      <section aria-labelledby="desirability-title" data-testid="desirability-view">
        <h3 id="desirability-title">{t("optimization.view.heading")}</h3>
        <p className="muted small">{t("optimization.view.legacy")}</p>
        <button
          type="button"
          className="button secondary"
          data-testid="rebuild-desirability-grid"
          onClick={() => setLegacyRequest(result)}
        >
          {t("optimization.view.rebuild")}
        </button>
      </section>
    );
  const spec = (id: string) =>
    grid
      ? {
          id,
          title: t("optimization.view.title"),
          description: t("optimization.view.description"),
          grid,
          colorDomain: [0, 1] as [number, number],
          responseLabel: t("optimization.view.response"),
          points: result.candidates.map((c) => ({
            x: c.real[xIndex] ?? 0,
            label: String(c.rank),
            selected: selected?.has(c.rank) ?? c.rank === best.rank,
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
