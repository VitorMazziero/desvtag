// U10 — conferência dos ensaios de confirmação: o valor observado diante do intervalo de predição
// gravado na proposta. É uma comparação de números já calculados pelo motor; nenhuma estatística nova.
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { useProject } from "../../state/ProjectContext";
import { parseNumberCell } from "../data/editing";

export function ConfirmationCheck({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const plan = state.confirmation;
  if (!plan) return null;
  const fmt = (v: number | null) => (v === null ? "—" : formatSignificant(v, language, 5));
  const level = formatSignificant(plan.confidenceLevel * 100, language, 3);
  return (
    <section aria-labelledby="confirmation-check-title" data-testid="confirmation-check">
      <h3 id="confirmation-check-title">{t("optimization.check.title")}</h3>
      <p className="muted small">{t("optimization.check.help", { level })}</p>
      <div className="grid-scroll">
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col">{t("optimization.check.run")}</th>
              <th scope="col">{t("optimization.check.response")}</th>
              <th scope="col">{t("optimization.check.predicted")}</th>
              <th scope="col">{t("optimization.check.interval", { level })}</th>
              <th scope="col">{t("optimization.check.observed")}</th>
              <th scope="col">{t("optimization.check.status")}</th>
            </tr>
          </thead>
          <tbody>
            {plan.predictions.map((p) => {
              const rowIndex = state.rows.findIndex((r) => r.id === p.rowId);
              const responseIndex = state.responses.findIndex((r) => r.id === p.responseId);
              const cell = state.rows[rowIndex]?.responses[responseIndex] ?? "";
              const parsed = cell.trim() === "" ? null : parseNumberCell(cell);
              const observed = parsed?.ok ? parsed.value : null;
              let status = "missing";
              if (observed !== null && observed !== undefined) {
                if (p.lower !== null && observed < p.lower) status = "below";
                else if (p.upper !== null && observed > p.upper) status = "above";
                else status = p.lower === null || p.upper === null ? "noInterval" : "within";
              }
              return (
                <tr key={`${p.rowId}-${p.responseId}`}>
                  <th scope="row">{rowIndex + 1}</th>
                  <td>{state.responses[responseIndex]?.name || p.responseId}</td>
                  <td className="num">{fmt(p.predicted)}</td>
                  <td className="num">
                    {p.lower === null || p.upper === null
                      ? "—"
                      : `[${fmt(p.lower)}; ${fmt(p.upper)}]`}
                  </td>
                  <td className="num">{fmt(observed ?? null)}</td>
                  <td>{t(`optimization.check.${status}`)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">{t("optimization.check.note")}</p>
    </section>
  );
}
