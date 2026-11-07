import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { ExperimentData, RepeatedRecord, Stat } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { familyExportMetadata } from "./familyExportMetadata";
import { MixedAdvancedResults, MixedAdvancedSummary } from "./MixedAdvancedResults";
import { StatNumber } from "./StatCell";
import { TableExportButtons } from "./TableExportButtons";

const num = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function RepeatedResults({
  record,
  data,
  language,
}: {
  record: RepeatedRecord;
  data: ExperimentData;
  language: Language;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const unitLabel = (id: string) => record.input.unitLabels?.[id] ?? id;
  const paired = record.result.type === "paired" ? record.result : null;
  const mixed = record.result.type === "mixed" ? record.result : null;
  const responseId =
    record.input.type === "paired" ? record.input.responseId : record.input.request.spec.responseId;
  const response = data.responses.find((r) => r.id === responseId);
  const responseLabel = `${response?.name ?? responseId}${response?.unit ? ` [${response.unit}]` : ""}`;
  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const metadata = familyExportMetadata(record);
  return (
    <>
      <div data-section="summary">
        <h3>
          {mixed?.advanced?.covariance === "unstructured"
            ? t("mixedAdvanced.unTitle")
            : t(`repeated.${record.input.type}.title`)}{" "}
          — {responseLabel}
        </h3>
        {paired && <p>{t("repeated.paired.result", { n: paired.n })}</p>}
        {paired && (
          <dl className="facts">
            <dt>{t("repeated.paired.meanDiff")}</dt>
            <dd>
              <StatNumber stat={paired.tTest.meanDifference} language={language} />
              {response?.unit ? ` ${response.unit}` : ""}
            </dd>
            <dt>{t("repeated.paired.ci")}</dt>
            <dd>
              <StatNumber stat={paired.tTest.ciLower} language={language} /> ;{" "}
              <StatNumber stat={paired.tTest.ciUpper} language={language} />
            </dd>
          </dl>
        )}
        {mixed && (
          <>
            {mixed.issues
              .filter((issue) => issue.code === "mixed.inference_budget")
              .map((issue) => (
                <p
                  key={issue.code}
                  role="status"
                  className="stale-notice"
                  data-testid="mixed-budget-warning"
                >
                  {issueMessage(t, issue)}
                </p>
              ))}
            {mixed.advanced && (
              <MixedAdvancedSummary
                result={mixed.advanced}
                input={record.input.type === "mixed" ? record.input.request : undefined}
                data={data}
                language={language}
              />
            )}
            <p>{t("repeated.mixed.result", { n: mixed.nObservations, g: mixed.nGroups })}</p>
            {mixed.advanced?.covariance !== "unstructured" && (
              <p>
                ICC = <StatNumber stat={mixed.icc} language={language} digits={4} />
              </p>
            )}
          </>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      {paired && (
        <section data-testid="paired-result" data-section="tables">
          <TableExportButtons
            label={`${t("repeated.paired.result", { n: paired.n })} (CSV)`}
            suffix="paired-statistics"
            sheet="Paired"
            header={["statistic", "value", "undefined_reason"]}
            rows={[
              ["mean_difference", paired.tTest.meanDifference],
              ["sd_difference", paired.tTest.sdDifference],
              ["t", paired.tTest.t],
              ["p_t", paired.tTest.pValue],
              ["ci_lower", paired.tTest.ciLower],
              ["ci_upper", paired.tTest.ciUpper],
              ["effect_size", paired.tTest.effectSize],
              ...(paired.wilcoxon ? [["p_wilcoxon", paired.wilcoxon.pValue] as const] : []),
            ].map(([name, value]) => [
              name as string,
              num(value as Stat),
              (value as Stat).status === "defined" ? "" : (value as { reason: string }).reason,
            ])}
            metadata={metadata}
            fileBase="pareado"
            onDone={setNotice}
          />
          <h4>{t("repeated.paired.result", { n: paired.n })}</h4>
          <div className="grid-scroll">
            <table className="results-table">
              <tbody>
                <tr>
                  <th scope="row">{t("repeated.paired.meanDiff")}</th>
                  <td className="num">
                    <StatNumber stat={paired.tTest.meanDifference} language={language} />
                  </td>
                </tr>
                <tr>
                  <th scope="row">{t("repeated.paired.sd")}</th>
                  <td className="num">
                    <StatNumber stat={paired.tTest.sdDifference} language={language} />
                  </td>
                </tr>
                <tr>
                  <th scope="row">t ({paired.tTest.df} gl)</th>
                  <td className="num">
                    <StatNumber stat={paired.tTest.t} language={language} digits={4} />
                  </td>
                </tr>
                <tr>
                  <th scope="row">p (t)</th>
                  <td data-testid="paired-p">
                    <StatNumber stat={paired.tTest.pValue} language={language} p />
                  </td>
                </tr>
                <tr>
                  <th scope="row">{t("repeated.paired.ci")}</th>
                  <td className="num">
                    {fmt(num(paired.tTest.ciLower))} ; {fmt(num(paired.tTest.ciUpper))}
                  </td>
                </tr>
                <tr>
                  <th scope="row">
                    d<sub>z</sub>
                  </th>
                  <td className="num">
                    <StatNumber stat={paired.tTest.effectSize} language={language} digits={4} />
                  </td>
                </tr>
                {paired.wilcoxon && (
                  <>
                    <tr>
                      <th scope="row">{t("repeated.paired.wilcoxon")}</th>
                      <td className="num">
                        W = {fmt(paired.wilcoxon.statistic, 5)} (n = {paired.wilcoxon.nUsed};{" "}
                        {t(`repeated.paired.method.${paired.wilcoxon.method}`)})
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">p (Wilcoxon)</th>
                      <td data-testid="wilcoxon-p">
                        <StatNumber stat={paired.wilcoxon.pValue} language={language} p />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted small">{t("repeated.paired.note")}</p>
        </section>
      )}

      {mixed && (
        <section data-testid="mixed-result" data-section="tables">
          <TableExportButtons
            label={`${t("repeated.mixed.fixed")} (CSV)`}
            suffix="mixed-coefficients"
            sheet="Fixed effects"
            header={["term", "estimate", "std_error", "df", "t", "p", "ci_lower", "ci_upper"]}
            rows={mixed.coefficients.map((c) => [
              c.label,
              c.estimate,
              num(c.stdError),
              num(c.df),
              num(c.tValue),
              num(c.pValue),
              num(c.ciLower),
              num(c.ciUpper),
            ])}
            metadata={metadata}
            fileBase="modelo-misto"
            onDone={setNotice}
          />
          <h4>{t("repeated.mixed.result", { n: mixed.nObservations, g: mixed.nGroups })}</h4>
          <div className="grid-scroll">
            <table className="results-table" data-testid="mixed-coefficients">
              <thead>
                <tr>
                  <th scope="col">{t("repeated.mixed.term")}</th>
                  <th scope="col">{t("repeated.mixed.estimate")}</th>
                  <th scope="col">{t("repeated.mixed.se")}</th>
                  <th scope="col">{t("repeated.mixed.df")}</th>
                  <th scope="col">t</th>
                  <th scope="col">p</th>
                  <th scope="col">{t("mixedAdvanced.lower")}</th>
                  <th scope="col">{t("mixedAdvanced.upper")}</th>
                </tr>
              </thead>
              <tbody>
                {mixed.coefficients.map((c) => (
                  <tr key={c.label}>
                    <th scope="row">{c.label}</th>
                    <td className="num">
                      <StatNumber
                        stat={{ status: "defined", value: c.estimate }}
                        language={language}
                        digits={6}
                      />
                    </td>
                    <td className="num">
                      <StatNumber stat={c.stdError} language={language} digits={4} />
                    </td>
                    <td className="num">
                      <StatNumber stat={c.df} language={language} digits={4} />
                    </td>
                    <td className="num">
                      <StatNumber stat={c.tValue} language={language} digits={4} />
                    </td>
                    <td className="num">
                      <StatNumber stat={c.pValue} language={language} p />
                    </td>
                    <td className="num">
                      <StatNumber stat={c.ciLower} language={language} />
                    </td>
                    <td className="num">
                      <StatNumber stat={c.ciUpper} language={language} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mixed.advanced?.covariance !== "unstructured" && (
            <>
              <h4>{t("repeated.mixed.varianceComponents")}</h4>
              <TableExportButtons
                label={`${t("repeated.mixed.varianceComponents")} (CSV)`}
                suffix="mixed-variance"
                sheet="Variance components"
                header={["component", "value", "undefined_reason"]}
                rows={[
                  ["unit", mixed.varianceUnit],
                  ["residual", mixed.varianceResidual],
                  ["icc", mixed.icc],
                ].map(([name, value]) => [
                  name as string,
                  num(value as Stat),
                  (value as Stat).status === "defined" ? "" : (value as { reason: string }).reason,
                ])}
                metadata={metadata}
                fileBase="modelo-misto"
                onDone={setNotice}
              />
              <div className="grid-scroll" data-testid="variance-components">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("repeated.mixed.term")}</th>
                      <th scope="col">{t("repeated.mixed.estimate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [t("repeated.mixed.varianceUnit"), mixed.varianceUnit],
                      [t("repeated.mixed.varianceResidual"), mixed.varianceResidual],
                      ["ICC", mixed.icc],
                    ].map(([label, value]) => (
                      <tr key={label as string}>
                        <th scope="row">{label as string}</th>
                        <td className="num">
                          <StatNumber
                            stat={value as Stat}
                            language={language}
                            digits={label === "ICC" ? 4 : 5}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4>{t("repeated.mixed.randomEffects")}</h4>
              <TableExportButtons
                label={`${t("repeated.mixed.randomEffects")} (CSV)`}
                suffix="mixed-random-effects"
                sheet="Random effects"
                header={["unit_id", "unit", "observations", "blup"]}
                rows={mixed.randomEffects.map((r) => [
                  r.unit,
                  unitLabel(r.unit),
                  r.observations,
                  r.blup,
                ])}
                metadata={metadata}
                fileBase="modelo-misto"
                onDone={setNotice}
              />
              <div className="grid-scroll">
                <table className="results-table" data-testid="mixed-random-effects">
                  <thead>
                    <tr>
                      <th scope="col">{t("repeated.unit.label")}</th>
                      <th scope="col">n</th>
                      <th scope="col">BLUP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixed.randomEffects.map((r) => (
                      <tr key={r.unit}>
                        <th scope="row">{unitLabel(r.unit)}</th>
                        <td className="num">{r.observations}</td>
                        <td className="num">
                          <StatNumber
                            stat={{ status: "defined", value: r.blup }}
                            language={language}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {mixed.boundary && (
            <p role="status" className="muted">
              {t("repeated.mixed.boundary")}
            </p>
          )}
        </section>
      )}
      {mixed?.advanced && (
        <MixedAdvancedResults
          record={record}
          data={data}
          result={mixed.advanced}
          responseLabel={responseLabel}
          language={language}
        />
      )}
      <div data-section="diagnostics">
        {record.input.type === "paired" && (
          <>
            <p>
              {t("repeated.unit.summary", {
                complete: record.input.pairing.units.length,
                incomplete: record.input.pairing.incomplete.length,
                duplicated: record.input.pairing.duplicated.length,
              })}
            </p>
            {record.input.pairing.incomplete.length > 0 && (
              <p>
                {t("repeated.paired.incomplete", {
                  units: record.input.pairing.incomplete.map(unitLabel).join(", "),
                })}
              </p>
            )}
            {record.input.pairing.duplicated.length > 0 && (
              <p>
                {t("repeated.paired.duplicated", {
                  units: record.input.pairing.duplicated.map(unitLabel).join(", "),
                })}
              </p>
            )}
            {record.input.pairing.withoutUnit > 0 && (
              <p>{t("repeated.paired.withoutUnit", { count: record.input.pairing.withoutUnit })}</p>
            )}
          </>
        )}
        {record.result.issues
          .filter((issue) => issue.code !== "mixed.inference_budget")
          .map((issue) => (
            <p key={issue.code + JSON.stringify(issue.params)}>{issueMessage(t, issue)}</p>
          ))}
        {mixed && !mixed.advanced && <p>{t("repeated.mixed.note")}</p>}
      </div>
    </>
  );
}
