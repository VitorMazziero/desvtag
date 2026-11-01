import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject } from "../../state/ProjectContext";
import { resultIsCurrent } from "../workflow/guards";
import { DescriptiveTable } from "./DescriptiveTable";
import { Interpretation } from "./Interpretation";

export function ResultsView({ language }: { language: Language }) {
  const { t } = useTranslation("results");
  const state = useProject();
  const stored = state.result;
  if (!stored) return null;
  const response = state.responses.find((r) => r.id === stored.result.responseId);
  const responseName = response?.name || stored.result.responseId;
  return (
    <section aria-labelledby="results-title">
      <h2 id="results-title">{t("title")}</h2>
      {!resultIsCurrent(state) && (
        <p role="status" className="error">
          {t("stale")}
        </p>
      )}
      <Interpretation
        result={stored.result}
        responseName={responseName}
        responseUnit={response?.unit ?? ""}
        language={language}
      />
      <DescriptiveTable
        result={stored.result}
        responseName={responseName}
        factors={state.factors}
        language={language}
      />
    </section>
  );
}
