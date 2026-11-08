import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { AnalysisFamily } from "../../services/engine";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { ExportSettingsPanel } from "../export";
import { OptimizationPanel, OptimizationReport } from "../optimization";
import { resultIsCurrent } from "../workflow/guards";
import { ComparisonResults } from "./ComparisonResults";
import { DescriptiveTable } from "./DescriptiveTable";
import { DesignResults } from "./DesignResults";
import { FactorialResults } from "./FactorialResults";
import { Interpretation } from "./Interpretation";
import { OptimalModelResults } from "./OptimalModelResults";
import { OptimalVarianceReport } from "./OptimalVarianceReport";
import { ProcedureResults } from "./ProcedureResults";
import { SavedFamilyResults } from "./SavedFamilyResults";
import { SectionedResults } from "./SectionedResults";
import { SurfaceResults } from "./SurfaceResults";
import { resultFamilies } from "./savedFamily";
import { FamilyResultScope } from "./ViewedFamily";

/** `report`: versão para o relatório HTML (sem editores de otimização). */
function LegacyResultsView({ language, report = false }: { language: Language; report?: boolean }) {
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
              report
            />
            <OptimalVarianceReport
              signature={stored.signature}
              language={language}
              surface={stored.result}
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
  if (stored.kind === "optimal") {
    const body = (
      <OptimalModelResults
        result={stored.result}
        signature={stored.signature}
        language={language}
        report={report}
      />
    );
    return (
      <section aria-labelledby="results-title">
        <h2 id="results-title">{t("optimalModel.title")}</h2>
        {!resultIsCurrent(state) && (
          <p role="status" className="error">
            {t("stale")}
          </p>
        )}
        {report ? (
          <>
            {body}
            <OptimalVarianceReport signature={stored.signature} language={language} />
          </>
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

export function ResultsView({
  language,
  report = false,
}: {
  language: Language;
  report?: boolean;
}) {
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { t } = useTranslation();
  const families = resultFamilies(state);
  return (
    <FamilyResultScope>
      {!report && families.length > 1 && (
        <label className="field" data-report-skip>
          <span>{t("family.select")}</span>
          <select
            data-testid="result-family"
            value={state.activeFamily}
            onChange={(e) =>
              dispatch({ type: "selectFamily", family: e.target.value as AnalysisFamily })
            }
          >
            {families.map((family) => (
              <option key={family} value={family}>
                {t(`family.${family}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      {state.activeFamily === "legacy" ? (
        <LegacyResultsView language={language} report={report} />
      ) : (
        <SavedFamilyResults language={language} report={report} />
      )}
    </FamilyResultScope>
  );
}
