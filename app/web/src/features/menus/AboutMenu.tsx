// Menu «Sobre e atualizações» (ET29): histórico de versões, motor científico e atualizações saem
// do fluxo de trabalho e ficam aqui, sempre à mão mas fora da frente do usuário.
import { useTranslation } from "react-i18next";
import { APP_VERSION, BUILD_COMMIT } from "../../lib/version";
import { EngineStatus } from "../engine-status";
import { HistoryView } from "../project";
import { UpdateCheck } from "../settings";
import { Menu } from "./Menu";

export function AboutMenu() {
  const { t } = useTranslation();
  return (
    <Menu label={t("menus.about")} testId="about-menu" alignEnd>
      <div className="about-panel">
        <p data-testid="build-identity">
          <strong>
            {t("app.name")} · {t("about.interfaceVersion")}: {APP_VERSION}
          </strong>
          <br />
          {t("about.buildCommit")}: <code>{BUILD_COMMIT}</code>
        </p>
        <p className="small" data-testid="developer-credit">
          {t("about.developedBy", { name: "Vítor Teixeira Mazziero" })}
        </p>
        {/AppleWebKit/.test(navigator.userAgent) &&
          !/Chrome|Chromium|Edg|OPR|Android/.test(navigator.userAgent) && (
            <p className="muted small" data-testid="keyboard-browser-hint">
              {t("about.keyboardHint")}
            </p>
          )}
        <HistoryView />
        <EngineStatus />
        <UpdateCheck />
      </div>
    </Menu>
  );
}
