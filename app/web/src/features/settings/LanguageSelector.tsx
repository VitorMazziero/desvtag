import { useTranslation } from "react-i18next";
import { isLanguage, LANGUAGES, type Language } from "../../i18n";

interface Props {
  value: Language;
  onChange: (language: Language) => void;
}

export function LanguageSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <label className="field">
      <span>{t("settings.language")}</span>
      <select
        value={value}
        onChange={(event) => {
          if (isLanguage(event.target.value)) onChange(event.target.value);
        }}
      >
        {LANGUAGES.map((language) => (
          <option key={language} value={language} lang={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
