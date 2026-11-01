import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import type { DescriptiveResult, Stat, Summary } from "../../services/engine";
import type { FactorDraft } from "../../state/project";

interface Props {
  result: DescriptiveResult;
  responseName: string;
  factors: FactorDraft[];
  language: Language;
}

function StatCell({ stat, language }: { stat: Stat; language: Language }) {
  const { t } = useTranslation("results");
  if (stat.status === "defined")
    return <td className="num">{formatNumber(stat.value, language)}</td>;
  return (
    <td className="num undefined" title={t(`undefinedReason.${stat.reason}`)}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">
        {t("table.undefined")}: {t(`undefinedReason.${stat.reason}`)}
      </span>
    </td>
  );
}

function Row({
  label,
  summary,
  language,
}: {
  label: string;
  summary: Summary;
  language: Language;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">{summary.nValid}</td>
      <td className="num">{summary.nMissing}</td>
      <StatCell stat={summary.mean} language={language} />
      <StatCell stat={summary.variance} language={language} />
      <StatCell stat={summary.sd} language={language} />
      <StatCell stat={summary.min} language={language} />
      <StatCell stat={summary.max} language={language} />
    </tr>
  );
}

export function DescriptiveTable({ result, responseName, factors, language }: Props) {
  const { t } = useTranslation("results");
  const nameOf = (id: string) => factors.find((f) => f.id === id)?.name || id;
  return (
    <div className="grid-scroll">
      <table className="results-table" data-testid="descriptive-table">
        <caption>{t("table.caption", { response: responseName })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("table.group")}</th>
            <th scope="col">{t("table.n")}</th>
            <th scope="col">{t("table.missing")}</th>
            <th scope="col">{t("table.mean")}</th>
            <th scope="col">{t("table.variance")}</th>
            <th scope="col">{t("table.sd")}</th>
            <th scope="col">{t("table.min")}</th>
            <th scope="col">{t("table.max")}</th>
          </tr>
        </thead>
        <tbody>
          <Row label={t("table.overall")} summary={result.overall} language={language} />
          {result.groups.map((g) => (
            <Row
              key={g.labels.map((l) => `${l.factorId}=${l.label}`).join("|")}
              label={g.labels.map((l) => `${nameOf(l.factorId)}: ${l.label}`).join("; ")}
              summary={g.summary}
              language={language}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
