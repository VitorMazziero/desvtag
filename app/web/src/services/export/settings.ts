// Preferências de exportação e de aparência das figuras (preferência do dispositivo; ficam no
// armazenamento local do navegador/aplicativo e são registradas nos metadados dos arquivos).
export type ExportLanguage = "ui" | "pt-BR" | "en";
export type CsvFormat = "technical" | "excel";
export type Palette = "default" | "colorblind";

export interface ExportSettings {
  /** Idioma dos textos exportados (relatório); `ui` = o da interface no momento. */
  language: ExportLanguage;
  /** `technical`: vírgula e ponto decimal; `excel`: segue o idioma da exportação (PT: `;` e vírgula). */
  csv: CsvFormat;
  palette: Palette;
  /** Tamanho da fonte das figuras (1 = padrão). */
  fontScale: number;
  /** Algarismos significativos nos rótulos das figuras (3 a 6). */
  digits: number;
  /** Incluir o logotipo do grupo nos relatórios (crédito; pode ser desligado). */
  reportLogo: boolean;
  /** Incluir os comentários do experimento ao final dos relatórios. */
  reportComments: boolean;
  /** Equações com os nomes das variáveis (padrão) ou com a notação ŷ e x₁, x₂… */
  equationNames: boolean;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  language: "ui",
  csv: "technical",
  palette: "default",
  fontScale: 1,
  digits: 4,
  reportLogo: true,
  reportComments: false,
  equationNames: true,
};

const KEY = "optima.exportSettings";

export function loadExportSettings(): ExportSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_EXPORT_SETTINGS;
    const v = JSON.parse(raw) as Partial<ExportSettings>;
    return {
      language: v.language === "pt-BR" || v.language === "en" ? v.language : "ui",
      csv: v.csv === "excel" ? "excel" : "technical",
      palette: v.palette === "colorblind" ? "colorblind" : "default",
      fontScale: [0.85, 1, 1.2].includes(v.fontScale as number) ? (v.fontScale as number) : 1,
      digits: Math.min(6, Math.max(3, Math.floor(Number(v.digits) || 4))),
      reportLogo: v.reportLogo !== false,
      reportComments: v.reportComments === true,
      equationNames: v.equationNames !== false,
    };
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

export function saveExportSettings(settings: ExportSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // sem armazenamento: a preferência vale só para esta sessão
  }
}

/** Idioma efetivo da exportação. */
export function exportLanguage(settings: ExportSettings, uiLanguage: string): "pt-BR" | "en" {
  if (settings.language !== "ui") return settings.language;
  return uiLanguage === "en" ? "en" : "pt-BR";
}
