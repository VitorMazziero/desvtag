// Resultados da superfície de resposta (U08/U09/U16): explicação curta, coeficientes (escala
// codificada), ANOVA, falta de ajuste, equação nas duas escalas, região experimental, gráficos e
// exportação com proveniência.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import { APP_VERSION } from "../../lib/version";
import { scatterChart } from "../../services/charts";
import type { AnalysisRecord, Stat, SurfaceResult } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { exportMetadata, flat } from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { ChartFigure } from "./ChartFigure";
import { formatFactParams } from "./ComparisonInterpretation";
import { CopyText } from "./CopyText";
import { ModelPanel } from "./ModelPanel";
import { SurfaceView } from "./SurfaceView";
import { formatEquation } from "./surfaceEquation";
import { TableExportButtons } from "./TableExportButtons";
import { useFigureFormat } from "./useFigureFormat";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

function StatCell({ stat, language, p = false }: { stat: Stat; language: Language; p?: boolean }) {
  const { t } = useTranslation("results");
  if (stat.status === "defined")
    return (
      <td className="num">
        {p ? formatP(stat.value, language) : formatSignificant(stat.value, language, 5)}
      </td>
    );
  return (
    <td className="num undefined" title={t(`undefinedReason.${stat.reason}`)}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">
        {t("table.undefined")}: {t(`undefinedReason.${stat.reason}`)}
      </span>
    </td>
  );
}

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
  result: SurfaceResult;
  signature: string;
  language: Language;
}

