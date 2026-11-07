// Tabelas da comparação de um fator: grupos (com letras), ANOVA e pares (U08).
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { OneWayResult } from "../../services/engine";
import { StatCell as Cell, StatNumber } from "./StatCell";

export function GroupTable({
  result,
  factorName,
  language,
}: {
  result: OneWayResult;
  factorName: string;
  language: Language;
}) {
  const { t } = useTranslation("results");
  const level = formatSignificant((1 - result.alpha) * 100, language, 4);
  return (
    <div className="grid-scroll">
      <table className="results-table" data-testid="group-table">
        <caption>{t("comparison.groups.caption", { factor: factorName })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("comparison.groups.group")}</th>
            <th scope="col">{t("comparison.groups.n")}</th>
            <th scope="col">{t("comparison.groups.mean")}</th>
            <th scope="col">{t("comparison.groups.sd")}</th>
            <th scope="col">{t("comparison.groups.se")}</th>
            <th scope="col">{t("comparison.groups.ci", { level })}</th>
            {result.letters && <th scope="col">{t("comparison.groups.letters")}</th>}
          </tr>
        </thead>
        <tbody>
          {result.groups.map((g, i) => (
            <tr key={g.label}>
              <th scope="row">{g.label}</th>
              <td className="num">{g.n}</td>
              <Cell stat={g.mean} language={language} />
              <Cell stat={g.sd} language={language} />
              <Cell stat={g.stdError} language={language} />
              <td className="num">
                <StatNumber stat={g.ciLower} language={language} /> –{" "}
                <StatNumber stat={g.ciUpper} language={language} />
              </td>
              {result.letters && (
                <td data-testid={`letters-${i}`}>
                  <strong>{result.letters.letters[i]}</strong>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnovaTable({
  result,
  responseName,
  language,
}: {
  result: OneWayResult;
  responseName: string;
  language: Language;
}) {
  const { t } = useTranslation("results");
  const { anova } = result;
  const rows = [
    ["between", anova.between] as const,
    ["within", anova.within] as const,
    ["total", anova.total] as const,
  ];
  return (
    <div className="grid-scroll">
      <table className="results-table" data-testid="anova-table">
        <caption>{t("comparison.anova.caption", { response: responseName })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("comparison.anova.source")}</th>
            <th scope="col">{t("comparison.anova.df")}</th>
            <th scope="col">{t("comparison.anova.ss")}</th>
            <th scope="col">{t("comparison.anova.ms")}</th>
            <th scope="col">{t("comparison.anova.f")}</th>
            <th scope="col">{t("comparison.anova.p")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, row]) => (
            <tr key={key}>
              <th scope="row">{t(`comparison.anova.${key}`)}</th>
              <td className="num">{row.df}</td>
              <Cell stat={row.sumSquares} language={language} />
              <Cell stat={row.meanSquare} language={language} />
              {key === "between" ? (
                <>
                  <Cell stat={anova.f} language={language} />
                  <Cell stat={anova.pValue} language={language} p />
                </>
              ) : (
                <>
                  <td className="num" title={t("number.notApplicable")}>
                    {t("number.na")}
                  </td>
                  <td className="num" title={t("number.notApplicable")}>
                    {t("number.na")}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PairTable({ result, language }: { result: OneWayResult; language: Language }) {
  const { t } = useTranslation("results");
  if (!result.tukey) return null;
  const variant = t(`comparison.pairs.${result.tukey.variant}`);
  return (
    <div className="grid-scroll">
      <table className="results-table" data-testid="pair-table">
        <caption>
          {t("comparison.pairs.caption", {
            variant,
            alpha: formatSignificant(result.tukey.alpha, language, 4),
          })}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t("comparison.pairs.pair")}</th>
            <th scope="col">{t("comparison.pairs.difference")}</th>
            <th scope="col">{t("comparison.pairs.se")}</th>
            <th scope="col">{t("comparison.pairs.q")}</th>
            <th scope="col">{t("comparison.pairs.pAdjusted")}</th>
            <th scope="col">{t("comparison.pairs.ciLower")}</th>
            <th scope="col">{t("comparison.pairs.ciUpper")}</th>
            <th scope="col">{t("comparison.pairs.result")}</th>
          </tr>
        </thead>
        <tbody>
          {result.tukey.comparisons.map((c) => (
            <tr key={`${c.groupA}-${c.groupB}`}>
              <th scope="row">
                {result.groups[c.groupA]?.label} − {result.groups[c.groupB]?.label}
              </th>
              <Cell stat={c.difference} language={language} />
              <Cell stat={c.stdError} language={language} />
              <Cell stat={c.qStatistic} language={language} digits={5} />
              <Cell stat={c.pAdjusted} language={language} p />
              <Cell stat={c.ciLower} language={language} />
              <Cell stat={c.ciUpper} language={language} />
              <td>
                {c.significant === null
                  ? t("comparison.pairs.unknown")
                  : c.significant
                    ? t("comparison.pairs.different")
                    : t("comparison.pairs.notDifferent")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
