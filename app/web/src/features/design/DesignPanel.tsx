// U06 — planejamento do experimento (caminho "Planejar experimento"): escolhe entre fatores
// quantitativos (fatorial, triagem, superfície) e um fator categórico (DIC aleatorizado).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject } from "../../state/ProjectContext";
import { CrdPanel } from "./CrdPanel";
import { TwoLevelPanel } from "./TwoLevelPanel";

type Mode = "factorial" | "crd";

export function DesignPanel({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const hasNumeric = state.factors.some((f) => f.kind === "numeric" && f.name.trim() !== "");
  const hasCategorical = state.factors.some(
    (f) => f.kind === "categorical" && f.name.trim() !== "",
  );
  // Ponto de partida: o que já foi gerado; senão, DIC quando só há fator categórico.
  const [mode, setMode] = useState<Mode>(
    state.crd
      ? "crd"
      : state.design
        ? "factorial"
        : hasCategorical && !hasNumeric
          ? "crd"
          : "factorial",
  );
  return (
    <>
      <fieldset className="editor-card" data-testid="design-mode">
        <legend>{t("design.mode.legend")}</legend>
        {(["factorial", "crd"] as const).map((m) => (
          <label className="check" key={m}>
            <input
              type="radio"
              name="design-mode"
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            <span>{t(`design.mode.${m}`)}</span>
          </label>
        ))}
      </fieldset>
      {mode === "crd" ? <CrdPanel /> : <TwoLevelPanel language={language} />}
    </>
  );
}
