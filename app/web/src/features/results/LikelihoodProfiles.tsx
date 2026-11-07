import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { likelihoodProfileChart } from "../../services/charts/likelihoodProfile";
import type { NonlinearRecord } from "../../services/engine";
import { ChartFigure } from "./ChartFigure";
import { familyExportMetadata } from "./familyExportMetadata";
import { MixedResultTable } from "./MixedResultTable";
import { useFigureFormat } from "./useFigureFormat";
export function LikelihoodProfiles({
  record,
  language,
  names,
}: {
  record: NonlinearRecord;
  language: Language;
  names: string[];
}) {
  const { t } = useTranslation();
  const format = useFigureFormat(language);
  const [notice, setNotice] = useState<string | null>(null);
  const profiles = record.result.profiles;
  if (!profiles) return null;
  const limited = profiles.flatMap((profile, i) =>
    profile.lowerStatus === "resourceLimit" || profile.upperStatus === "resourceLimit"
      ? [names[i] ?? profile.parameter]
      : [],
  );
  const metadata = familyExportMetadata(record);
  const columns = [
    { key: "parameter", label: t("saturation.parameter") },
    { key: "lower", label: t("profile.lower") },
    { key: "upper", label: t("profile.upper") },
    { key: "lower_status", label: t("profile.lowerStatus") },
    { key: "upper_status", label: t("profile.upperStatus") },
  ];
  return (
    <>
      <div data-section="tables" data-testid="likelihood-profiles">
        <p>{t("profile.method", { level: format((1 - record.input.request.alpha) * 100) })}</p>
        <MixedResultTable
          id="likelihood-profile-limits"
          title={t("profile.title")}
          columns={columns}
          rows={profiles.map((p, i) => [
            names[i] ?? p.parameter,
            p.lower,
            p.upper,
            t(`profile.status.${p.lowerStatus}`),
            t(`profile.status.${p.upperStatus}`),
          ])}
          metadata={metadata}
          fileBase="nonlinear"
          language={language}
          onDone={setNotice}
        />
        {notice && <p role="status">{notice}</p>}
        {limited.length > 0 && (
          <p className="stale-notice" role="status" data-testid="profile-budget-note">
            {limited.join(", ")}: {t("profile.resourceNote")}
          </p>
        )}
        {profiles.map(
          (p, i) =>
            p.lowerStatus !== "resourceLimit" &&
            p.upperStatus !== "resourceLimit" && (
              <p
                key={p.parameter}
                className={p.unimodalInExaminedRange ? "muted small" : "stale-notice"}
                role="status"
              >
                {names[i] ?? p.parameter}:{" "}
                {t(p.unimodalInExaminedRange ? "profile.checked" : "profile.unreliable")}
              </p>
            ),
        )}
      </div>
      <div data-section="charts">
        {profiles.some((p) => p.points.length > 1) && (
          <p className="muted">{t("profile.plotNote")}</p>
        )}
        {profiles.map((p, i) => {
          const title = `${t("profile.title")} — ${names[i] ?? p.parameter}`;
          return (
            <section key={p.parameter}>
              {p.points.length > 1 ? (
                <ChartFigure
                  testId={`likelihood-profile-${p.parameter}`}
                  screenSvg={likelihoodProfileChart(
                    p,
                    title,
                    names[i] ?? p.parameter,
                    t("profile.lr"),
                    t("profile.cutoff"),
                    "css",
                    format,
                  )}
                  exportSvg={likelihoodProfileChart(
                    p,
                    title,
                    names[i] ?? p.parameter,
                    t("profile.lr"),
                    t("profile.cutoff"),
                    "static",
                    format,
                  )}
                  fileBase={`likelihood-profile-${p.parameter}`}
                  pngMetadata={JSON.stringify(metadata)}
                />
              ) : (
                <p className="muted" data-testid={`likelihood-profile-unavailable-${p.parameter}`}>
                  {names[i] ?? p.parameter}: {t("profile.noCurve")}
                </p>
              )}
              <details data-report-skip>
                <summary>{t("profile.source")}</summary>
                <MixedResultTable
                  id={`likelihood-profile-source-${p.parameter}`}
                  title={`${t("profile.source")} — ${names[i] ?? p.parameter}`}
                  columns={[
                    { key: "parameter_value", label: names[i] ?? p.parameter },
                    { key: "likelihood_ratio", label: t("profile.lr") },
                  ]}
                  rows={p.points.map((x) => [x.value, x.likelihoodRatio])}
                  metadata={metadata}
                  fileBase="nonlinear"
                  language={language}
                  onDone={setNotice}
                />
              </details>
            </section>
          );
        })}
      </div>
    </>
  );
}
