import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject } from "../../state/ProjectContext";
import { ExportSettingsPanel } from "../export";
import { OptimizationPanel, OptimizationReport } from "../optimization";
import { resultIsCurrent } from "../workflow/guards";
import { ComparisonResults } from "./ComparisonResults";
import { DescriptiveTable } from "./DescriptiveTable";
import { DesignResults } from "./DesignResults";
import { FactorialResults } from "./FactorialResults";
import { Interpretation } from "./Interpretation";
import { ProcedureResults } from "./ProcedureResults";
import { SectionedResults } from "./SectionedResults";
import { SurfaceResults } from "./SurfaceResults";

/** `report`: versão para o relatório HTML (sem editores de otimização). */
export function ResultsView({
  language,
  report = false,
}: {
  language: Language;
  report?: boolean;
}) {
  const { t } = useTranslation("results");
  const state = useProject();
  const stored = state.result;
  if (!stored) return null;
  if (stored.kind === "oneWay")
    return (
      <section aria-labelledby="results-title">
        <h2 id="results-title">{t("comparison.title")}</h2>
        {!resultIsCurrent(state) && (
          <p role="status" className="error">
            {t("stale")}
          </p>
        )}
        {report ? (
          <ComparisonResults
            result={stored.result}
            signature={stored.signature}
            language={language}
          />
        ) : (
          <SectionedResults>
            <ComparisonResults
              result={stored.result}
              signature={stored.signature}
              language={language}
            />
            <div data-section="export">
              <ExportSettingsPanel />
            </div>
          </SectionedResults>
        )}
      </section>
    );
  if (stored.kind === "design")
    return (
      <section aria-labelledby="results-title">
        <h2 id="results-title">{t("design.title")}</h2>
        {!resultIsCurrent(state) && (
          <p role="status" className="error">
            {t("stale")}
          </p>
        )}
        {report ? (
          <DesignResults result={stored.result} signature={stored.signature} language={language} />
        ) : (
          <SectionedResults>
            <DesignResults
              result={stored.result}
              signature={stored.signature}
              language={language}
            />
            <div data-section="export">
              <ExportSettingsPanel />
            </div>
          </SectionedResults>
        )}
      </section>
    );
  if (stored.kind === "surface")
    return (
      <section aria-labelledby="results-title">
        <h2 id="results-title">{t("surface.title")}</h2>
        {!resultIsCurrent(state) && (
          <p role="status" className="error">
            {t("stale")}
          </p>
        )}
        {report ? (
          <>
            <SurfaceResults
              result={stored.result}
              signature={stored.signature}
              language={language}
            />
            <OptimizationReport language={language} />
          </>
        ) : (
          <SectionedResults>
            <SurfaceResults
              result={stored.result}
              signature={stored.signature}
              language={language}
            />
            <div data-section="optimization">
              <OptimizationPanel language={language} />
            </div>
            <div data-section="export">
              <ExportSettingsPanel />
            </div>
          </SectionedResults>
        )}
      </section>
    );
  if (stored.kind === "procedure" || stored.kind === "factorial") {
    const body =
      stored.kind === "procedure" ? (
        <ProcedureResults result={stored.result} signature={stored.signature} language={language} />
      ) : (
        <FactorialResults result={stored.result} signature={stored.signature} language={language} />
      );
    return (
      <section aria-labelledby="results-title">
        <h2 id="results-title">
          {t(stored.kind === "procedure" ? "procedure.title" : "factorial.title")}
        </h2>
        {!resultIsCurrent(state) && (
          <p role="status" className="error">
            {t("stale")}
          </p>
        )}
        {report ? (
          body
        ) : (
          <SectionedResults>
            {body}
            <div data-section="export">
              <ExportSettingsPanel />
            </div>
          </SectionedResults>
        )}
      </section>
    );
  }
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
