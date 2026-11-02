// Relatório HTML (U16): renderiza os resultados no idioma da exportação fora da tela, espera as
// figuras e grava um arquivo único e autocontido. Os textos vêm das mesmas chaves da interface.

import { useEffect, useMemo, useRef, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import logoInline from "../../assets/enzitag-logo.png?inline";
import type { Language } from "../../i18n";
import { nowIso } from "../../lib/ids";
import { APP_VERSION } from "../../lib/version";
import {
  buildReportHtml,
  cleanReportDom,
  cleanReportRoot,
  commentsSection,
  exportLanguage,
  reportPdf,
  utf8,
} from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { ResultsView } from "../results";

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

const BUTTONS = {
  html: { testId: "report-button", label: "export.report.button" },
  pdf: { testId: "report-pdf-button", label: "export.report.buttonPdf" },
  docx: { testId: "report-docx-button", label: "export.report.buttonDocx" },
} as const;

export function ReportButton({
  onDone,
  format = "html",
}: {
  onDone: (message: string) => void;
  format?: "html" | "pdf" | "docx";
}) {
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
        const pairs = provenance.filter(([, v]) => v !== "");
        // No fim do relatório só o essencial para reproduzir; o conjunto completo vai nos metadados.
        const brief = pairs.filter(([k]) =>
          ["app", "method", "engine", "analysis", "revision", "exportedAt"].includes(k),
        );
        // Comentários (opcional): entram como seção do mesmo DOM, para sair igual em HTML, PDF e Word.
        if (settings.reportComments) {
          const section = commentsSection(document, state.comments, {
            title: tt("export.report.commentsTitle"),
            resolved: tt("export.report.commentsResolved"),
            revision: (id) => tt("export.report.commentsRevision", { id }),
            date: (iso) => new Date(iso).toLocaleDateString(language),
            target: (target) =>
              target.kind === "experiment"
                ? tt("export.report.commentsExperiment")
                : target.kind === "analysis"
                  ? tt("export.report.commentsAnalysis", { analysis: target.analysisId ?? "" })
                  : tt(
                      target.kind === "figure"
                        ? "export.report.commentsFigure"
                        : "export.report.commentsTable",
                      { key: target.key ?? "" },
                    ),
          });
          if (section) el.append(section);
        }
        const title = `${state.name} — ${tt("export.report.title")}`;
        let saved: { name: string } | null;
        if (format === "pdf") {
          const bytes = await reportPdf({
            info: {
              title,
              subject: tt("export.report.subtitle"),
              keywords: pairs
                .map(([k, v]) => `${k}=${v}`)
                .join("; ")
                .slice(0, 900),
              creator: `EnziTAG Optima ${APP_VERSION}`,
            },
            title,
            subtitle: tt("export.report.subtitle"),
            provenanceTitle: tt("export.report.provenance"),
            provenance: brief,
            body: cleanReportRoot(el),
            footer: tt("export.report.footerPdf", { version: APP_VERSION }),
            logoDataUri: settings.reportLogo ? logoInline : undefined,
            pageLabel: (page, total) => tt("export.report.page", { page, total }),
          });
          saved = await storage.exportFile(bytes, `${slug(state.name)}-relatorio.pdf`);
        } else if (format === "docx") {
          // O Word é carregado só aqui: a biblioteca não pesa no início do aplicativo.
          const { reportDocx } = await import("../../services/export/docx");
          const bytes = await reportDocx({
            info: {
              title,
              subject: tt("export.report.subtitle"),
              keywords: pairs
                .map(([k, v]) => `${k}=${v}`)
                .join("; ")
                .slice(0, 900),
              creator: `EnziTAG Optima ${APP_VERSION}`,
            },
            title,
            subtitle: tt("export.report.subtitle"),
            provenanceTitle: tt("export.report.provenance"),
            provenance: brief,
            body: cleanReportRoot(el),
            footer: tt("export.report.footerPdf", { version: APP_VERSION }),
            logoDataUri: settings.reportLogo ? logoInline : undefined,
            pageLabel: (page, total) => tt("export.report.page", { page, total }),
          });
          saved = await storage.exportFile(bytes, `${slug(state.name)}-relatorio.docx`);
        } else {
          const html = buildReportHtml({
            language,
            title,
            subtitle: tt("export.report.subtitle"),
            provenanceTitle: tt("export.report.provenance"),
            provenance: brief,
            metadata: pairs,
            bodyHtml: cleanReportDom(el),
            footer: tt("export.report.footer", { version: APP_VERSION }),
            logo: settings.reportLogo
              ? { dataUri: logoInline, alt: exportI18n.getFixedT(language)("app.logoAlt") }
              : undefined,
          });
          saved = await storage.exportFile(utf8(html), `${slug(state.name)}-relatorio.html`);
        }
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
        data-testid={BUTTONS[format].testId}
      >
        {building ? t("export.report.building") : t(BUTTONS[format].label)}
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