export function SurfaceResults({ result, signature, language }: Props) {
  const { t } = useTranslation("results");
  const { t: tc } = useTranslation();
  const state = useProject();
  const workspace = useWorkspace();
  const _storage = useStorage();
  const [notice, setNotice] = useState<string | null>(null);

  const response = state.responses.find((r) => r.id === result.responseId);
  const responseName = response?.name || result.responseId;
  const record: AnalysisRecord | undefined = [...state.analyses]
    .reverse()
    .find((a) => a.signature === signature);
  const revision = state.revisions.find((r) => r.id === record?.revisionId);
  const metadata = useMemo(
    () =>
      record
        ? exportMetadata({
            record,
            revisionHash: revision?.contentHash ?? "",
            project: workspace.name,
            experiment: state.name,
            appVersion: APP_VERSION,
            now: new Date().toISOString(),
          })
        : null,
    [record, revision, workspace.name, state.name],
  );
  const metadataText = metadata ? JSON.stringify(metadata) : "";
  const fmt = useFigureFormat(language);
  const level = formatSignificant((1 - result.alpha) * 100, language, 4);
  const base = `${slug(state.name)}-${slug(responseName)}`;
  const anova = result.anova;
  const names = result.factorNames;
  const { settings, update } = useExportSettings();
  // Nomes das variáveis (padrão) ou notação (ŷ, x₁, x₂…): preferência de exibição do dispositivo.
  const subscripts = "₀₁₂₃₄₅₆₇₈₉";
  const subscript = (n: number) => [...String(n)].map((d) => subscripts[Number(d)] ?? d).join("");
  const equationNames = settings.equationNames;
  const prefix = equationNames ? responseName : t("surface.equation.prefix");
  const equationFactors = equationNames ? names : names.map((_, i) => `x${subscript(i + 1)}`);
  // A equação codificada usa SEMPRE símbolos codificados (z₁, z₂…): com os nomes dos fatores ela
  // convidaria a inserir 30 e 6 onde vale 0 e 0 (UX33). A transformação vem logo abaixo.
  const codedSymbols = names.map((_, i) => `z${subscript(i + 1)}`);
  const codedEquation = formatEquation(result.equation.coded, codedSymbols, language, prefix);
  const realEquation = result.equation.real
    ? formatEquation(result.equation.real, equationFactors, language, prefix)
    : null;
  const transformations = result.ranges.map((r, i) => {
    const nameOrSymbol = equationNames ? r.name : `x${subscript(i + 1)}`;
    return `${codedSymbols[i] ?? "z"} = (${nameOrSymbol} − ${formatSignificant(r.center, language, 5)}) / ${formatSignificant(r.halfRange, language, 5)}`;
  });

  const evidence =
    val(anova.f) !== null && val(anova.pValue) !== null
      ? t("surface.summary.evidence", {
          f: formatSignificant(val(anova.f) ?? 0, language, 5),
          p: formatP(val(anova.pValue) ?? 0, language),
          r2: formatSignificant(val(anova.rSquared) ?? 0, language, 5),
          adjusted: formatSignificant(val(anova.adjustedRSquared) ?? 0, language, 5),
        })
      : t("surface.summary.evidenceUnavailable");

  const opSpec = (withMetadata: boolean) => ({
    id: "surface-observed-predicted",
    title: t("design.charts.opTitle", { response: responseName }),
    description: t("design.charts.opDescription"),
    xLabel: t("design.charts.opX"),
    yLabel: t("design.charts.opY"),
    points: result.fitPoints.map((p) => ({ x: p.predicted, y: p.observed })),
    reference: "identity" as const,
    legend: t("design.charts.opLegend"),
    metadata: withMetadata ? metadataText : undefined,
  });

  const coefficientsTable = () => {
    const header = ["term", "estimate", "std_error", "t", "p_value", "ci_lower", "ci_upper"];
    const rows = [result.intercept, ...result.terms].map((row) => [
      row.label,
      val(row.estimate),
      val(row.stdError),
      val(row.tValue),
      val(row.pValue),
      val(row.ciLower),
      val(row.ciUpper),
    ]);
    return { header, rows };
  };
  const lof = result.lackOfFit;

  return (
    <>
      <div data-section="summary">
        <section
          className="panel"
          aria-labelledby="interpretation-title"
          data-testid="interpretation"
        >
          <h3 id="interpretation-title" className="sr-only">
            {t("labels.conclusion")}
          </h3>
          <dl className="interpretation">
            <dt>{t("labels.conclusion")}</dt>
            <dd>
              {t("surface.summary.conclusion", {
                n: result.fit.nObservations,
                response: responseName,
                factors: names.length,
                terms: result.terms.length,
              })}
            </dd>
            <dt>{t("labels.evidence")}</dt>
            <dd>{evidence}</dd>
            <dt>{t("labels.nextStep")}</dt>
            <dd>{t("surface.summary.nextStep")}</dd>
          </dl>
          <ul className="facts-list">
            {result.facts.map((fact) => (
              <li key={fact.key + JSON.stringify(fact.params)}>
                {t(`facts.${fact.key}`, formatFactParams(fact, language))}
              </li>
            ))}
          </ul>
          {result.issues.filter((i) => i.severity !== "info").length > 0 && (
            <div role="note">
              <h4>{t("comparison.warnings")}</h4>
              <ul className="facts-list">
                {result.issues
                  .filter((i) => i.severity !== "info")
                  .map((issue) => (
                    <li key={issue.code + JSON.stringify(issue.params)}>
                      {issueMessage(tc, issue)}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div data-section="model">
        <ModelPanel result={result} language={language} />
        <div className="grid-scroll">
          <table className="results-table" data-testid="surface-terms">
            <caption>{t("surface.terms.caption", { response: responseName })}</caption>
            <thead>
              <tr>
                <th scope="col">{t("surface.terms.term")}</th>
                <th scope="col">{t("surface.terms.estimate")}</th>
                <th scope="col">{t("surface.terms.se")}</th>
                <th scope="col">{t("surface.terms.t")}</th>
                <th scope="col">{t("surface.terms.p")}</th>
                <th scope="col">{t("surface.terms.ci", { level })}</th>
              </tr>
            </thead>
            <tbody>
              {[result.intercept, ...result.terms].map((row, i) => (
                <tr key={row.label}>
                  <th scope="row">{i === 0 ? t("surface.terms.intercept") : row.label}</th>
                  <StatCell stat={row.estimate} language={language} />
                  <StatCell stat={row.stdError} language={language} />
                  <StatCell stat={row.tValue} language={language} />
                  <StatCell stat={row.pValue} language={language} p />
                  <td className="num">
                    {row.ciLower.status === "defined" && row.ciUpper.status === "defined"
                      ? `${fmt(row.ciLower.value)} – ${fmt(row.ciUpper.value)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">{t("surface.terms.help")}</p>

        <div className="grid-scroll">
          <table className="results-table" data-testid="design-anova">
            <caption>{t("design.anova.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("design.anova.source")}</th>
                <th scope="col">{t("design.anova.df")}</th>
                <th scope="col">{t("design.anova.ss")}</th>
                <th scope="col">{t("design.anova.ms")}</th>
                <th scope="col">{t("design.anova.f")}</th>
                <th scope="col">{t("design.anova.p")}</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["model", anova.model],
                  ["residual", anova.residual],
                  ["total", anova.total],
                ] as const
              ).map(([key, row]) => (
                <tr key={key}>
                  <th scope="row">{t(`design.anova.${key}`)}</th>
                  <td className="num">{row.df}</td>
                  <StatCell stat={row.sumSquares} language={language} />
                  <StatCell stat={row.meanSquare} language={language} />
                  {key === "model" ? (
                    <>
                      <StatCell stat={anova.f} language={language} />
                      <StatCell stat={anova.pValue} language={language} p />
                    </>
                  ) : (
                    <>
                      <td />
                      <td />
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small" data-testid="fit-measures">
          {t("design.anova.r2")}:{" "}
          {val(anova.rSquared) === null
            ? "—"
            : formatSignificant(val(anova.rSquared) ?? 0, language, 5)}{" "}
          · {t("design.anova.r2adj")}:{" "}
          {val(anova.adjustedRSquared) === null
            ? "—"
            : formatSignificant(val(anova.adjustedRSquared) ?? 0, language, 5)}{" "}
          · {t("design.anova.sigma")}:{" "}
          {val(result.fit.residualSd) === null
            ? "—"
            : formatSignificant(val(result.fit.residualSd) ?? 0, language, 5)}
        </p>

        <p data-testid="lack-of-fit">
          <strong>{t("design.lackOfFit.title")}: </strong>
          {lof && val(lof.f) !== null
            ? t("design.lackOfFit.text", {
                ssPure: formatSignificant(lof.ssPureError, language, 5),
                dfPure: lof.dfPureError,
                ssLof: formatSignificant(val(lof.ssLackOfFit) ?? 0, language, 5),
                dfLof: lof.dfLackOfFit,
                f: formatSignificant(val(lof.f) ?? 0, language, 5),
                p: formatP(val(lof.pValue) ?? 0, language),
              })
            : t("surface.lackOfFit.unavailable")}
        </p>

        <section aria-labelledby="equation-title" data-testid="equation">
          <h3 id="equation-title">{t("surface.equation.title")}</h3>
          <p className="muted small">{t("surface.equation.help")}</p>
          <label className="field">
            <span>{t("surface.equation.style")}</span>
            <select
              data-testid="equation-style"
              value={equationNames ? "names" : "notation"}
              onChange={(e) => update({ equationNames: e.target.value === "names" })}
            >
              <option value="names">{t("surface.equation.styleNames")}</option>
              <option value="notation">{t("surface.equation.styleNotation")}</option>
            </select>
          </label>
          {!equationNames && (
            <p className="muted small" data-testid="equation-legend">
              {[responseName, ...names]
                .map((n, i) => `${i === 0 ? "ŷ" : `x${subscript(i)}`} = ${n}`)
                .join("; ")}
            </p>
          )}
          <h4>{t("surface.equation.coded")}</h4>
          <p className="equation" data-testid="equation-coded">
            {codedEquation}
          </p>
          <p className="muted small" data-testid="equation-transform">
            {t("surface.equation.codedWhere")} {transformations.join("; ")}
          </p>
          <CopyText
            label={t("surface.equation.copyCoded")}
            text={[codedEquation, ...transformations].join("\n")}
          />
          <h4>{t("surface.equation.real")}</h4>
          <p className="equation" data-testid="equation-real">
            {realEquation ?? t("surface.equation.realUnavailable")}
          </p>
          {realEquation && <CopyText label={t("surface.equation.copyReal")} text={realEquation} />}
        </section>

        <section aria-labelledby="region-title">
          <h3 id="region-title">{t("surface.region.title")}</h3>
          <div className="grid-scroll">
            <table className="results-table" data-testid="region-table">
              <thead>
                <tr>
                  <th scope="col">{t("surface.region.factor")}</th>
                  <th scope="col">{t("surface.region.center")}</th>
                  <th scope="col">{t("surface.region.halfRange")}</th>
                  <th scope="col">{t("surface.region.min")}</th>
                  <th scope="col">{t("surface.region.max")}</th>
                </tr>
              </thead>
              <tbody>
                {result.ranges.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.name}</th>
                    <td className="num">{fmt(r.center)}</td>
                    <td className="num">{fmt(r.halfRange)}</td>
                    <td className="num">{fmt(r.min)}</td>
                    <td className="num">{fmt(r.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">{t("surface.region.help")}</p>
        </section>
      </div>

      <div data-section="charts">
        <SurfaceView
          result={result}
          responseName={responseName}
          responseUnit={response?.unit ?? ""}
          language={language}
          metadataText={metadataText}
          fileBase={base}
          csvMetadata={metadata ? flat(metadata) : {}}
        />

        {result.fitPoints.length > 1 && (
          <ChartFigure
            testId="observed-predicted-chart"
            screenSvg={scatterChart(opSpec(false), "css", fmt)}
            exportSvg={scatterChart(opSpec(true), "static", fmt)}
            pngMetadata={metadataText}
            fileBase={`${base}-observado-predito`}
          />
        )}
      </div>

      <div data-section="export">
        <section aria-labelledby="export-title" data-report-skip>
          <h3 id="export-title">{t("comparison.export.title")}</h3>
          <div className="row">
            <TableExportButtons
              label={t("surface.export.coefficientsCsv")}
              suffix="coeficientes"
              sheet={t("surface.terms.term")}
              header={coefficientsTable().header}
              rows={coefficientsTable().rows}
              metadata={metadata ? flat(metadata) : null}
              fileBase={base}
              onDone={setNotice}
            />
          </div>
          {notice && (
            <p role="status" className="muted small" data-testid="export-notice">
              {notice}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
