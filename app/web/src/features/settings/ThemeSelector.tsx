import { useTranslation } from "react-i18next";
import { isTheme, THEMES, type Theme } from "../../state/preferences";

interface Props {
  value: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <label className="field">
      <span>{t("settings.theme")}</span>
      <select
        value={value}
        onChange={(event) => {
          if (isTheme(event.target.value)) onChange(event.target.value);
        }}
      >
        {THEMES.map((theme) => (
          <option key={theme} value={theme}>
            {t(`theme.${theme}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
