import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type {
  AdvancedMixedResult,
  ExperimentData,
  MixedModelRequest,
  RepeatedRecord,
} from "../../services/engine";
import { familyExportMetadata } from "./familyExportMetadata";
import { MixedProfileChart } from "./MixedProfileChart";
import { type MixedCell, MixedResultTable } from "./MixedResultTable";
import { StatNumber } from "./StatCell";
export function MixedAdvancedResults({
  record,
  data,
  result,
  language,
  responseLabel,
}: {
  record: RepeatedRecord;
  data: ExperimentData;
  result: AdvancedMixedResult;
  language: Language;
  responseLabel: string;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const metadata = familyExportMetadata(record);
  const factor = (id: string) =>
    id === result.timeFactorId
      ? t("mixedAdvanced.time")
      : (data.factors.find((f) => f.id === id)?.name ?? id);
  const time = (index: number) =>
    result.timeLabels.find((v) => v.index === index)?.label ?? String(index);
  const unit = (id: string) => record.input.unitLabels?.[id] ?? id;
  const column = (key: string, label: string, p = false) => ({ key, label, p });
  const inference = [
    column("estimate", t("repeated.mixed.estimate")),
    column("std_error", t("repeated.mixed.se")),
    column("df", t("repeated.mixed.df")),
    column("ci_lower", t("mixedAdvanced.lower")),
    column("ci_upper", t("mixedAdvanced.upper")),
  ];
  const common = { language, metadata, onDone: setNotice };
  const termRows: MixedCell[][] = result.termTests.map((test) => [
    test.columns.length
      ? test.columns.join("; ")
      : `${test.term.type === "interaction" ? test.term.factorIds.map(factor).join(" × ") : factor(test.term.factorId)} — ${t("mixedAdvanced.zeroRank")}`,
    test.numeratorDf,
    test.fValue,
    test.denominatorDf,
    test.pValue,
  ]);
  return (
    <>
      <div data-section="tables">
        <MixedResultTable
          {...common}
          id="mixed-term-tests"
          title={t("mixedAdvanced.termTests")}
          columns={[
            column("hypothesis_columns", t("repeated.mixed.term")),
            column("numerator_df", t("mixedAdvanced.numeratorDf")),
            column("f", "F"),
            column("denominator_df", t("mixedAdvanced.denominatorDf")),
            column("p", "p", true),
          ]}
          rows={termRows}
        />
        <p className="muted small">{t("mixedAdvanced.hypothesis")}</p>
        {result.parameters.length > 0 && (
          <MixedResultTable
            {...common}
            id="mixed-covariance-parameters"
            title={t("mixedAdvanced.covarianceParameters")}
            columns={[
              column("parameter", t("repeated.mixed.term")),
              column("value", t("repeated.mixed.estimate")),
            ]}
            rows={result.parameters.map((p) => [t(`mixedAdvanced.${p.name}`), p.value])}
          />
        )}
        {result.covariance === "unstructured" && (
          <MixedResultTable
            {...common}
            id="mixed-covariance-matrix"
            title={t("mixedAdvanced.covarianceMatrix")}
            columns={[
              column("occasion", t("mixedAdvanced.time")),
              ...result.occasions.map((value, index) =>
                column(`occasion_${index + 1}`, time(value)),
              ),
            ]}
            rows={result.occasions.map((value, i) => [
              time(value),
              ...result.occasions.map(
                (_, j) => result.covarianceMatrix[i * result.occasions.length + j] ?? null,
              ),
            ])}
          />
        )}
        {result.marginalMeans.length > 0 && (
          <>
            <MixedResultTable
              {...common}
              id="mixed-marginal-means"
              title={t("mixedAdvanced.marginalMeans")}
              columns={[
                column("factor", t("mixedAdvanced.factor")),
                column("level", t("mixedAdvanced.level")),
                ...inference,
              ]}
              rows={result.marginalMeans.map((m) => [
                factor(m.factorId),
                m.factorId === result.timeFactorId ? time(Number(m.level)) : m.level,
                m.inference.estimate,
                m.inference.stdError,
                m.inference.df,
                m.inference.ciLower,
                m.inference.ciUpper,
              ])}
            />
            <MixedResultTable
              {...common}
              id="mixed-marginal-comparisons"
              title={t("mixedAdvanced.comparisons")}
              columns={[
                column("factor", t("mixedAdvanced.factor")),
                column("first", t("mixedAdvanced.first")),
                column("second", t("mixedAdvanced.second")),
                ...inference,
                column("p", "p", true),
                column("adjusted_p", t("mixedAdvanced.adjustedP"), true),
                column("family_size", "m"),
              ]}
              rows={result.comparisons.map((c) => [
                factor(c.factorId),
                c.factorId === result.timeFactorId ? time(Number(c.first)) : c.first,
                c.factorId === result.timeFactorId ? time(Number(c.second)) : c.second,
                c.inference.estimate,
                c.inference.stdError,
                c.inference.df,
                c.inference.ciLower,
                c.inference.ciUpper,
                c.pValue,
                c.adjustedPValue,
                c.familySize,
              ])}
            />
            <p className="muted small">
              {t("mixedAdvanced.intervalAdjustment")} {t("mixedAdvanced.adjustment")}:{" "}
              {result.adjustment === "holm" ? "Holm" : "Bonferroni"}.
            </p>
          </>
        )}
      </div>
      <div data-section="diagnostics">
        {record.result.type === "mixed" && record.result.excluded.length > 0 && (
          <MixedResultTable
            {...common}
            id="mixed-excluded-observations"
            title={t("mixedAdvanced.excluded")}
            columns={[
              column("observation_id", t("data.rowLabel")),
              column("reason", t("mixedAdvanced.reason")),
            ]}
            rows={record.result.excluded.map((e) => [
              e.observationId,
              t(`mixedAdvanced.exclusionReasons.${e.reason}`),
            ])}
          />
        )}
        <h4>{t("mixedAdvanced.referenceGrid")}</h4>
        <p>
          {t("mixedAdvanced.equalWeights")} · {t("mixedAdvanced.cells")}:{" "}
          {result.referenceGrid.cells}
        </p>
        <ul>
          {result.referenceGrid.categorical.map((f) => (
            <li key={f.factorId}>
              {factor(f.factorId)}:{" "}
              {f.factorId === result.timeFactorId
                ? f.levels.map((v) => time(Number(v))).join("; ")
                : f.levels.join("; ")}
            </li>
          ))}
        </ul>
        {result.referenceGrid.numeric.map((r) => (
          <p key={r.factorId}>
            {factor(r.factorId)} ={" "}
            <StatNumber stat={{ status: "defined", value: r.value }} language={language} />
          </p>
        ))}
        <dl className="facts">
          <dt>{t("mixedAdvanced.reml")}</dt>
          <dd>
            <StatNumber
              stat={{ status: "defined", value: result.remlLogLikelihood }}
              language={language}
            />
          </dd>
          <dt>{t("mixedAdvanced.iterations")}</dt>
          <dd>{result.iterations}</dd>
          <dt>{t("mixedAdvanced.gradient")}</dt>
          <dd>
            <StatNumber
              stat={{ status: "defined", value: result.gradientNorm }}
              language={language}
            />
          </dd>
        </dl>
      </div>
      {result.meanProfiles.length > 0 && (
        <div data-section="charts">
          <MixedProfileChart
            result={result}
            unitCount={record.result.type === "mixed" ? record.result.nGroups : 0}
            unitLabel={unit}
            timeLabel={time}
            responseLabel={responseLabel}
            language={language}
            metadata={JSON.stringify(metadata)}
          />
          <p className="muted small">{t("mixedAdvanced.profileNote")}</p>
          <MixedResultTable
            {...common}
            id="mixed-mean-profile-source"
            title={t("mixedAdvanced.meanProfile")}
            columns={[
              column("time", t("mixedAdvanced.time")),
              column("observations", "n"),
              column("units", t("mixedAdvanced.unitCount")),
              column("observed_mean", t("mixedAdvanced.observedMean")),
              ...inference,
            ]}
            rows={result.meanProfiles.map((p) => [
              time(p.time),
              p.n,
              p.units,
              p.observedMean,
              p.inference.estimate,
              p.inference.stdError,
              p.inference.df,
              p.inference.ciLower,
              p.inference.ciUpper,
            ])}
          />
          <MixedResultTable
            {...common}
            id="mixed-profile-source"
            title={t("mixedAdvanced.profileSource")}
            columns={[
              column("observation_id", t("data.rowLabel")),
              column("unit", t("repeated.unit.label")),
              column("time", t("mixedAdvanced.time")),
              column("observed", responseLabel),
              column("population", t("mixedAdvanced.population")),
              column("conditional", t("mixedAdvanced.conditional")),
              column("residual", t("family.residual")),
            ]}
            rows={result.profiles.map((p) => [
              p.observationId,
              unit(p.unit),
              p.time === null ? null : time(p.time),
              p.observed,
              p.population,
              p.conditional,
              p.residual,
            ])}
          />
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
    </>
  );
}

export function MixedAdvancedSummary({
  result,
  input,
  data,
  language,
}: {
  result: AdvancedMixedResult;
  input?: MixedModelRequest;
  data: ExperimentData;
  language: Language;
}) {
  const { t } = useTranslation();
  const name = (id: string) => data.factors.find((f) => f.id === id)?.name ?? id;
  const terms =
    input?.spec.terms.map((term) =>
      term.type === "main"
        ? name(term.factorId)
        : term.type === "power"
          ? `${name(term.factorId)}^${term.degree}`
          : term.factorIds.map(name).join(" × "),
    ) ?? [];
  if (input?.spec.intercept) terms.unshift(t("mixedAdvanced.intercept"));
  if (result.timeEffect !== "none")
    terms.push(
      `${t("mixedAdvanced.time")} (${t(`mixedAdvanced.timeEffects.${result.timeEffect}`)})`,
    );
  const confidenceLevel = input?.spec.confidenceLevel;
  return (
    <div data-testid="mixed-advanced-summary">
      <p>
        <strong>{t(`mixedAdvanced.structures.${result.covariance}`)}</strong> ·{" "}
        {t(result.coding === "sum" ? "mixedAdvanced.sum" : "mixedAdvanced.treatment")}
      </p>
      <p className="muted">{t(`mixedAdvanced.structureHelp.${result.covariance}`)}</p>
      <p>
        {t("mixedAdvanced.fixedModel")}: {terms.join(" + ")}.
      </p>
      {confidenceLevel !== undefined && (
        <p>
          {t("mixedAdvanced.confidence")}:{" "}
          {new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 2 }).format(
            confidenceLevel,
          )}
          .
        </p>
      )}
      <p className="muted small">{t("mixedAdvanced.inference")}</p>
    </div>
  );
}
