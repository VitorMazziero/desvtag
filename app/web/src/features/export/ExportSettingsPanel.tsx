// Preferências de exportação e aparência das figuras (U16/U09): idioma dos arquivos, formato do
// CSV, paleta, tamanho da fonte e algarismos significativos. Valem para o dispositivo.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CsvFormat, ExportLanguage, Palette } from "../../services/export";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { ReportButton } from "./ReportButton";

export function ExportSettingsPanel() {
  const { t } = useTranslation("results");
  const { settings, update } = useExportSettings();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <section className="panel" aria-labelledby="export-settings-title" data-testid="export-panel">
      <h3 id="export-settings-title">{t("export.title")}</h3>
      <p className="muted small">{t("export.intro")}</p>
      <div className="row">
        <label className="field">
          <span>{t("export.language")}</span>
          <select
            value={settings.language}
            onChange={(e) => update({ language: e.target.value as ExportLanguage })}
          >
            <option value="ui">{t("export.languageUi")}</option>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          <span>{t("export.csv")}</span>
          <select
            value={settings.csv}
            onChange={(e) => update({ csv: e.target.value as CsvFormat })}
          >
            <option value="technical">{t("export.csvTechnical")}</option>
            <option value="excel">{t("export.csvExcel")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("export.palette")}</span>
          <select
            value={settings.palette}
            onChange={(e) => update({ palette: e.target.value as Palette })}
          >
            <option value="default">{t("export.paletteDefault")}</option>
            <option value="colorblind">{t("export.paletteColorblind")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("export.fontScale")}</span>
          <select
            value={String(settings.fontScale)}
            onChange={(e) => update({ fontScale: Number(e.target.value) })}
          >
            <option value="0.85">{t("export.fontSmall")}</option>
            <option value="1">{t("export.fontNormal")}</option>
            <option value="1.2">{t("export.fontLarge")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("export.digits")}</span>
          <select
            value={String(settings.digits)}
            onChange={(e) => update({ digits: Number(e.target.value) })}
          >
            {[3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small">{t("export.deviceNote")}</p>
      <div className="row">
        <ReportButton onDone={setNotice} />
      </div>
      {notice && (
        <p role="status" className="muted" data-testid="export-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
