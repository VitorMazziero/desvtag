// Preferências de exportação e aparência das figuras (U16/U09): idioma dos arquivos, formato do
// CSV, paleta, tamanho da fonte e algarismos significativos. Valem para o dispositivo.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CsvFormat, ExportLanguage, Palette } from "../../services/export";
import { useExportSettings } from "../../state/ExportSettingsContext";
import { useProject } from "../../state/ProjectContext";
import { analysisDescription } from "../analysis/presentation";
import { savedFamilyDescription } from "../results/savedFamily";
import { useViewedFamily } from "../results/ViewedFamily";
import { ReportButton } from "./ReportButton";

export function ExportSettingsPanel() {
  const { t, i18n } = useTranslation("results");
  const project = useProject();
  const record = [...project.analyses]
    .reverse()
    .find((a) => a.signature === project.result?.signature);
  const common = i18n.getFixedT(i18n.language, "common");
  const { saved: family } = useViewedFamily();
  const familyDescription = savedFamilyDescription(project, common, family?.record.id);
  const { settings, update } = useExportSettings();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <section className="panel" aria-labelledby="export-settings-title" data-testid="export-panel">
      <h3 id="export-settings-title">{t("export.title")}</h3>
      <p className="muted small">{t("export.intro")}</p>
      {(record || familyDescription) && (
        <p data-testid="export-summary">
          {familyDescription ??
            (record &&
              analysisDescription(
                common,
                project,
                record.options,
                record.methodId,
                record.revisionId,
              ))}{" "}
          {t("export.summary", {
            language: settings.language === "ui" ? i18n.language : settings.language,
            palette: settings.palette,
            scale: settings.fontScale,
          })}
        </p>
      )}
      <fieldset>
        <legend>{t("export.filePreferences")}</legend>
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
        </div>
      </fieldset>
      <fieldset>
        <legend>{t("export.figurePreferences")}</legend>
        <div className="row">
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
      </fieldset>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.reportLogo}
          onChange={(e) => update({ reportLogo: e.target.checked })}
        />
        <span>{t("export.logo")}</span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.reportComments}
          onChange={(e) => update({ reportComments: e.target.checked })}
        />
        <span>{t("export.comments")}</span>
      </label>
      <p className="muted small">{t("export.deviceNote")}</p>
      <div className="row">
        <ReportButton onDone={setNotice} />
        <ReportButton onDone={setNotice} format="pdf" />
        <ReportButton onDone={setNotice} format="docx" />
      </div>
      {notice && (
        <p role="status" className="muted" data-testid="export-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
