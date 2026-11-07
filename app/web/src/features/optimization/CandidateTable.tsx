// U10 — candidatos: condições reais e codificadas, previsões com intervalo de predição,
// desejabilidade por resposta e global, compromissos e avisos de extrapolação e fronteira.
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { OptimizationResult, Stat } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
import type { ProjectState } from "../../state/project";
import { StatNumber } from "../results/StatCell";

const val = (s: Stat): number | null => (s.status === "defined" ? s.value : null);

export function CandidateSummary({
  result,
  language,
}: {
  result: OptimizationResult;
  language: Language;
}) {
  const { t } = useTranslation();
  const best = result.candidates[0]?.globalDesirability;
  const ties = result.candidates.filter((c) => c.globalDesirability === best).length;
  return (
    <div className="candidate-summary" data-testid="candidate-summary">
      <p>
        {t("optimization.decision.shown", {
          shown: result.candidates.length,
          total: result.convergence.distinctOptima,
        })}
      </p>
      <p className="muted small">{t("optimization.decision.order")}</p>
      {ties > 1 && (
        <p role="status" className="candidate-ties" data-testid="candidate-ties">
          {t("optimization.decision.ties", {
            count: ties,
            value: formatSignificant(best ?? 0, language, 5),
          })}
        </p>
      )}
    </div>
  );
}

/** Tabela dos candidatos para exportação (valores numéricos completos; indefinidos ficam vazios). */
export function candidatesTable(result: OptimizationResult): {
  header: string[];
  rows: (string | number | null)[][];
} {
  const names = result.factorNames;
  const responses = result.candidates[0]?.predictions ?? [];
  const header = [
    "rank",
    ...names,
    ...names.map((n) => `${n} (coded)`),
    "global_desirability",
    ...responses.flatMap((p) => [
      `${p.name} predicted`,
      `${p.name} prediction interval lower`,
      `${p.name} prediction interval upper`,
      `${p.name} desirability`,
    ]),
    "extrapolated",
    "starts",
  ];
  const rows = result.candidates.map((c) => [
    c.rank,
    ...c.real,
    ...c.coded,
    c.globalDesirability,
    ...c.predictions.flatMap((p) => [
      val(p.prediction.fitted),
      val(p.prediction.predictionLower),
      val(p.prediction.predictionUpper),
      p.desirability,
    ]),
    c.extrapolated ? "yes" : "no",
    c.starts,
  ]);
  return { header, rows };
}

export function CandidateTable({
  result,
  language,
  selected,
  onToggle,
  variables,
}: {
  result: OptimizationResult;
  language: Language;
  selected?: Set<number>;
  onToggle?: (rank: number, on: boolean) => void;
  variables?: Pick<ProjectState, "factors" | "responses">;
}) {
  const { t } = useTranslation();
  const active = useProject();
  const context = variables ?? active;
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
            {names.map((n, j) => (
              <th scope="col" key={n}>
                {n}
                {context.factors.find((f) => f.id === result.domain[j]?.factorId)?.unit
                  ? ` [${context.factors.find((f) => f.id === result.domain[j]?.factorId)?.unit}]`
                  : ""}
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
                  <StatNumber
                    stat={{ status: "defined", value: v }}
                    language={language}
                    digits={5}
                  />
                  <br />
                  <span
                    className="muted small"
                    title={String(c.coded[j])}
                  >{`(${fmt(c.coded[j] ?? 0, 3)})`}</span>
                </td>
              ))}
              <td className="num">
                <StatNumber
                  stat={{ status: "defined", value: c.globalDesirability }}
                  language={language}
                  digits={4}
                />
              </td>
              {c.predictions.map((p) => {
                const lo = val(p.prediction.predictionLower);
                const hi = val(p.prediction.predictionUpper);
                return (
                  <td className="num" key={p.responseId}>
                    <StatNumber stat={p.prediction.fitted} language={language} digits={5} />
                    {context.responses.find((r) => r.id === p.responseId)?.unit
                      ? ` ${context.responses.find((r) => r.id === p.responseId)?.unit}`
                      : ""}
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
