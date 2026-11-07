import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { MixtureRecord } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { GoalSummary } from "../optimization/GoalSummary";
import { familyExportMetadata } from "./familyExportMetadata";
import { MixedResultTable } from "./MixedResultTable";

export function MixtureOptimumResults({
  record,
  language,
  report = false,
}: {
  record: MixtureRecord;
  language: Language;
  report?: boolean;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const result = record.result.optimum,
    spec = record.input.request.optimization;
  if (!result || !spec) return null;
  const candidate =
    result.candidates.find((candidate) => candidate.rank === selected) ?? result.candidates[0];
  const names = record.input.request.componentNames;
  const metadata = {
    ...familyExportMetadata(record),
    searchAlgorithm: result.algorithm,
    candidateCompositions: JSON.stringify(
      result.candidates.map(({ rank, proportions }) => ({ rank, proportions })),
    ),
  };
  const num = (value: number | null) =>
    value === null ? "—" : formatSignificant(value, language, 6);
  return (
    <section data-section="optimization" data-testid="mixture-optimum-results">
      <h3>{t("mixture.analysis.optimTitle")}</h3>
      <p role="status" data-testid="mixture-optimum-status">
        {t(`optimization.status.${result.status}`)}
      </p>
      <p className="muted">{t("mixture.analysis.optimNoGlobalClaim")}</p>
      <p data-testid="mixture-optimum-work">
        {t("mixture.analysis.optimWork", {
          executed: result.starts.length,
          requested: result.requestedStarts,
          converged: result.starts.filter((start) => start.stop === "stepTolerance").length,
          limited: result.starts.filter(
            (start) => start.stop === "startBudget" || start.stop === "evaluationBudget",
          ).length,
          evaluations: result.evaluations,
        })}
      </p>
      <p className="muted small">
        {t("mixture.analysis.optimDimension", { dimension: result.dimension })}{" "}
        {t("optimization.search.seed")}: {spec.setup.search.seed}
      </p>
      {result.dimension === 0 && <p>{t("mixture.analysis.optimPointDomain")}</p>}
      {result.issues.map((issue) => (
        <p role="status" className="error" key={issue.code}>
          {issueMessage(t, issue)}
        </p>
      ))}
      <div className="grid-scroll">
        <table className="results-table" data-testid="mixture-optimum-goals">
          <caption>{t("mixture.analysis.optimGoals")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("mixture.analysis.response")}</th>
              <th scope="col">{t("optimization.goals.type")}</th>
              <th scope="col">{t("optimization.goals.importance")}</th>
              <th scope="col">{t("optimization.goals.limitMin")}</th>
              <th scope="col">{t("optimization.goals.limitMax")}</th>
            </tr>
          </thead>
          <tbody>
            {spec.setup.responses.map((goal) => {
              const bounds = spec.setup.limits.find(
                (limit) => limit.responseId === goal.responseId,
              );
              return (
                <tr key={goal.responseId}>
                  <th scope="row">
                    {spec.data.find((data) => data.responseId === goal.responseId)?.name ??
                      goal.responseId}
                  </th>
                  <td>
                    <GoalSummary goal={goal.goal} />
                  </td>
                  <td className="num">{num(goal.importance)}</td>
                  <td className="num">{num(bounds?.min ?? null)}</td>
                  <td className="num">{num(bounds?.max ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <MixedResultTable
        report={report}
        id="mixture-optimum-candidates"
        title={t("mixture.analysis.optimCandidates")}
        language={language}
        metadata={metadata}
        onDone={setNotice}
        fileBase="mixture-optimum"
        columns={[
          { key: "rank", label: t("mixture.analysis.optimRank") },
          ...names.map((name, i) => ({ key: `fraction_${i + 1}`, label: name })),
          { key: "desirability", label: t("mixture.analysis.optimD") },
          { key: "starts", label: t("mixture.analysis.optimStarts") },
        ]}
        rows={result.candidates.map((candidate) => [
          candidate.rank,
          ...candidate.proportions,
          candidate.desirability,
          candidate.starts,
        ])}
      />
      {candidate && (
        <>
          {!report && (
            <label className="field" data-report-skip>
              <span>{t("mixture.analysis.optimRank")}</span>
              <select
                data-testid="mixture-optimum-candidate"
                value={candidate.rank}
                onChange={(event) => setSelected(Number(event.target.value))}
              >
                {result.candidates.map((candidate) => (
                  <option key={candidate.rank} value={candidate.rank}>
                    {candidate.rank} · D = {num(candidate.desirability)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>
            {t("mixture.analysis.optimIntervals", {
              level: formatSignificant(100 * (1 - spec.setup.alpha), language, 4),
            })}
          </p>
          <MixedResultTable
            report={report}
            id="mixture-optimum-predictions"
            title={
              report
                ? t("mixture.analysis.optimAllPredictions")
                : `${t("mixture.analysis.optimPredictions")} ${candidate.rank}`
            }
            language={language}
            metadata={metadata}
            onDone={setNotice}
            fileBase="mixture-optimum"
            columns={[
              { key: "rank", label: t("mixture.analysis.optimRank") },
              { key: "response", label: t("mixture.analysis.response") },
              { key: "prediction", label: t("mixture.analysis.optimPredicted") },
              { key: "mean_lower", label: t("mixture.analysis.optimMeanLow") },
              { key: "mean_upper", label: t("mixture.analysis.optimMeanHigh") },
              { key: "prediction_lower", label: t("mixture.analysis.optimPredictionLow") },
              { key: "prediction_upper", label: t("mixture.analysis.optimPredictionHigh") },
              { key: "desirability", label: t("mixture.analysis.optimIndividualD") },
            ]}
            rows={(report ? result.candidates : [candidate]).flatMap((candidate) =>
              candidate.predictions.map((prediction) => [
                candidate.rank,
                prediction.name,
                prediction.prediction.fitted,
                prediction.prediction.meanLower,
                prediction.prediction.meanUpper,
                prediction.prediction.predictionLower,
                prediction.prediction.predictionUpper,
                prediction.desirability,
              ]),
            )}
          />
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
