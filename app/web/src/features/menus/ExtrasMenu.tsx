// Menu «Extras» (ET29): ferramentas que não fazem parte do percurso de um planejamento (outro
// objetivo, outra abordagem): calculadora de potência, ajuste de curvas de saturação e exemplos prontos.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { SaturationFit } from "../analysis/SaturationFit";
import { ExamplesDialog } from "../examples";
import { PowerCalculator } from "../home/PowerCalculator";
import { closeMenuOf, Menu } from "./Menu";
import { Modal } from "./Modal";

type Tool = "power" | "saturation" | "examples" | null;

export function ExtrasMenu({ language }: { language: Language }) {
  const { t } = useTranslation();
  const [tool, setTool] = useState<Tool>(null);
  return (
    <>
      <Menu label={t("menus.extras")} testId="extras-menu" alignEnd>
        <p className="muted small">{t("menus.extrasHelp")}</p>
        <ul className="menu-list">
          <li>
            <button
              type="button"
              className="button secondary"
              data-testid="open-power"
              onClick={(e) => {
                closeMenuOf(e.currentTarget);
                setTool("power");
              }}
            >
              {t("menus.power")}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="button secondary"
              data-testid="open-saturation"
              onClick={(e) => {
                closeMenuOf(e.currentTarget);
                setTool("saturation");
              }}
            >
              {t("menus.saturation")}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="button secondary"
              data-testid="open-examples"
              onClick={(e) => {
                closeMenuOf(e.currentTarget);
                setTool("examples");
              }}
            >
              {t("menus.examples")}
            </button>
          </li>
        </ul>
      </Menu>
      <Modal
        open={tool === "power"}
        title={t("menus.powerShort")}
        onClose={() => setTool(null)}
        testId="power-dialog"
      >
        <PowerCalculator language={language} embedded onCalculated={() => setTool(null)} />
      </Modal>
      <Modal
        open={tool === "saturation"}
        title={t("menus.saturationShort")}
        onClose={() => setTool(null)}
        testId="saturation-dialog"
      >
        <SaturationFit language={language} embedded onCalculated={() => setTool(null)} />
      </Modal>
      <Modal
        open={tool === "examples"}
        title={t("menus.examples")}
        onClose={() => setTool(null)}
        testId="examples-dialog"
      >
        <ExamplesDialog onOpened={() => setTool(null)} />
      </Modal>
    </>
  );
}
