// U10/U16 — otimização no relatório: somente leitura (estado, fatos, convergência, candidatos e
// compromissos); sem editor de objetivos nem botões.
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { issueMessage } from "../../services/errors/presentation";
import { useProject } from "../../state/ProjectContext";
import { BlockContextNote } from "../results/BlockContextNote";
import { formatFactParams } from "../results/ComparisonInterpretation";
import { CandidateSummary, CandidateTable } from "./CandidateTable";
import { OptimizationCriterion } from "./GoalSummary";
import { hasOverflowingDesirabilitySpan } from "./legacyDesirability";
import { TradeOffs } from "./TradeOffs";

export function OptimizationReport({ language }: { language: Language }) {
  const { t } = useTranslation();
  const { t: tr } = useTranslation("results");
  const state = useProject();
  const result = state.optimization.result;
  const record = [...state.analyses]
    .reverse()
    .find((a) => a.signature === state.optimization.signature);
  const variables = state.revisions.find((r) => r.id === record?.revisionId)?.data ?? state;
  if (!result) return null;
  return (
    <section aria-labelledby="optimization-title">
      <h2 id="optimization-title">{t("optimization.title")}</h2>
      <p>{t(`optimization.status.${result.status}`)}</p>
      {result.provenance.methodVersion < 3 &&
        record?.options.optimization?.responses.some(({ goal }) =>
          hasOverflowingDesirabilitySpan(goal),
        ) && <p>{t("optimization.legacyDesirability")}</p>}
      <BlockContextNote block={result.block} />
      {record?.options.optimization && (
        <OptimizationCriterion setup={record.options.optimization} variables={variables} />
      )}
      <ul className="facts-list">
        {result.facts.map((fact) => (
          <li key={fact.key + JSON.stringify(fact.params)}>
            {tr(`facts.${fact.key}`, formatFactParams(fact, language))}
          </li>
        ))}
        {result.issues.map((issue) => (
          <li key={issue.code}>{issueMessage(t, issue)}</li>
        ))}
      </ul>
      <p className="small">
        {t("optimization.convergence", {
          starts: result.convergence.starts,
          converged: result.convergence.convergedStarts,
          feasible: result.convergence.feasibleStarts,
          distinct: result.convergence.distinctOptima,
          best: result.convergence.bestSolutionStarts,
          seed: String(result.convergence.seed),
        })}
      </p>
      {result.candidates.length > 0 && (
        <>
          <CandidateSummary result={result} language={language} />
          <CandidateTable result={result} language={language} variables={variables} />
          <TradeOffs result={result} language={language} />
        </>
      )}
    </section>
  );
}
