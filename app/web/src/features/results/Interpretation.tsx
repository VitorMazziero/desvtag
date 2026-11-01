// Explicação curta: conclusão, evidência e próximo passo, mais os fatos do motor (C18).
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import type { DescriptiveResult } from "../../services/engine";

/** Parâmetros dos fatos chegam como texto; o plural do i18next exige `count` numérico. */
export function factParams(params: Record<string, string>): Record<string, string | number> {
  const { count, ...rest } = params;
  const n = count === undefined ? Number.NaN : Number(count);
  return Number.isFinite(n) ? { ...rest, count: n } : params;
}

interface Props {
  result: DescriptiveResult;
  responseName: string;
  responseUnit: string;
  language: Language;
}

export function Interpretation({ result, responseName, responseUnit, language }: Props) {
  const { t } = useTranslation("results");
  const { overall } = result;
  const evidence =
    overall.mean.status === "defined" && overall.sd.status === "defined"
      ? t("summary.evidence", {
          mean: formatNumber(overall.mean.value, language),
          sd: formatNumber(overall.sd.value, language),
          unit: responseUnit ? ` ${responseUnit}` : "",
        })
      : t("summary.evidenceUndefined");
  return (
    <section className="panel" aria-labelledby="interpretation-title" data-testid="interpretation">
      <h3 id="interpretation-title" className="sr-only">
        {t("labels.conclusion")}
      </h3>
      <dl className="interpretation">
        <dt>{t("labels.conclusion")}</dt>
        <dd>
          {t("summary.conclusion", {
            valid: overall.nValid,
            total: overall.nTotal,
            response: responseName,
          })}
        </dd>
        <dt>{t("labels.evidence")}</dt>
        <dd>{evidence}</dd>
        <dt>{t("labels.nextStep")}</dt>
        <dd>
          {result.groups.length > 0 ? t("summary.nextStepGroups") : t("summary.nextStepNoGroups")}
        </dd>
      </dl>
      <ul className="facts-list">
        {result.facts.map((fact) => (
          <li key={fact.key + JSON.stringify(fact.params)}>
            {t(`facts.${fact.key}`, factParams(fact.params))}
          </li>
        ))}
      </ul>
    </section>
  );
}
