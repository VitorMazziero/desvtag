import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { App } from "./app/App";
import "./app/app.css";
import { createI18n } from "./i18n";
import { createDefaultEngineClient } from "./services/engine";
import { EngineProvider } from "./services/engine/EngineContext";
import { createDefaultStorageProvider } from "./services/storage";
import { StorageProviderContext } from "./services/storage/context";
import { ExportSettingsProvider } from "./state/ExportSettingsContext";
import { ProjectProvider } from "./state/ProjectContext";
import { applyPreferences, loadPreferences, usePreferences } from "./state/preferences";
import "./themes/fonts.css";
import "./themes/tokens.css";
import "./themes/soft-light.css";
import "./themes/modern-dark.css";
import "./themes/professional.css";

const initial = loadPreferences();
applyPreferences(initial); // antes da primeira pintura: evita piscar o tema errado
const i18n = createI18n(initial.language);
const storage = createDefaultStorageProvider();

function Root() {
  const { preferences, setLanguage, setTheme } = usePreferences(initial);
  useEffect(() => {
    void i18n.changeLanguage(preferences.language);
  }, [preferences.language]);
  return (
    <I18nextProvider i18n={i18n}>
      <EngineProvider createClient={createDefaultEngineClient}>
        <StorageProviderContext provider={storage}>
          <ProjectProvider>
            <ExportSettingsProvider>
              <App
                language={preferences.language}
                theme={preferences.theme}
                onLanguageChange={setLanguage}
                onThemeChange={setTheme}
              />
            </ExportSettingsProvider>
          </ProjectProvider>
        </StorageProviderContext>
      </EngineProvider>
    </I18nextProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
