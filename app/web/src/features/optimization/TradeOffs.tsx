// U10 — compromissos: melhor valor de cada resposta isolada e as condições em que ocorre.
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { OptimizationResult } from "../../services/engine";

export function TradeOffs({
  result,
  language,
}: {
  result: OptimizationResult;
  language: Language;
}) {
  const { t } = useTranslation();
  if (result.tradeOffs.length === 0) return null;
  const fmt = (v: number | null) =>
    v === null ? "—" : new Intl.NumberFormat(language, { maximumSignificantDigits: 4 }).format(v);
  return (
    <section aria-labelledby="tradeoffs-title">
      <h3 id="tradeoffs-title">{t("optimization.tradeoffs.title")}</h3>
      <p className="muted small">{t("optimization.tradeoffs.help")}</p>
      <div className="grid-scroll">
        <table className="results-table" data-testid="tradeoff-table">
          <thead>
            <tr>
              <th scope="col">{t("optimization.tradeoffs.response")}</th>
              <th scope="col">{t("optimization.tradeoffs.bestAlone")}</th>
              <th scope="col">{t("optimization.tradeoffs.atBest")}</th>
            </tr>
          </thead>
          <tbody>
            {result.tradeOffs.map((x) => (
              <tr key={x.responseId}>
                <th scope="row">{x.name}</th>
                <td className="num">{fmt(x.bestAlone)}</td>
                <td className="num">
                  {x.real.length === 0
                    ? "—"
                    : x.real.map((v, j) => `${result.factorNames[j] ?? j} = ${fmt(v)}`).join("; ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
