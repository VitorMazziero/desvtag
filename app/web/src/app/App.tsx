import { useTranslation } from "react-i18next";
import { EngineStatus } from "../features/engine-status";
import { LanguageSelector, ThemeSelector } from "../features/settings";
import { Workflow } from "../features/workflow";
import type { Language } from "../i18n";
import type { Theme } from "../state/preferences";

interface Props {
  language: Language;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
}

export function App({ language, theme, onLanguageChange, onThemeChange }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <a className="skip-link" href="#main">
        {t("app.skipToContent")}
      </a>
      <header className="app-header">
        <div>
          <h1>{t("app.name")}</h1>
          <p className="muted">{t("app.tagline")}</p>
        </div>
        <div className="settings">
          <LanguageSelector value={language} onChange={onLanguageChange} />
          <ThemeSelector value={theme} onChange={onThemeChange} />
        </div>
      </header>
      <main id="main" className="app-main">
        <Workflow language={language} />
      </main>
      <footer className="app-footer">
        <EngineStatus />
      </footer>
    </>
  );
}
