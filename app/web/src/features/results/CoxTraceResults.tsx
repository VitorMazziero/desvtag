import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { coxTraceChart } from "../../services/charts/coxTrace";
import type { MixtureRecord } from "../../services/engine";
import { ChartFigure } from "./ChartFigure";
import { familyExportMetadata } from "./familyExportMetadata";
import { MixedResultTable } from "./MixedResultTable";
import { useFigureFormat } from "./useFigureFormat";

export function CoxTraceResults({
  record,
  language,
  responseLabel,
}: {
  record: MixtureRecord;
  language: Language;
  responseLabel: string;
}) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const format = useFigureFormat(language);
  const trace = record.result.coxTrace;
  if (!trace) return null;
  const names = record.input.request.componentNames;
  const title = t("mixture.analysis.coxFigureTitle", { response: responseLabel });
  const note = t("mixture.analysis.coxNote");
  const spec = {
    id: "cox-trace",
    title,
    note,
    names,
    trace,
    xLabel: t("mixture.analysis.coxXLabel"),
    yLabel: responseLabel,
  };
  const screenSvg = coxTraceChart(spec, "css", format);
  const num = (value: number | null) =>
    value === null ? "—" : formatSignificant(value, language, 6);
  return (
    <section data-testid="cox-results">
      <h3>{t("mixture.analysis.coxTitle")}</h3>
      <div className="grid-scroll">
        <table className="results-table" data-testid="cox-domain">
          <caption>{t("mixture.analysis.coxReference")}</caption>
          <thead>
            <tr>
              {["component", "coxReferenceColumn", "coxPathMinimum", "coxPathMaximum"].map(
                (key) => (
                  <th scope="col" key={key}>
                    {t(`mixture.analysis.${key}`)}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {trace.series.map((series) => (
              <tr key={series.component}>
                <th scope="row">{names[series.component]}</th>
                <td className="num">{num(trace.reference[series.component] ?? null)}</td>
                <td
                  className="num"
                  title={series.interval ? undefined : t("mixture.analysis.coxUndefinedDirection")}
                >
                  {series.interval ? num(series.interval[0]) : "—"}
                </td>
                <td className="num">{series.interval ? num(series.interval[1]) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {screenSvg ? (
        <ChartFigure
          testId="cox-plot"
          screenSvg={screenSvg}
          exportSvg={coxTraceChart(spec, "static", format)}
          fileBase="mixture-cox-trace"
          pngMetadata={JSON.stringify({
            title,
            reference: trace.reference,
            method: record.result.provenance,
          })}
        />
      ) : (
        <p role="status">{t("mixture.analysis.coxNoPredictions")}</p>
      )}
      <details data-report-skip>
        <summary>{t("mixture.analysis.coxSource")}</summary>
        <MixedResultTable
          id="cox-source"
          title={t("mixture.analysis.coxSource")}
          columns={[
            { key: "component", label: t("mixture.analysis.component") },
            { key: "delta", label: "Δx" },
            ...names.map((name, i) => ({ key: `real_${i + 1}`, label: `x${i + 1} — ${name}` })),
            ...names.map((name, i) => ({ key: `pseudo_${i + 1}`, label: `x′${i + 1} — ${name}` })),
            { key: "prediction", label: responseLabel },
            { key: "state", label: "status" },
          ]}
          rows={trace.series.flatMap((series) =>
            series.points.map((point) => [
              names[series.component] ?? "",
              point.delta,
              ...point.proportions,
              ...point.pseudo,
              point.value,
              point.value.status === "defined" ? "defined" : point.value.reason,
            ]),
          )}
          previewRows={20}
          language={language}
          metadata={familyExportMetadata(record)}
          onDone={setNotice}
          fileBase="mixture-cox"
        />
        {notice && <p role="status">{notice}</p>}
      </details>
    </section>
  );
}
