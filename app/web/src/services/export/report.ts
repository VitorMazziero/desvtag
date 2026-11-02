// Relatório HTML autocontido (U16): um único arquivo, sem recursos externos, com método,
// configuração, revisão, versões, tabelas, figuras (SVG embutido) e a interpretação já exibidas.
// O conteúdo vem do DOM dos resultados renderizados no idioma da exportação; aqui só se limpa o
// DOM (sem botões nem controles) e se monta o documento.

import { esc } from "../charts/svg";

/** Remove controles e troca cada figura pela versão de exportação (cores fixas, fundo branco). */
export function cleanReportRoot(root: HTMLElement): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;
  for (const canvas of clone.querySelectorAll<HTMLElement>("[data-export-svg]")) {
    canvas.innerHTML = canvas.getAttribute("data-export-svg") ?? "";
    canvas.removeAttribute("data-export-svg");
  }
  for (const el of clone.querySelectorAll(
    "button, input, select, textarea, details.advanced, label.field, figcaption, [data-report-skip]",
  ))
    el.remove();
  for (const el of clone.querySelectorAll(".row")) if (el.textContent?.trim() === "") el.remove();
  for (const el of clone.querySelectorAll("[id]")) {
    // Ids dos títulos de seção (referenciados por aria-labelledby) são mantidos; os demais saem.
    if (!el.id.endsWith("-title")) el.removeAttribute("id");
  }
  return clone;
}

/** Mesmo conteúdo, como HTML, para o relatório autocontido. */
export function cleanReportDom(root: HTMLElement): string {
  return cleanReportRoot(root).innerHTML;
}

export interface ReportInput {
  language: "pt-BR" | "en";
  title: string;
  subtitle: string;
  provenanceTitle: string;
  /** Proveniência sucinta, mostrada **no fim** do relatório. */
  provenance: Array<[string, string]>;
  /** Proveniência completa, gravada só nos metadados do arquivo (`<meta>`). */
  metadata?: Array<[string, string]>;
  bodyHtml: string;
  footer: string;
  /** Logotipo do grupo como crédito (PNG em `data:`); ausente = sem logotipo. */
  logo?: { dataUri: string; alt: string };
}

const STYLE = `
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#16191f;background:#fff;max-width:960px;margin:0 auto;padding:24px;line-height:1.5}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.25rem;margin-top:28px;border-bottom:1px solid #dde0e6;padding-bottom:4px}h3{font-size:1.05rem;margin-top:20px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:.9rem}th,td{border:1px solid #dde0e6;padding:4px 8px;text-align:left;vertical-align:top}
td.num{text-align:right;font-variant-numeric:tabular-nums}caption{text-align:left;font-weight:600;padding:4px 0}thead th{background:#f3f4f7}
.credit{margin:0 0 8px}figure{margin:16px 0;break-inside:avoid}svg{max-width:100%;height:auto}.muted,.small{color:#454c58}.small{font-size:.85rem}
dl.interpretation dt{font-weight:600;margin-top:8px}dl.interpretation dd{margin:0 0 4px}.sr-only{position:absolute;left:-9999px}
ul.facts-list{padding-left:20px}.provenance td:first-child{width:28%;font-family:ui-monospace,monospace;font-size:.82rem}
.provenance td{word-break:break-word}footer{margin-top:32px;color:#454c58;font-size:.82rem;border-top:1px solid #dde0e6;padding-top:8px}
@media print{body{max-width:none;padding:0}h2{break-after:avoid}table{break-inside:auto}tr{break-inside:avoid}}
`;

/** Monta o documento HTML completo (todo texto de entrada é escapado, exceto `bodyHtml`, já limpo). */
export function buildReportHtml(input: ReportInput): string {
  const rows = input.provenance
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("");
  return (
    `<!doctype html>\n<html lang="${input.language === "en" ? "en" : "pt-BR"}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(input.title)}</title>` +
    (input.metadata ?? [])
      .map(([k, v]) => `<meta name="enzitag:${esc(k)}" content="${esc(v)}">`)
      .join("") +
    `<style>${STYLE}</style></head><body>` +
    (input.logo
      ? `<p class="credit"><img src="${esc(input.logo.dataUri)}" alt="${esc(input.logo.alt)}" width="140" height="39"></p>`
      : "") +
    `<h1>${esc(input.title)}</h1><p class="muted">${esc(input.subtitle)}</p>` +
    input.bodyHtml +
    `<section class="provenance-end"><h2>${esc(input.provenanceTitle)}</h2><table class="provenance"><tbody>${rows}</tbody></table></section>` +
    `<footer>${esc(input.footer)}</footer></body></html>`
  );
}
