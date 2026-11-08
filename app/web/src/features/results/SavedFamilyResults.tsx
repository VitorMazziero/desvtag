import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject } from "../../state/ProjectContext";
import { ExportSettingsPanel } from "../export";
import { MixtureResults } from "./MixtureResults";
import { NonlinearResults } from "./NonlinearResults";
import { PowerResults } from "./PowerResults";
import { RepeatedResults } from "./RepeatedResults";
import { SectionedResults } from "./SectionedResults";
import { useViewedFamily } from "./ViewedFamily";

export function SavedFamilyResults({
  language,
  report = false,
}: {
  language: Language;
  report?: boolean;
}) {
  const state = useProject();
  const { t } = useTranslation();
  const { saved, select } = useViewedFamily();
  if (!saved) return null;
  const data = state.revisions.find((r) => r.id === saved.record.revisionId)?.data;
  if (!data) return <p role="alert">{t("family.missingRevision")}</p>;
  const records =
    (saved.family === "mixture"
      ? state.mixtureResult?.records
      : saved.family === "repeated"
        ? state.mixedModelResult?.records
        : saved.family === "nonlinear"
          ? state.nonlinearResult?.records
          : state.powerResult?.records) ?? [];
  const recordName = (record: typeof saved.record) =>
    `${record.id} · ${t(record.result.provenance.methodId === "paired_comparison" ? "repeated.paired.title" : record.result.provenance.methodId === "linear_mixed_model" ? "repeated.mixed.title" : `family.${saved.family}`)} · ${record.revisionId} · ${new Date(record.createdAt).toLocaleString(language)}`;
  const body =
    saved.family === "mixture" ? (
      <MixtureResults record={saved.record} data={data} language={language} report={report} />
    ) : saved.family === "nonlinear" ? (
      <NonlinearResults record={saved.record} data={data} language={language} />
    ) : saved.family === "power" ? (
      <PowerResults record={saved.record} language={language} report={report} />
    ) : saved.family === "repeated" ? (
      <RepeatedResults record={saved.record} data={data} language={language} />
    ) : null;
  return (
    <section
      aria-labelledby="family-result-title"
      data-testid="saved-family-result"
      data-family={saved.family}
    >
      <h2 id="family-result-title">{t(`family.${saved.family}`)}</h2>
      {!report && records.length > 1 && (
        <label className="field" data-report-skip>
          <span>{t("family.record")}</span>
          <select
            data-testid="result-record"
            value={saved.record.id}
            onChange={(e) => select?.(e.target.value)}
          >
            {[...records].reverse().map((record) => (
              <option key={record.id} value={record.id}>
                {recordName(record)}
              </option>
            ))}
          </select>
        </label>
      )}
      {!saved.current && (
        <p className="stale-notice" role="status">
          {t("stale", { ns: "results" })}
        </p>
      )}
      <p className="muted small" data-testid="family-result-identity">
        {saved.record.id} · {saved.record.revisionId} ·{" "}
        {new Date(saved.record.createdAt).toLocaleString(language)}
      </p>
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
