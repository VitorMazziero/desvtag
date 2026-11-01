// Relatório HTML (U16): renderiza os resultados no idioma da exportação fora da tela, espera as
// figuras e grava um arquivo único e autocontido. Os textos vêm das mesmas chaves da interface.
import { useEffect, useMemo, useRef, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { nowIso } from "../../lib/ids";
import { buildReportHtml, cleanReportDom, exportLanguage, utf8 } from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { ResultsView } from "../results";

const APP_VERSION = "0.1.0";

const slug = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "experimento";

/** Espera o DOM estabilizar: sem figuras em carregamento e sem mudanças por dois quadros. */
async function settled(root: HTMLElement): Promise<void> {
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  let previous = "";
  for (let i = 0; i < 100; i++) {
    await frame();
    const html = root.innerHTML;
    if (!root.querySelector("[data-loading]") && html === previous && html !== "") return;
    previous = html;
    await new Promise((r) => setTimeout(r, 30));
  }
}

export function ReportButton({ onDone }: { onDone: (message: string) => void }) {
  const { t, i18n } = useTranslation("results");
  const state = useProject();
  const workspace = useWorkspace();
  const storage = useStorage();
  const { settings } = useExportSettings();
  const language: Language = exportLanguage(settings, i18n.language);
  const [building, setBuilding] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Instância independente: o relatório sai no idioma da exportação sem alterar a interface.
  const exportI18n = useMemo(() => i18n.cloneInstance({ lng: language }), [i18n, language]);

  const stored = state.result;
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez por pedido de relatório
  useEffect(() => {
    if (!building || !root.current || !stored) return;
    let cancelled = false;
    const el = root.current;
    (async () => {
      try {
        await settled(el);
        if (cancelled) return;
        const tt = exportI18n.getFixedT(language, "results");
        const record = [...state.analyses].reverse().find((a) => a.signature === stored.signature);
        const revision = state.revisions.find((r) => r.id === record?.revisionId);
        const provenance: Array<[string, string]> = [
          ["app", `EnziTAG Optima ${APP_VERSION}`],
          ["project", workspace.name],
          ["experiment", state.name],
          ["method", record ? `${record.methodId} v${record.methodVersion}` : ""],
          ["engine", record?.engineVersion ?? ""],
          ["analysis", record?.id ?? ""],
          ["revision", record?.revisionId ?? ""],
          ["revisionHash", revision?.contentHash ?? ""],
          ["configuration", record ? JSON.stringify(record.options) : ""],
          ["exportLanguage", language],
          ["exportedAt", nowIso()],
        ];
        const html = buildReportHtml({
          language,
          title: `${state.name} — ${tt("export.report.title")}`,
          subtitle: tt("export.report.subtitle"),
          provenanceTitle: tt("export.report.provenance"),
          provenance: provenance.filter(([, v]) => v !== ""),
          bodyHtml: cleanReportDom(el),
          footer: tt("export.report.footer", { version: APP_VERSION }),
        });
        const saved = await storage.exportFile(utf8(html), `${slug(state.name)}-relatorio.html`);
        onDone(
          saved === null
            ? t("comparison.export.cancelled")
            : t("comparison.export.done", { name: saved.name }),
        );
      } catch {
        onDone(t("comparison.export.failed"));
      } finally {
        if (!cancelled) setBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [building]);

  return (
    <>
      <button
        type="button"
        className="button secondary small"
        disabled={building || !stored}
        onClick={() => setBuilding(true)}
        data-testid="report-button"
      >
        {building ? t("export.report.building") : t("export.report.button")}
      </button>
      {building && (
        <div ref={root} hidden aria-hidden="true" data-report-root>
          <I18nextProvider i18n={exportI18n}>
            <ResultsView language={language} report />
          </I18nextProvider>
        </div>
      )}
    </>
  );
}
