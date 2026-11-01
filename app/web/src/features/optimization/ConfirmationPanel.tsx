// U10 — proposta de ensaios de confirmação: cria um experimento vinculado ao de origem, com as
// condições dos candidatos escolhidos (arredondadas a 5 algarismos) e as previsões gravadas.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { nowIso } from "../../lib/ids";
import type { OptimizationRequest, OptimizationResult } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { CandidateTable } from "./CandidateTable";
import { confirmationPlan, confirmationRows, roundedReal } from "./optimizationSetup";

export function ConfirmationPanel({
  request,
  result,
  language,
}: {
  request: OptimizationRequest;
  result: OptimizationResult;
  language: Language;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const [selected, setSelected] = useState<Set<number>>(new Set([1]));
  const [replicates, setReplicates] = useState(2);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const propose = async () => {
    const chosen = result.candidates.filter((c) => selected.has(c.rank));
    if (chosen.length === 0) return;
    const points = chosen.map((c) => c.real.map(roundedReal));
    setBusy(true);
    setProblems([]);
    try {
      const response = await client.request(
        { type: "optimizationEvaluate", optimization: request, points },
        { channel: "optimization-confirm" },
      );
      if (response.outcome.status === "error") {
        setProblems(engineErrorMessages(t, response.outcome.error));
        return;
      }
      if (response.outcome.result.type !== "optimizationEvaluate") return;
      const { type: _type, ...evaluation } = response.outcome.result;
      const rows = confirmationRows(state, points, replicates);
      dispatch({
        type: "addConfirmation",
        name: t("optimization.confirmation.experimentName", { name: state.name }),
        now: nowIso(),
        rows,
        plan: confirmationPlan(
          evaluation,
          request.setup.responses,
          rows,
          replicates,
          request.setup.alpha,
        ),
      });
    } catch {
      setProblems([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="confirmation-title" data-testid="confirmation-panel">
      <h3 id="confirmation-title">{t("optimization.confirmation.title")}</h3>
      <p className="muted">{t("optimization.confirmation.intro")}</p>
      <CandidateTable
        result={result}
        language={language}
        selected={selected}
        onToggle={(rank, on) => {
          const next = new Set(selected);
          if (on) next.add(rank);
          else next.delete(rank);
          setSelected(next);
        }}
      />
      <label className="field">
        <span>{t("optimization.confirmation.replicates")}</span>
        <input
          type="number"
          min={1}
          max={10}
          value={replicates}
          onChange={(e) =>
            setReplicates(Math.max(1, Math.min(10, Math.floor(Number(e.target.value) || 1))))
          }
        />
      </label>
      <button
        type="button"
        className="button"
        disabled={busy || selected.size === 0}
        onClick={propose}
      >
        {t("optimization.confirmation.propose")}
      </button>
      {problems.length > 0 && (
        <div role="alert" className="error">
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
    </section>
  );
}
