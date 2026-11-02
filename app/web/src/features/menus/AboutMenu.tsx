// Menu «Sobre e atualizações» (ET29): histórico de versões, motor científico e atualizações saem
// do fluxo de trabalho e ficam aqui, sempre à mão mas fora da frente do usuário.
import { useTranslation } from "react-i18next";
import { EngineStatus } from "../engine-status";
import { HistoryView } from "../project";
import { UpdateCheck } from "../settings";
import { Menu } from "./Menu";

export function AboutMenu() {
  const { t } = useTranslation();
  return (
    <Menu label={t("menus.about")} testId="about-menu" alignEnd>
      <div className="about-panel">
        <HistoryView />
        <EngineStatus />
        <UpdateCheck />
      </div>
    </Menu>
  );
}
