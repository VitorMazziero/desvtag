import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { Modal } from "../menus/Modal";
import { BlockContextNote } from "../results/BlockContextNote";
import { CandidateTable } from "./CandidateTable";
import { OptimizationCriterion } from "./GoalSummary";

export function ConfirmationOrigin({ language }: { language: Language }) {
  const state = useProject();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const source = workspace.experiments.find((e) => e.id === state.origin?.experimentId);
  const record = source?.analyses.find((a) => a.id === state.origin?.analysisId);
  const revision = source?.revisions.find((r) => r.id === record?.revisionId);
  if (!source) return null;
  return (
    <div data-report-skip>
      <button
        type="button"
        className="button secondary small"
        data-testid="confirmation-origin"
        onClick={() => setOpen(true)}
      >
        {t("optimization.check.origin", { name: source.name })}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("optimization.check.originTitle")}
        testId="confirmation-origin-dialog"
      >
        <h3>{source.name}</h3>
        <BlockContextNote block={state.confirmation?.block} />
        {record && (
          <p title={record.id}>
            {t("optimization.title")} · {record.revisionId} ·{" "}
            {new Date(record.createdAt).toLocaleString(language)}
          </p>
        )}
        <p className="muted">{t("optimization.check.originHelp")}</p>
        {record?.options.optimization && (
          <OptimizationCriterion
            setup={record.options.optimization}
            variables={revision?.data ?? source}
          />
        )}
        {record?.result.type === "optimization" && (
          <CandidateTable
            result={record.result}
            language={language}
            variables={revision?.data ?? source}
          />
        )}
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: "selectExperiment", id: source.id })}
        >
          {t("optimization.check.openSource")}
        </button>
      </Modal>
    </div>
  );
}
