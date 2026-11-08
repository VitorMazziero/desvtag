import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { PowerRecord, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { familyExportMetadata } from "./familyExportMetadata";
import { PowerAssumptions, PowerDesignTables } from "./PowerAssumptions";
import { PowerCurveChart } from "./PowerCurveChart";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);
const summaryIssues = new Set([
  "power.analytical_unavailable",
  "power.simulation_unavailable",
  "power.simulation_total_budget",
]);

export function PowerResults({
  record,
  language,
  report = false,
}: {
  record: PowerRecord;
  language: Language;
  report?: boolean;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const result = record.result;
  const remainingIssues = result.issues.filter((issue) => !summaryIssues.has(issue.code));
  const kind = record.input.design.type;
  const curveRows = [
    ...new Map(result.curve.map((point) => [`${point.n}:${point.power}`, point])).values(),
  ];
  const unit =
    kind === "anova" || kind === "twoSampleT"
      ? t("power.perGroup")
      : ["regression", "contrast", "twoLevel"].includes(kind)
        ? t(`powerAdvanced.nUnits.${kind}`)
        : t("power.units");
  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const metadata = familyExportMetadata(record);
  return (
    <section data-testid="power-result">
      <div data-section="summary">
        <h3>
          {t(`power.designs.${kind}`)} — {t(`power.goals.${record.input.goal.type}`)}
        </h3>
        <p role="status" className="power-key-result" data-testid="power-summary">
          {result.simulation &&
            record.input.goal.type !== "precisionFor" &&
            `${t("powerAdvanced.analyticalPower")}: `}
          {t(
            record.input.goal.type === "precisionFor" ? "power.precisionSummary" : "power.summary",
            {
              n: result.n,
              unit,
              total: result.total,
              power: fmt(num(result.power), 4),
              width: fmt(num(result.halfWidth), 4),
            },
          )}
        </p>
        {result.issues
          .filter((issue) => summaryIssues.has(issue.code))
          .map((issue) => (
            <p key={issue.code} role="status" className="stale-notice" data-testid="power-warning">
              {issueMessage(t, issue)}
            </p>
          ))}
        <p className="muted small">
          {t(result.df2 > 0 ? "powerAdvanced.fDetails" : "power.details", {
            nc: fmt(result.noncentrality, 5),
            df1: fmt(result.df1, 4),
            df2: fmt(result.df2, 4),
            critical: fmt(result.critical, 5),
          })}
          {num(result.halfWidth) !== null &&
            ` ${t("power.halfWidthResult", { value: fmt(num(result.halfWidth), 4) })}`}
        </p>
        {result.simulation && (
          <section data-testid="power-simulation-result">
            <h4>{t("powerAdvanced.mcEstimate")}</h4>
            <p>
              <StatNumber
                stat={{ status: "defined", value: result.simulation.estimate }}
                language={language}
              />{" "}
              · {t("powerAdvanced.mcse")}:{" "}
              <StatNumber
                stat={{ status: "defined", value: result.simulation.standardError }}
                language={language}
              />
            </p>
            <p>
              {t("powerAdvanced.wilson95")}:{" "}
              <StatNumber
                stat={{ status: "defined", value: result.simulation.ciLower }}
                language={language}
              />{" "}
              —{" "}
              <StatNumber
                stat={{ status: "defined", value: result.simulation.ciUpper }}
                language={language}
              />
            </p>
            <p className="muted small">
              {t("powerAdvanced.simulationResultNote", {
                b: result.simulation.replications,
                seed: result.simulation.seed,
                rejections: result.simulation.rejections,
              })}
            </p>
          </section>
        )}
        <dl className="facts power-assumptions" data-testid="power-assumptions">
          <dt>{t("power.sigma")}</dt>
          <dd>{fmt(record.input.sigma, 6)}</dd>
          <dt>{t("power.alpha")}</dt>
          <dd>{fmt(record.input.alpha, 6)}</dd>
          <PowerAssumptions request={record.input} language={language} />
          <dt>
            {t(
              record.input.goal.type === "powerAt"
                ? ["regression", "contrast", "twoLevel"].includes(kind)
                  ? "powerAdvanced.n"
                  : "power.n"
                : record.input.goal.type === "sampleSizeFor"
                  ? "power.target"
                  : "power.halfWidth",
            )}
          </dt>
          <dd>
            {record.input.goal.type === "powerAt"
              ? record.input.goal.n
              : fmt(
                  record.input.goal.type === "sampleSizeFor"
                    ? record.input.goal.power
                    : record.input.goal.halfWidth,
                  6,
                )}
          </dd>
          <dt>
            {t(kind === "anova" || kind === "regression" ? "powerAdvanced.test" : "power.twoSided")}
          </dt>
          <dd className="fact-prose">
            {kind === "anova" || kind === "regression"
              ? t("powerAdvanced.upperTailF")
              : t(record.input.twoSided ? "family.yes" : "family.no")}
          </dd>
        </dl>
      </div>
      <div data-section="tables">
        <PowerDesignTables record={record} language={language} onDone={setNotice} report={report} />
        {curveRows.length > 0 && (
          <>
            <TableExportButtons
              label={`${t("power.power")} (CSV)`}
              suffix="power-curve"
              sheet={t("power.power")}
              header={["n", "power"]}
              rows={curveRows.map((p) => [p.n, p.power])}
              metadata={metadata}
              fileBase="potencia"
              onDone={setNotice}
            />
            {notice && <p role="status">{notice}</p>}
            <div className="grid-scroll">
              <table className="results-table" data-testid="power-curve">
                <thead>
                  <tr>
                    <th scope="col">n</th>
                    <th scope="col">{t("power.power")}</th>
                  </tr>
                </thead>
                <tbody>
                  {curveRows.map((p) => (
                    <tr key={`${p.n}:${p.power}`}>
                      <th scope="row">{p.n}</th>
                      <td className="num">
                        <StatNumber
                          stat={{ status: "defined", value: p.power }}
                          language={language}
                          digits={4}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div data-section="charts">
        <PowerCurveChart record={record} language={language} />
      </div>
      <div data-section="diagnostics">
        <h3>{t("power.diagnostics")}</h3>
        {remainingIssues.length ? (
          remainingIssues.map((issue) => (
            <p key={issue.code + JSON.stringify(issue.params)}>{issueMessage(t, issue)}</p>
          ))
        ) : result.issues.length === 0 ? (
          <p>{t("family.noWarnings")}</p>
        ) : null}
        <p className="muted small">
          {t(record.input.goal.type === "precisionFor" ? "power.precisionNote" : "power.note")}
        </p>
      </div>
    </section>
  );
}
