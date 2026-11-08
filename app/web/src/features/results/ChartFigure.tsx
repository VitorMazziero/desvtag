// Figura SVG com legenda acessível e exportação em SVG e PNG com proveniência (U09/U16).
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyChartStyle, applyFigureStyle, defaultFigureText } from "../../services/charts";
import { addPngText, figurePdf, svgToPng, utf8 } from "../../services/export";
import { embedFigureFonts } from "../../services/export/figureFonts";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { CommentThread } from "../comments";
import { Modal } from "../menus/Modal";
import { ExportButton } from "./ExportButton";
import { FigureCustomizer } from "./FigureCustomizer";
import { useViewedFamily } from "./ViewedFamily";

interface Props {
  /** Explicit saved calculation for planning supplements. */
  recordId?: string | null;
  /** SVG para a tela (cores dos temas). */
  screenSvg: string;
  /** SVG autônomo para exportação (cores literais, com metadados). */
  exportSvg: string;
  /** Texto de metadados gravado no PNG. */
  pngMetadata: string;
  fileBase: string;
  children?: ReactNode;
  testId: string;
}

export function ChartFigure({
  recordId,
  screenSvg: rawScreenSvg,
  exportSvg: rawExportSvg,
  pngMetadata,
  fileBase,
  children,
  testId,
}: Props) {
  const { t } = useTranslation("results");
  const storage = useStorage();
  const { settings } = useExportSettings();
  const project = useProject();
  const dispatch = useProjectDispatch();
  // A chave da figura é o seu `testId`; o ajuste guardado no projeto vale para tela e exportação.
  const figure = project.figureStyles[testId];
  const style = { palette: settings.palette, fontScale: figure?.fontScale ?? settings.fontScale };
  const options = { manualLettersLegend: t("figure.manualLettersLegend") };
  const screenSvg = applyChartStyle(applyFigureStyle(rawScreenSvg, figure, options), style);
  const exportSvg = applyChartStyle(applyFigureStyle(rawExportSvg, figure, options), style);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{
    kind: "cancelled" | "done" | "failed";
    name?: string;
  } | null>(null);
  // Comentário de figura: a chave identifica a figura; a análise vigente fixa a revisão dos dados.
  const viewedFamily = useViewedFamily();
  const analysisId =
    recordId === null
      ? undefined
      : (recordId ??
        viewedFamily.saved?.record.id ??
        [...project.analyses].reverse().find((a) => a.signature === project.result?.signature)?.id);

  const finish = (name: string | null) =>
    setMessage(name === null ? { kind: "cancelled" } : { kind: "done", name });

  return (
    <figure className="chart" data-testid={testId}>
      <section
        className="chart-scroll"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard access to the horizontally scrollable scientific canvas.
        tabIndex={0}
        aria-label={`${defaultFigureText(rawScreenSvg, "title") || fileBase} — ${t("figure.readableView")}`}
      >
        <div
          className="chart-canvas"
          data-export-svg={exportSvg}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG gerado localmente com todo texto escapado (services/charts/svg.ts)
          dangerouslySetInnerHTML={{ __html: screenSvg }}
        />
      </section>
      {children}
      <figcaption>
        <details
          className="advanced figure-tools"
          data-testid="figure-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="button secondary small">{t("figure.menu")}</summary>
          <div className="figure-actions row">
            <button
              type="button"
              className="button secondary small"
              onClick={() => setPreview(true)}
            >
              {t("figure.preview")}
            </button>
            <ExportButton
              label={`${t("comparison.export.figure")} — ${t("comparison.export.svg")}`}
              onExport={async () =>
                finish(
                  (
                    await storage.exportFile(
                      utf8(await embedFigureFonts(exportSvg)),
                      `${fileBase}.svg`,
                    )
                  )?.name ?? null,
                )
              }
              onError={() => setMessage({ kind: "failed" })}
            />
            <ExportButton
              label={`${t("comparison.export.figure")} — ${t("comparison.export.png")}`}
              onExport={async () => {
                const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(exportSvg);
                const png = await svgToPng(
                  exportSvg,
                  Number(viewBox?.[1] ?? 640),
                  Number(viewBox?.[2] ?? 380),
                  figure?.exportScale ?? 2,
                );
                finish(
                  (
                    await storage.exportFile(
                      addPngText(png, "Description", pngMetadata),
                      `${fileBase}.png`,
                    )
                  )?.name ?? null,
                );
              }}
              onError={() => setMessage({ kind: "failed" })}
            />
            <ExportButton
              label={`${t("comparison.export.figure")} — ${t("comparison.export.pdf")}`}
              onExport={async () => {
                const bytes = await figurePdf(exportSvg, {
                  title: fileBase,
                  subject: pngMetadata.slice(0, 900),
                  creator: "DesvTAG",
                });
                finish((await storage.exportFile(bytes, `${fileBase}.pdf`))?.name ?? null);
              }}
              onError={() => setMessage({ kind: "failed" })}
            />
          </div>
          <FigureCustomizer
            svg={rawScreenSvg}
            style={figure}
            onChange={(next) => dispatch({ type: "setFigureStyle", key: testId, style: next })}
          />
          <CommentThread
            target={{ kind: "figure", key: testId, ...(analysisId ? { analysisId } : {}) }}
            testId={testId}
          />
        </details>
        {message && (
          <span role="status" className="muted small">
            {t(`comparison.export.${message.kind}`, { name: message.name })}
          </span>
        )}
      </figcaption>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title={t("figure.preview")}
        testId={`preview-${testId}`}
      >
        <p className="muted">{t("figure.previewHelp")}</p>
        <div className="chart-scroll export-preview">
          <div
            className="chart-canvas"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped local SVG, identical to the exported content.
            dangerouslySetInnerHTML={{ __html: exportSvg }}
          />
        </div>
      </Modal>
    </figure>
  );
}
