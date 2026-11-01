// U10 — candidatos: condições reais e codificadas, previsões com intervalo de predição,
// desejabilidade por resposta e global, compromissos e avisos de extrapolação e fronteira.
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { OptimizationResult, Stat } from "../../services/engine";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function CandidateTable({
  result,
  language,
  selected,
  onToggle,
}: {
  result: OptimizationResult;
  language: Language;
  selected?: Set<number>;
  onToggle?: (rank: number, on: boolean) => void;
}) {
  const { t } = useTranslation();
  const fmt = (v: number | null, digits = 5) =>
    v === null ? "—" : formatSignificant(v, language, digits);
  const names = result.factorNames;
  const responses = result.candidates[0]?.predictions ?? [];
  return (
    <div className="grid-scroll">
      <table className="results-table" data-testid="candidate-table">
        <caption>{t("optimization.candidates.caption")}</caption>
        <thead>
          <tr>
            {onToggle && <th scope="col">{t("optimization.candidates.select")}</th>}
            <th scope="col">{t("optimization.candidates.rank")}</th>
            {names.map((n) => (
              <th scope="col" key={n}>
                {n}
              </th>
            ))}
            <th scope="col">{t("optimization.candidates.global")}</th>
            {responses.map((p) => (
              <th scope="col" key={p.responseId}>
                {`${p.name}: ${t("optimization.candidates.predicted")} (${t("optimization.candidates.interval")}) · d`}
              </th>
            ))}
            <th scope="col">{t("optimization.candidates.notes")}</th>
          </tr>
        </thead>
        <tbody>
          {result.candidates.map((c) => (
            <tr key={c.rank}>
              {onToggle && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={t("optimization.candidates.selectCandidate", { rank: c.rank })}
                    checked={selected?.has(c.rank) ?? false}
                    onChange={(e) => onToggle(c.rank, e.target.checked)}
                  />
                </td>
              )}
              <th scope="row">{c.rank}</th>
              {c.real.map((v, j) => (
                <td className="num" key={names[j] ?? j}>
                  {fmt(v)}
                  <br />
                  <span className="muted small">{`(${fmt(c.coded[j] ?? 0, 3)})`}</span>
                </td>
              ))}
              <td className="num">{fmt(c.globalDesirability, 4)}</td>
              {c.predictions.map((p) => {
                const lo = val(p.prediction.predictionLower);
                const hi = val(p.prediction.predictionUpper);
                return (
                  <td className="num" key={p.responseId}>
                    {fmt(val(p.prediction.fitted))}
                    <br />
                    <span className="muted small">
                      {lo === null || hi === null ? "—" : `[${fmt(lo, 4)}; ${fmt(hi, 4)}]`}
                    </span>
                    <br />
                    <span className="small">{`d = ${fmt(p.desirability, 3)}`}</span>
                    {p.lossVsBestAlone !== null && p.lossVsBestAlone > 0.0005 && (
                      <span className="muted small">{` (−${fmt(p.lossVsBestAlone, 2)})`}</span>
                    )}
                  </td>
                );
              })}
              <td className="small">
                {c.extrapolated && <div>{t("optimization.candidates.extrapolated")}</div>}
                {c.atBounds.length > 0 && (
                  <div>
                    {t("optimization.candidates.atBounds", {
                      factors: c.atBounds.map((j) => names[j] ?? j).join(", "),
                    })}
                  </div>
                )}
                <div className="muted">
                  {t("optimization.candidates.starts", { count: c.starts })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
