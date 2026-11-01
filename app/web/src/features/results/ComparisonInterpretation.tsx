// Explicação curta da comparação: conclusão, evidência e próximo passo + fatos e avisos do motor (C18).
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatP, formatSignificant } from "../../i18n/format";
import type { Fact, Issue, OneWayResult } from "../../services/engine";
import { issueMessage } from "../../services/errors/presentation";
import { factParams } from "./Interpretation";

const NUMERIC_FACT_PARAMS: Record<string, "p" | "sig"> = {
  f: "sig",
  p: "p",
  alpha: "sig",
  ratio: "sig",
  r2: "sig",
  adjusted: "sig",
};

/** Formata os parâmetros numéricos de um fato de acordo com o idioma. */
export function formatFactParams(fact: Fact, language: Language): Record<string, string | number> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(fact.params)) {
    const kind = NUMERIC_FACT_PARAMS[key];
    const n = Number(value);
    params[key] =
      kind && Number.isFinite(n)
        ? kind === "p"
          ? formatP(n, language)
          : formatSignificant(n, language, 5)
        : value;
  }
  return factParams(params);
}

interface Props {
  result: OneWayResult;
  responseName: string;
  factorName: string;
  language: Language;
}

export function ComparisonInterpretation({ result, responseName, factorName, language }: Props) {
  const { t } = useTranslation("results");
  const { t: tc } = useTranslation();
  const n = result.groups.reduce((total, g) => total + g.n, 0);
  const { anova, tukey } = result;
  const different = tukey?.comparisons.filter((c) => c.significant === true).length ?? 0;
  const evidence =
    anova.f.status === "defined" && anova.pValue.status === "defined"
      ? t("comparison.summary.evidenceDefined", {
          df1: anova.between.df,
          df2: anova.within.df,
          f: formatSignificant(anova.f.value, language, 5),
          p: formatP(anova.pValue.value, language),
          different: tukey ? different : "—",
          total: tukey?.comparisonsCount ?? "—",
          alpha: formatSignificant(result.alpha, language, 4),
        })
      : t("comparison.summary.evidenceUndefined");
  return (
    <section className="panel" aria-labelledby="interpretation-title" data-testid="interpretation">
      <h3 id="interpretation-title" className="sr-only">
        {t("labels.conclusion")}
      </h3>
      <dl className="interpretation">
        <dt>{t("labels.conclusion")}</dt>
        <dd>
          {t("comparison.summary.conclusion", {
            groups: result.groups.length,
            factor: factorName,
            n,
            response: responseName,
          })}
        </dd>
        <dt>{t("labels.evidence")}</dt>
        <dd>{evidence}</dd>
        <dt>{t("labels.nextStep")}</dt>
        <dd>
          {result.letters
            ? t("comparison.summary.nextStepWithLetters")
            : t("comparison.summary.nextStepNoLetters")}
        </dd>
      </dl>
      <ul className="facts-list">
        {result.facts.map((fact) => (
          <li key={fact.key + JSON.stringify(fact.params)}>
            {t(`facts.${fact.key}`, formatFactParams(fact, language))}
          </li>
        ))}
      </ul>
      {result.issues.length > 0 && (
        <div role="note">
          <h4>{t("comparison.warnings")}</h4>
          <ul className="facts-list">
            {result.issues.map((issue: Issue) => (
              <li key={issue.code + JSON.stringify(issue.params)}>{issueMessage(tc, issue)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
