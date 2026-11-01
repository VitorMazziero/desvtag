import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import { useExportSettings } from "../../state/ExportSettingsContext";

/** Formatador dos rótulos das figuras: algarismos significativos das preferências de exportação. */
export function useFigureFormat(language: Language): (value: number) => string {
  const { settings } = useExportSettings();
  return (value) => formatSignificant(value, language, settings.digits);
}
