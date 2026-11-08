import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { nowIso } from "../../lib/ids";
import { optimalVarianceChart, type VariancePlotSpec } from "../../services/charts/optimalVariance";
import {
  type GeneratedOptimal,
  type OptimalVariance,
  type OptimalVarianceView,
  StaleResponseError,
} from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { optimalVarianceInput } from "../../state/optimalVariance";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { captureCalculationSource } from "../../state/project";
import { ChartFigure } from "../results/ChartFigure";
import { TableExportButtons } from "../results/TableExportButtons";
import { useFigureFormat } from "../results/useFigureFormat";
import { buildOptimalVariancePresentation } from "./optimalVariancePresentation";

interface Props {
  design: GeneratedOptimal;
  designId?: string;
  value: OptimalVariance | null;
  onValue: (value: OptimalVariance) => void;
  draftView?: OptimalVarianceView;
  onDraftView: (view: OptimalVarianceView) => void;
  onBusy: (busy: boolean) => void;
  unavailable: boolean;
  disabled?: boolean;
  language: Language;
}

export function OptimalVariancePanel({
  design,
  designId,
  value: draftValue,
  onValue,
  draftView,
  onDraftView,
  onBusy,
  unavailable,
  disabled = false,
  language,
}: Props) {
  const { t } = useTranslation();
  const state = useProject(),
    workspace = useWorkspace(),
    dispatch = useProjectDispatch();
  const { client } = useEngine();
  const format = useFigureFormat(language);
  const [busy, setBusy] = useState(false),
    [problems, setProblems] = useState<string[]>([]),
    [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const profiles = designId
    ? state.optimalVariances.filter((record) => record.designId === designId)
    : [];
  const selected = profiles.find(
    (record) =>
      designId && record.id === state.optimalArtifactSelection?.varianceByDesign[designId],
  );
  const saved = selected ?? profiles.at(-1);
  const recordId = saved?.id ?? null;
  const value = saved?.result ?? draftValue;
  const preference = saved ? saved.view : draftView;
  const {
    view,
    scaleKey,
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
  } = buildOptimalVariancePresentation({
    design,
    value,
    preference,
    designId,
    profileId: saved?.id,
    revisionId: saved?.revisionId,
    t,
    format,
  });
  const changeView = (patch: Partial<OptimalVarianceView>) => {
    const next = { ...view, ...patch };
    if (recordId) dispatch({ type: "setOptimalVarianceView", varianceId: recordId, view: next });
    else onDraftView(next);
  };
  const run = async () => {
    if (busy || unavailable || disabled) return;
    const source = captureCalculationSource(workspace, state, nowIso());
    setBusy(true);
    onBusy(true);
    setProblems([]);
    try {
      const response = await client.request(
        { type: "designOptimalVariance", ...optimalVarianceInput(design) },
        { channel: `optimal-variance-${state.id}` },
      );
      if (
        response.outcome.status === "ok" &&
        response.outcome.result.type === "designOptimalVariance"
      ) {
        const { type: _type, ...profile } = response.outcome.result;
        setPage(0);
        if (designId) {
          dispatch({
            type: "storeOptimalVariance",
            source,
            designId,
            result: profile,
            view: preference ? view : undefined,
            now: nowIso(),
          });
        } else onValue(profile);
      } else if (response.outcome.status === "error")
        setProblems(engineErrorMessages(t, response.outcome.error));
    } catch (error) {
      if (!(error instanceof StaleResponseError))
        setProblems([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const rows =
    selectedCurve?.quantiles.map((q) => {
      const point = value?.points[q.point];
      return [
        q.fraction,
        q.point + 1,
        pointBlockName(q.block),
        ...(point?.real ?? []),
        ...(point?.categories ?? []),
        ...(point?.coded ?? []),
        q.value.relative,
        q.value.scaled,
      ];
    }) ?? [];
  const header = [
    t("optimalVariance.fractionShort"),
    t("optimalVariance.point"),
    t("optimalVariance.block"),
    ...factors.map((f) => f.name),
    ...categoryFactors.map((f) => f.name),
    ...factors.map((_, i) => `z${i + 1}`),
    "h",
    "n·h",
  ];
  const columnKeys = [
    "fraction",
    "point",
    "block",
    ...factors.map((f) => `real-${f.id}`),
    ...categoryFactors.map((f) => `category-${f.id}`),
    ...factors.map((f) => `coded-${f.id}`),
    "relative",
    "scaled",
  ];
  const pageIndex = Math.min(page, Math.max(0, Math.ceil(rows.length / 20) - 1));
  const figure = (spec: VariancePlotSpec, testId: string) => (
    <ChartFigure
      recordId={recordId}
      screenSvg={optimalVarianceChart(spec, "css", format)}
      exportSvg={optimalVarianceChart(spec, "static", format)}
      pngMetadata={metadata}
      fileBase={testId}
      testId={testId}
    />
  );
  return (
    <section className="optimal-variance" data-testid="optimal-variance-panel" aria-busy={busy}>
      <h4>{t("optimalVariance.title")}</h4>
      <p className="muted">{t("optimalVariance.intro")}</p>
      <details className="advanced">
        <summary>{t("optimalVariance.definitionTitle")}</summary>
        <p>{definitions}</p>
      </details>
      <button
        type="button"
        className="button secondary optimal-variance-calculate"
        disabled={busy || unavailable || disabled}
        onClick={run}
      >
        {t(
          busy
            ? "optimalVariance.running"
            : value
              ? "optimalVariance.recalculate"
              : "optimalVariance.calculate",
        )}
      </button>
      {unavailable && (
        <p className="notice warning" role="status">
          {t("optimalVariance.precisionBlocked")}
        </p>
      )}
      {problems.length > 0 && (
        <div role="alert" className="notice warning">
          {problems.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {value && selectedCurve && (
        <>
          <p className="muted small">
            {t(
              categoryFactors.length
                ? "design.optimal.categories.profileSource"
                : "optimalVariance.source",
              {
                runs: value.runs,
                parameters: value.parameters,
                candidates: value.points.length,
                version: value.provenance.methodVersion,
              },
            )}
          </p>
          {!designId && <p className="muted small">{t("optimalVariance.applyToSave")}</p>}
          <div className="form-grid">
            {designId && profiles.length > 1 && (
              <label className="field">
                <span>{t("optimalVariance.profileArchive")}</span>
                <select
                  value={selected?.id ?? ""}
                  disabled={busy || disabled}
                  onChange={(event) => {
                    setPage(0);
                    dispatch({
                      type: "selectOptimalVariance",
                      designId,
                      varianceId: event.target.value || undefined,
                    });
                  }}
                >
                  <option value="">{t("optimalVariance.latestProfile")}</option>
                  {profiles.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.id} · {new Date(record.createdAt).toLocaleString(language)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>{t("optimalVariance.scale")}</span>
              <select
                value={scaleKey}
                onChange={(e) => changeView({ scaled: e.target.value === "scaled" })}
              >
                <option value="scaled">{t("optimalVariance.scaled")}</option>
                <option value="relative">{t("optimalVariance.relative")}</option>
              </select>
            </label>
            {design.spec.blocks && (
              <label className="field">
                <span>{t("optimalVariance.distribution")}</span>
                <select
                  value={distribution}
                  onChange={(e) => {
                    changeView({
                      distributionBlock:
                        e.target.value === "all" ? undefined : Number(e.target.value),
                    });
                    setPage(0);
                  }}
                >
                  <option value="all">{t("optimalVariance.all")}</option>
                  {design.spec.blocks.labels.map((label, i) => (
                    <option key={label} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <dl className="optimal-variance-summary">
            {(
              [
                ["minimum", selectedCurve.minimum],
                ["average", selectedCurve.average],
                ["maximum", selectedCurve.maximum],
              ] as const
            ).map(([label, stat]) => (
              <div key={label}>
                <dt>{t(`optimalVariance.${label}`)}</dt>
                <dd>{format(stat[scaleKey])}</dd>
              </div>
            ))}
          </dl>
          {fds && figure(fds, "optimal-variance-fds")}
          {factors.length > 0 ? (
            <>
              <h5>{t("optimalVariance.spatial")}</h5>
              <p className="muted small">{t("optimalVariance.codedAxes")}</p>
              <div className="form-grid">
                {categoryFactors.length > 0 && (
                  <label className="field">
                    <span>{t("design.optimal.categories.spatialTuple")}</span>
                    <select
                      value={selectedTuple}
                      onChange={(e) => changeView({ categorySlice: JSON.parse(e.target.value) })}
                    >
                      {tupleKeys.map((key) => (
                        <option key={key} value={key}>
                          {tupleDescription(key)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {factors.length > 1 && (
                  <>
                    <label className="field">
                      <span>{t("optimalVariance.xAxis")}</span>
                      <select
                        value={x}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          changeView({ axes: [next, next === y ? x : y] });
                        }}
                      >
                        {factors.map((f, i) => (
                          <option key={f.id} value={i}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>{t("optimalVariance.yAxis")}</span>
                      <select
                        value={y}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          changeView({ axes: [next === x ? y : x, next] });
                        }}
                      >
                        {factors.map((f, i) => (
                          <option key={f.id} value={i}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {design.spec.blocks && (
                  <label className="field">
                    <span>{t("optimalVariance.mapBlock")}</span>
                    <select
                      value={mapBlock}
                      onChange={(e) => changeView({ mapBlock: Number(e.target.value) })}
                    >
                      {design.spec.blocks.labels.map((label, i) => (
                        <option key={label} value={i}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {fixedIndexes.map((i) => (
                  <label className="field" key={factors[i]?.id}>
                    <span>{t("optimalVariance.fixed", { factor: factors[i]?.name })}</span>
                    <select
                      value={fixedAt(i)}
                      onChange={(e) =>
                        changeView({ fixed: { ...fixed, [i]: Number(e.target.value) } })
                      }
                    >
                      {levels(i).map((level) => (
                        <option key={level} value={level}>
                          {format(level)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {spatial ? (
                figure(spatial, "optimal-variance-spatial")
              ) : (
                <p role="status" className="notice">
                  {t("optimalVariance.emptySlice")}
                </p>
              )}
            </>
          ) : (
            <p className="muted">{t("design.optimal.categories.noNumericMap")}</p>
          )}
          <details className="advanced">
            <summary>{t("optimalVariance.table")}</summary>
            <p className="muted small">{t("optimalVariance.tableHelp", { count: rows.length })}</p>
            <section
              className="grid-scroll"
              aria-label={t("optimalVariance.table")}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard access to the horizontally scrollable source table.
              tabIndex={0}
            >
              <table className="results-table" data-testid="optimal-variance-table">
                <thead>
                  <tr>
                    {header.map((h, i) => (
                      <th scope="col" key={columnKeys[i]}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(pageIndex * 20, (pageIndex + 1) * 20).map((row) => (
                    <tr key={`${row[1]}-${row[2]}`}>
                      {row.map((v, j) =>
                        j === 1 ? (
                          <th scope="row" key={columnKeys[j]}>
                            {v}
                          </th>
                        ) : (
                          <td key={columnKeys[j]}>{typeof v === "number" ? format(v) : v}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <div className="row">
              <button
                className="button secondary"
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPage(pageIndex - 1)}
              >
                {t("optimalVariance.previous")}
              </button>
              <span>
                {t("optimalVariance.page", {
                  page: pageIndex + 1,
                  total: Math.ceil(rows.length / 20),
                })}
              </span>
              <button
                className="button secondary"
                type="button"
                disabled={(pageIndex + 1) * 20 >= rows.length}
                onClick={() => setPage(pageIndex + 1)}
              >
                {t("optimalVariance.next")}
              </button>
            </div>
          </details>
          <TableExportButtons
            recordId={recordId}
            label={t("optimalVariance.export")}
            suffix="variancia-otimo"
            sheet={t("optimalVariance.title")}
            header={header}
            rows={rows}
            metadata={{
              method: `${value.provenance.methodId} v${value.provenance.methodVersion}`,
              engine: value.provenance.engineVersion,
              definition: definitions,
              source: metadata,
            }}
            fileBase="variancia-planejamento"
            onDone={setNotice}
          />
          {notice && <p role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}
