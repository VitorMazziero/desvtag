// Figura SVG com legenda acessível e exportação em SVG e PNG com proveniência (U09/U16).
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyChartStyle } from "../../services/charts";
import { addPngText, svgToPng, utf8 } from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { ExportButton } from "./ExportButton";

interface Props {
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
  const style = { palette: settings.palette, fontScale: settings.fontScale };
  const screenSvg = applyChartStyle(rawScreenSvg, style);
  const exportSvg = applyChartStyle(rawExportSvg, style);
  const [message, setMessage] = useState<string | null>(null);

  const finish = (name: string | null) =>
    setMessage(
      name === null ? t("comparison.export.cancelled") : t("comparison.export.done", { name }),
    );

  return (
    <figure className="chart" data-testid={testId}>
      <div
        className="chart-canvas"
        data-export-svg={exportSvg}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG gerado localmente com todo texto escapado (services/charts/svg.ts)
        dangerouslySetInnerHTML={{ __html: screenSvg }}
      />
      {children}
      <figcaption className="row">
        <ExportButton
          label={`${t("comparison.export.figure")} — ${t("comparison.export.svg")}`}
          onExport={async () =>
            finish((await storage.exportFile(utf8(exportSvg), `${fileBase}.svg`))?.name ?? null)
          }
          onError={() => setMessage(t("comparison.export.failed"))}
        />
        <ExportButton
          label={`${t("comparison.export.figure")} — ${t("comparison.export.png")}`}
          onExport={async () => {
            const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(exportSvg);
            const png = await svgToPng(
              exportSvg,
              Number(viewBox?.[1] ?? 640),
              Number(viewBox?.[2] ?? 380),
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
          onError={() => setMessage(t("comparison.export.failed"))}
        />
        {message && (
          <span role="status" className="muted small">
            {message}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
