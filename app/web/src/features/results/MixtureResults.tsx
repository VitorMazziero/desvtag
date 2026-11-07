import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import type { ExperimentData, MixtureRecord, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { hasOverflowingDesirabilitySpan } from "../optimization/legacyDesirability";
import { CoxTraceResults } from "./CoxTraceResults";
import { familyExportMetadata } from "./familyExportMetadata";
import { MixtureOptimumResults } from "./MixtureOptimumResults";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";
import { TernaryPlot } from "./TernaryPlot";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

/** Pure saved-result presentation: never requests a fit or reads current data for labels. */
export function MixtureResults({
  record,
  data,
  language,
  report = false,
}: {
  record: MixtureRecord;
  data: ExperimentData;
  language: Language;
  report?: boolean;
}) {
  const { t } = useTranslation();
  const result = record.result;
  const a = result.fit.anova;
  const rows = result.fit.coefficients;
  const [notice, setNotice] = useState<string | null>(null);
  const response = data.responses.find((r) => r.id === record.input.responseId);
  const responseLabel = `${response?.name ?? record.input.responseId}${response?.unit ? ` [${response.unit}]` : ""}`;
  const fmt = (v: number | null, digits = 6) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const metadata = familyExportMetadata(record);
  return (
    <>
      <div data-section="summary">
        <h3>
          {t("mixture.analysis.title")} — {responseLabel}
        </h3>
        <p>{t("mixture.analysis.models." + record.result.model)}</p>
        <p data-testid="scheffe-fit-stats">
          F = {fmt(num(a.f), 5)} · p ={" "}
          {num(a.pValue) === null ? "—" : formatP(num(a.pValue) as number, language)} · R² ={" "}
          {fmt(num(a.rSquared), 5)} · R² {t("mixture.analysis.adjusted")} ={" "}
          {fmt(num(a.adjustedRSquared), 5)}
        </p>
        <p className="muted small">{t("mixture.analysis.note")}</p>
        {result.optimum && (
          <p data-testid="mixture-optimum-summary">
            {t(`optimization.status.${result.optimum.status}`)}
            {result.optimum.candidates[0] &&
              ` ${t("mixture.analysis.optimD")} = ${fmt(result.optimum.candidates[0].desirability)}.`}
          </p>
        )}
        {result.optimum &&
          result.provenance.methodVersion < 5 &&
          record.input.request.optimization?.setup.responses.some(({ goal }) =>
            hasOverflowingDesirabilitySpan(goal),
          ) && (
            <p role="status" className="error">
              {t("optimization.legacyDesirability")}
            </p>
          )}
        {result.provenance.methodVersion < 2 && result.fit.rank < result.fit.nColumns && (
          <p role="status" className="error">
            {t("mixture.analysis.legacyPredictionWarning")}
          </p>
        )}
        {result.provenance.methodVersion < 3 &&
          record.input.request.upperBounds?.some(
            (upper, index) => upper === record.input.request.lowerBounds[index],
          ) && (
            <p role="status" className="error">
              {t("mixture.analysis.legacyFixedWarning")}
            </p>
          )}
        {result.issues.map((issue) => (
          <p role="status" className="muted" key={issue.code}>
            {issueMessage(t, issue)}
          </p>
        ))}
        {record.input.request.upperBounds && (
          <>
            <p className="muted">{t("mixture.analysis.boundedDomain")}</p>
            <div className="grid-scroll">
              <table className="results-table" data-testid="mixture-saved-bounds">
                <caption>{t("mixture.analysis.bounds")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("mixture.analysis.component")}</th>
                    <th scope="col">{t("mixture.analysis.lowerBound")}</th>
                    <th scope="col">{t("mixture.analysis.upperBound")}</th>
                  </tr>
                </thead>
                <tbody>
                  {record.input.request.componentNames.map((name, index) => (
                    <tr key={record.input.componentIds[index]}>
                      <th scope="row">{name}</th>
                      <td className="num">
                        {fmt(record.input.request.lowerBounds[index] ?? null)}
                      </td>
                      <td className="num">
                        {fmt(record.input.request.upperBounds?.[index] ?? null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div data-section="tables">
        <h3>{t("mixture.analysis.coefficients")}</h3>
        <TableExportButtons
          label={t("mixture.analysis.exportCsv")}
          suffix="de-scheffe"
          sheet={t("mixture.analysis.coefficients")}
          header={["term", "estimate", "std_error", "t", "p_value", "ci_lower", "ci_upper"]}
          rows={rows.map((r) => [
            r.label,
            num(r.estimate),
            num(r.stdError),
            num(r.tValue),
            num(r.pValue),
            num(r.ciLower),
            num(r.ciUpper),
          ])}
          metadata={metadata}
          fileBase="coeficientes-scheffe"
          onDone={setNotice}
        />
        {notice && (
          <p role="status" className="muted small">
            {notice}
          </p>
        )}
        <div className="grid-scroll">
          <table className="results-table" data-testid="scheffe-coefficients">
            <thead>
              <tr>
                <th scope="col">{t("mixture.analysis.term")}</th>
                <th scope="col">{t("mixture.analysis.estimate")}</th>
                <th scope="col">{t("mixture.analysis.se")}</th>
                <th scope="col">t</th>
                <th scope="col">p</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="num">
                    <StatNumber stat={r.estimate} language={language} />
                  </td>
                  <td className="num">
                    <StatNumber stat={r.stdError} language={language} />
                  </td>
                  <td className="num">
                    <StatNumber stat={r.tValue} language={language} digits={4} />
                  </td>
                  <td className="num">
                    <StatNumber stat={r.pValue} language={language} p />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>{t("mixture.analysis.anova")}</h3>
        <TableExportButtons
          label={`${t("family.anova")} (CSV)`}
          suffix="mixture-anova"
          sheet="ANOVA"
          header={["source", "df", "sum_squares", "mean_square"]}
          rows={[
            ["model", a.model],
            ["residual", a.residual],
            ["total", a.total],
          ].map(([name, row]) => {
            const r = row as typeof a.model;
            return [name as string, r.df, num(r.sumSquares), num(r.meanSquare)];
          })}
          metadata={metadata}
          fileBase="mistura"
          onDone={setNotice}
        />
        <div className="grid-scroll">
          <table className="results-table" data-testid="scheffe-anova">
            <thead>
              <tr>
                <th scope="col">{t("mixture.analysis.source")}</th>
                <th scope="col">GL</th>
                <th scope="col">SQ</th>
                <th scope="col">QM</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["model", a.model],
                  ["residual", a.residual],
                  ["total", a.total],
                ] as const
              ).map(([key, row]) => (
                <tr key={key}>
                  <th scope="row">{t(`mixture.analysis.${key === "model" ? "model_" : key}`)}</th>
                  <td className="num">{row.df}</td>
                  <td className="num">
                    <StatNumber stat={row.sumSquares} language={language} />
                  </td>
                  <td className="num">
                    <StatNumber stat={row.meanSquare} language={language} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div data-section="diagnostics">
        <h3>{t("family.diagnostics")}</h3>
        <TableExportButtons
          label={`${t("family.diagnostics")} (CSV)`}
          suffix="mixture-diagnostics"
          sheet="Diagnostics"
          header={[
            "fit_row",
            "observed",
            "fitted",
            "residual",
            "leverage",
            "standardized",
            "studentized",
            "cooks_distance",
          ]}
          rows={result.fit.observations.map((o) => [
            o.row + 1,
            o.observed,
            o.fitted,
            o.residual,
            o.leverage,
            num(o.standardizedResidual),
            num(o.studentizedResidual),
            num(o.cooksDistance),
          ])}
          metadata={metadata}
          fileBase="mistura"
          onDone={setNotice}
        />
        <div className="grid-scroll">
          <table className="results-table" data-testid="mixture-diagnostics">
            <thead>
              <tr>
                {["usedRow", "observed", "fitted", "residual", "leverage"].map((key) => (
                  <th scope="col" key={key}>
                    {t(`family.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.fit.observations.map((o) => (
                <tr key={o.row}>
                  <th scope="row">{o.row + 1}</th>
                  {[
                    ["observed", o.observed],
                    ["fitted", o.fitted],
                  ].map(([key, value]) => (
                    <td className="num" key={key}>
                      <StatNumber
                        stat={{ status: "defined", value: value as number }}
                        language={language}
                      />
                    </td>
                  ))}
                  <td className="num">
                    <StatNumber
                      stat={{ status: "defined", value: o.residual }}
                      language={language}
                      residual
                    />
                  </td>
                  <td className="num">
                    <StatNumber
                      stat={{ status: "defined", value: o.leverage }}
                      language={language}
                      digits={4}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.fit.issues.map((i) => (
          <p key={i.code + JSON.stringify(i.params)} role="status" className="muted">
            {issueMessage(t, i)}
          </p>
        ))}
      </div>
      <MixtureOptimumResults record={record} language={language} report={report} />
      <div data-section="charts">
        <CoxTraceResults record={record} language={language} responseLabel={responseLabel} />
        {result.grid.length > 0 && (
          <TernaryPlot
            language={language}
            note={[
              t(
                record.input.request.lowerBounds.some((c) => c > 0)
                  ? "mixture.analysis.pseudoAxes"
                  : "mixture.analysis.realAxes",
              ),
              ...(result.region ? [t("mixture.analysis.boundedLegend")] : []),
              ...(result.optimum?.candidates[0] ? [t("mixture.analysis.optimHighlight")] : []),
            ].join(" ")}
            names={record.input.request.componentNames}
            grid={result.grid}
            highlight={result.optimum?.candidates[0]?.pseudo}
            divisions={result.gridDivisions}
            boundary={result.region?.edges.map(([i, j]) =>
              [i, j].map((index) => {
                const lower = record.input.request.lowerBounds;
                const scale = 1 - lower.reduce((sum, value) => sum + value, 0);
                return (result.region?.vertices[index] ?? []).map(
                  (value, k) => (value - (lower[k] ?? 0)) / scale,
                );
              }),
            )}
            points={record.input.request.proportions.map((p) => {
              const bounds = record.input.request.lowerBounds;
              const scale = 1 - bounds.reduce((sum, c) => sum + c, 0);
              return p.map((x, k) => (x - (bounds[k] ?? 0)) / scale);
            })}
            label={t("mixture.analysis.ternaryLabel", {
              response: responseLabel,
            })}
            minLabel={t("mixture.analysis.min")}
            maxLabel={t("mixture.analysis.max")}
          />
        )}
      </div>
    </>
  );
}
