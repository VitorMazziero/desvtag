import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { EngineStatus } from "../features/engine-status";
import { ExperimentBar, HistoryView, ProjectBar, RecoveryBanner } from "../features/project";
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
        <RecoveryBanner />
        <ProjectBar recovery={recovery} />
        <ExperimentBar />
        <Workflow key={`${workspace.epoch}:${workspace.currentId}`} language={language} />
        <HistoryView />
      </main>
      <footer className="app-footer">
        <EngineStatus />
      </footer>
    </>
  );
}
