import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GroupLogo } from "../features/branding";
import { AboutMenu, ExtrasMenu } from "../features/menus";
import { ExperimentBar, ProjectBar, RecoveryBanner } from "../features/project";
import { LanguageSelector, ThemeSelector } from "../features/settings";
import { Workflow } from "../features/workflow";
import type { Language } from "../i18n";
import { useAutosave } from "../services/storage/autosave";
import { useWorkspace } from "../state/ProjectContext";
import type { Theme } from "../state/preferences";
import { hasUnsavedChanges } from "../state/workspace";

interface Props {
  language: Language;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
}

export function App({ language, theme, onLanguageChange, onThemeChange }: Props) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const recovery = useAutosave(workspace);
  const unsaved = hasUnsavedChanges(workspace);

  // Fechar a janela com alterações não salvas em arquivo pede confirmação.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  return (
    <>
      <a className="skip-link" href="#main">
        {t("app.skipToContent")}
      </a>
      <header className="app-header">
        <h1 className="brand">
          <GroupLogo />
        </h1>
        <div className="settings">
          <LanguageSelector value={language} onChange={onLanguageChange} />
          <ThemeSelector value={theme} onChange={onThemeChange} />
          <div className="header-menus">
            <ExtrasMenu language={language} />
            <AboutMenu />
          </div>
        </div>
      </header>
      <main id="main" className="app-main">
        <RecoveryBanner />
        <ProjectBar recovery={recovery} />
        <ExperimentBar />
        <Workflow key={`${workspace.epoch}:${workspace.currentId}`} language={language} />
      </main>
    </>
  );
}
