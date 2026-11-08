import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import type { ExperimentData, NonlinearRecord, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { nonlinearParameterLabels } from "../analysis/parseNonlinearOptions";
import { familyExportMetadata } from "./familyExportMetadata";
import { LikelihoodProfiles } from "./LikelihoodProfiles";
import { MixedResultTable } from "./MixedResultTable";
import { SaturationChart } from "./SaturationChart";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function NonlinearResults({
  record,
  data,
  language,
}: {
  record: NonlinearRecord;
  data: ExperimentData;
  language: Language;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const result = record.result;
  const factor = data.factors.find((f) => f.id === record.input.factorId);
  const response = data.responses.find((r) => r.id === record.input.responseId);
  const xLabel = `${factor?.name ?? record.input.factorId}${factor?.unit ? ` [${factor.unit}]` : ""}`;
  const yLabel = `${response?.name ?? record.input.responseId}${response?.unit ? ` [${response.unit}]` : ""}`;
  const parameterLabels = nonlinearParameterLabels(
    result.model,
    factor?.unit ?? "",
    response?.unit ?? "",
  );
  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const metadata = familyExportMetadata(record);
  return (
    <section data-testid="saturation-result">
      <div data-section="summary">
        <h3>
          {t("saturation.modelNames." + result.model)} — {yLabel}
        </h3>
        <dl className="facts">
          {result.parameters.map((parameter, i) => (
            <Fragment key={parameter.name}>
              <dt>{parameterLabels[i]}</dt>
              <dd>
                <StatNumber
                  stat={{ status: "defined", value: parameter.estimate }}
                  language={language}
                />
              </dd>
            </Fragment>
          ))}
        </dl>
        <p>
          n = {result.n} · R² = <StatNumber stat={result.rSquared} language={language} digits={4} />
        </p>
        {result.issues
          .filter((issue) =>
            ["nonlinear.inference_unavailable", "nonlinear.profile_budget"].includes(issue.code),
          )
          .map((issue) => (
            <p
              key={issue.code}
              role="status"
              className="stale-notice"
              data-testid="saturation-warning"
            >
              {issueMessage(t, issue)}
            </p>
          ))}
        <p className="muted small">
          {t(record.result.profiles ? "profile.fitNote" : "saturation.note")}
        </p>
        {(record.input.request.profile ||
          record.input.request.initial ||
          record.input.request.lower ||
          record.input.request.upper) && (
          <MixedResultTable
            id="nonlinear-recorded-options"
            title={t("saturationOptions.title")}
            columns={[
              { key: "parameter", label: t("saturation.parameter") },
              { key: "initial", label: t("saturationOptions.initial") },
              { key: "lower", label: t("saturationOptions.lower") },
              { key: "upper", label: t("saturationOptions.upper") },
            ]}
            rows={parameterLabels.map((name, i) => [
              name,
              record.input.request.initial?.[i] ?? t("saturationOptions.automatic"),
              record.input.request.lower?.[i] ?? t("saturationOptions.defaultPositive"),
              record.input.request.upper?.[i] ?? t("saturationOptions.noUpper"),
            ])}
            metadata={metadata}
            fileBase="nonlinear"
            language={language}
            onDone={setNotice}
          />
        )}
      </div>
      <div data-section="tables">
        <h3>{t("saturation.parameters")}</h3>
        <TableExportButtons
          label={`${t("saturation.parameters")} (CSV)`}
          suffix="saturation-parameters"
          sheet={t("saturation.parameters")}
          header={["parameter", "estimate", "std_error", "ci_lower", "ci_upper", "p_value"]}
          rows={result.parameters.map((p) => [
            p.name,
            p.estimate,
            num(p.stdError),
            num(p.ciLower),
            num(p.ciUpper),
            num(p.pValue),
          ])}
          metadata={metadata}
          fileBase="saturacao"
          onDone={setNotice}
        />
        {notice && <p role="status">{notice}</p>}
        <div className="grid-scroll">
          <table className="results-table" data-testid="saturation-parameters">
            <thead>
              <tr>
                <th scope="col">{t("saturation.parameter")}</th>
                <th scope="col">{t("saturation.estimate")}</th>
                <th scope="col">{t("saturation.se")}</th>
                <th scope="col">{t("saturation.ci")}</th>
                <th scope="col">p</th>
              </tr>
            </thead>
            <tbody>
              {result.parameters.map((p, i) => (
                <tr key={p.name}>
                  <th scope="row">{parameterLabels[i]}</th>
                  <td className="num">
                    <StatNumber
                      stat={{ status: "defined", value: p.estimate }}
                      language={language}
                      digits={6}
                    />
                  </td>
                  <td className="num">
                    <StatNumber stat={p.stdError} language={language} digits={4} />
                  </td>
                  <td className="num">
                    <StatNumber stat={p.ciLower} language={language} /> ;{" "}
                    <StatNumber stat={p.ciUpper} language={language} />
                  </td>
                  <td className="num">
                    {num(p.pValue) === null ? "—" : formatP(num(p.pValue) as number, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <LikelihoodProfiles record={record} language={language} names={parameterLabels} />
      <div data-section="diagnostics">
        <h3>{t("family.diagnostics")}</h3>
        <TableExportButtons
          label={`${t("family.residual")} (CSV)`}
          suffix="nonlinear-residuals"
          sheet="Residuals"
          header={["fit_row", "x", "observed", "residual"]}
          rows={record.input.request.x.map((x, i) => [
            i + 1,
            x,
            record.input.request.y[i]!,
            result.residuals[i]!,
          ])}
          metadata={metadata}
          fileBase="saturacao"
          onDone={setNotice}
        />
        <TableExportButtons
          label={`${t("saturation.chartLabel")} (CSV)`}
          suffix="nonlinear-curve"
          sheet="Curve"
          header={["x", "fitted", "confidence_lower", "confidence_upper"]}
          rows={result.curve.map((p) => [p.x, p.y, num(p.lower), num(p.upper)])}
          metadata={metadata}
          fileBase="saturacao"
          onDone={setNotice}
        />
        <p data-testid="saturation-stats">
          n = {result.n} · σ = {fmt(num(result.sigma), 5)} · R² = {fmt(num(result.rSquared), 5)} ·{" "}
          {t("saturation.starts", {
            reached: result.startsReachingBest,
            run: result.startsRun,
          })}
        </p>
        {result.issues
          .filter(
            (issue) =>
              !["nonlinear.inference_unavailable", "nonlinear.profile_budget"].includes(issue.code),
          )
          .map((i) => (
            <p key={i.code} role="status" className="muted" data-testid="saturation-warning">
              {issueMessage(t, i)}
            </p>
          ))}
      </div>
      <div data-section="charts">
        <SaturationChart
          points={record.input.request.x.map((x, i) => ({ x, y: record.input.request.y[i]! }))}
          curve={result.curve}
          xLabel={xLabel}
          yLabel={yLabel}
          label={`${t("saturation.chartLabel")} — ${t(`saturation.modelNames.${result.model}`)}`}
          level={(1 - record.input.request.alpha) * 100}
          language={language}
        />
      </div>
    </section>
  );
}
