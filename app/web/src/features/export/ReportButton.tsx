// Relatório HTML (U16): renderiza os resultados no idioma da exportação fora da tela, espera as
// figuras e grava um arquivo único e autocontido. Os textos vêm das mesmas chaves da interface.

import { useEffect, useMemo, useRef, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
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
import { populateReportTables } from "../../services/export/reportTables";
import { useStorage } from "../../services/storage/context";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { analysisDescription } from "../analysis/presentation";
import { commentTargetLabel } from "../comments/targetLabels";
import { ResultsView } from "../results";
import { savedFamilyDescription, savedFamilyProvenance } from "../results/savedFamily";
import { useViewedFamily } from "../results/ViewedFamily";
import { useReportTask } from "./useReportTask";

const slug = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "experimento";

/** Espera o DOM estabilizar: sem figuras em carregamento e sem mudanças por dois quadros. */
async function settled(root: HTMLElement, signal?: AbortSignal): Promise<void> {
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  let previous = "";
  for (let i = 0; i < 100; i++) {
    signal?.throwIfAborted();
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

  const { saved: family } = useViewedFamily();
  const stored = state.result;
  const sourceId =
    family?.record.id ??
    [...state.analyses].reverse().find((a) => a.signature === stored?.signature)?.id ??
    "none";
  const task = useReportTask(
    `${workspace.projectId}:${workspace.epoch}:${workspace.changeSeq}:${state.id}:${sourceId}:${language}:${JSON.stringify(settings)}`,
  );
  const requestedSignal = useRef<AbortSignal | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez por pedido de relatório
  useEffect(() => {
    if (!building || !root.current || (!stored && !family)) return;
    let cancelled = false;
    const signal = requestedSignal.current;
    if (!signal) return;
    const el = root.current;
    (async () => {
      try {
        await populateReportTables(el, signal);
        await settled(el, signal);
        const logoInline = settings.reportLogo
          ? (await import("../../assets/desvtag-logo.png?inline")).default
          : undefined;
        signal.throwIfAborted();
        if (cancelled) return;
        const tt = exportI18n.getFixedT(language, "results");
        const record = family
          ? undefined
          : [...state.analyses].reverse().find((a) => a.signature === stored?.signature);
        const source = family?.record ?? record;
        const method = family
          ? savedFamilyProvenance(family)
          : record
            ? {
                methodId: record.methodId,
                methodVersion: record.methodVersion,
                engineVersion: record.engineVersion,
              }
            : null;
        if (record) {
          const paragraph = document.createElement("p");
          paragraph.dataset.reportMethod = "true";
          paragraph.textContent = analysisDescription(
            exportI18n.getFixedT(language, "common"),
            state,
            record.options,
            record.methodId,
            record.revisionId,
          );
          el.prepend(paragraph);
        }
        if (family) {
          const paragraph = document.createElement("p");
          paragraph.dataset.reportMethod = "true";
          paragraph.textContent = savedFamilyDescription(
            state,
            exportI18n.getFixedT(language, "common"),
            family.record.id,
          );
          el.prepend(paragraph);
        }
        const revision = state.revisions.find((r) => r.id === source?.revisionId);
        const provenance: Array<[string, string]> = [
          ["app", `DesvTAG ${APP_VERSION}`],
          ["project", workspace.name],
          ["experiment", state.name],
          ["method", method ? `${method.methodId} v${method.methodVersion}` : ""],
          ["engine", method?.engineVersion ?? ""],
          ["analysis", source?.id ?? ""],
          ["revision", source?.revisionId ?? ""],
          ["revisionHash", revision?.contentHash ?? ""],
          [
            "configuration",
            family
              ? JSON.stringify(family.record.input)
              : record
                ? JSON.stringify(record.options)
                : "",
          ],
          ...(family?.family === "power" && family.record.result.simulation
            ? [
                ["simulationAlgorithm", family.record.result.simulation.algorithm] as [
                  string,
                  string,
                ],
              ]
            : []),
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
            edited: (date) =>
              exportI18n.getFixedT(language, "common")("comments.edited", {
                date: new Date(date).toLocaleString(language),
              }),
            revision: (id) => tt("export.report.commentsRevision", { id }),
            date: (iso) => new Date(iso).toLocaleDateString(language),
            target: (target) =>
              commentTargetLabel(exportI18n.getFixedT(language, "common"), state, target, language),
          });
          if (section) el.append(section);
        }
        const title = `${state.name} — ${tt("export.report.title")}`;
        let saved: { name: string } | null;
        if (format === "pdf") {
          const bytes = await reportPdf(
            {
              info: {
                title,
                subject: tt("export.report.subtitle"),
                keywords: pairs
                  .map(([k, v]) => `${k}=${v}`)
                  .join("; ")
                  .slice(0, 900),
                creator: `DesvTAG ${APP_VERSION}`,
              },
              title,
              subtitle: tt("export.report.subtitle"),
              provenanceTitle: tt("export.report.provenance"),
              provenance: brief,
              body: cleanReportRoot(el),
              footer: tt("export.report.footer", { version: APP_VERSION }),
              logoDataUri: logoInline,
              pageLabel: (page, total) => tt("export.report.page", { page, total }),
            },
            signal,
          );
          signal.throwIfAborted();
          saved = await storage.exportFile(bytes, `${slug(state.name)}-relatorio.pdf`);
        } else if (format === "docx") {
          // O Word é carregado só aqui: a biblioteca não pesa no início do aplicativo.
          const { reportDocx } = await import("../../services/export/docx");
          const bytes = await reportDocx(
            {
              info: {
                title,
                subject: tt("export.report.subtitle"),
                keywords: pairs
                  .map(([k, v]) => `${k}=${v}`)
                  .join("; ")
                  .slice(0, 900),
                creator: `DesvTAG ${APP_VERSION}`,
              },
              title,
              subtitle: tt("export.report.subtitle"),
              provenanceTitle: tt("export.report.provenance"),
              provenance: brief,
              body: cleanReportRoot(el),
              footer: tt("export.report.footer", { version: APP_VERSION }),
              logoDataUri: logoInline,
              pageLabel: (page, total) => tt("export.report.page", { page, total }),
            },
            signal,
          );
          signal.throwIfAborted();
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
            logo: logoInline
              ? { dataUri: logoInline, alt: exportI18n.getFixedT(language)("app.logoAlt") }
              : undefined,
          });
          signal.throwIfAborted();
          saved = await storage.exportFile(utf8(html), `${slug(state.name)}-relatorio.html`);
        }
        onDone(
          saved === null
            ? t("comparison.export.cancelled")
            : t("comparison.export.done", { name: saved.name }),
        );
      } catch {
        if (!cancelled)
          onDone(
            signal.aborted
              ? t(
                  signal.reason === "sourceChanged"
                    ? "export.report.sourceChanged"
                    : "comparison.export.cancelled",
                )
              : t("comparison.export.failed"),
          );
      } finally {
        task.finish(signal);
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
        disabled={task.busy || (!stored && !family)}
        onClick={() => {
          const signal = task.begin();
          if (signal) {
            requestedSignal.current = signal;
            setBuilding(true);
          }
        }}
        data-testid={BUTTONS[format].testId}
      >
        {building ? t("export.report.building") : t(BUTTONS[format].label)}
      </button>
      {building && task.ownsTask && (
        <button
          type="button"
          className="button secondary small"
          onClick={task.cancel}
          data-testid="report-cancel"
        >
          {t("export.report.cancel")}
        </button>
      )}
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
