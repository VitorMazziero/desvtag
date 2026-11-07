// U06 — planejamento do experimento (caminho "Planejar experimento"): escolhe entre fatores
// quantitativos (fatorial, triagem, superfície) e um fator categórico (DIC aleatorizado).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { useProject } from "../../state/ProjectContext";
import { GuidedBlocks } from "../blocks";
import { CrdPanel } from "./CrdPanel";
import { MixedPanel } from "./MixedPanel";
import { MixturePanel } from "./MixturePanel";
import { optimalCategoryLevels } from "./OptimalCategoryOptions";
import { OptimalPanel } from "./OptimalPanel";
import { RcbdPanel } from "./RcbdPanel";
import { TwoLevelPanel } from "./TwoLevelPanel";

type Mode = "factorial" | "crd" | "rcbd" | "mixed" | "mixture" | "optimal";

export function DesignPanel({
  language,
  onEditFactors,
}: {
  language: Language;
  onEditFactors?: () => void;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const hasNumeric = state.factors.some((f) => f.kind === "numeric" && f.name.trim() !== "");
  const hasCategorical = state.factors.some(
    (f) => f.kind === "categorical" && f.name.trim() !== "",
  );
  // Ponto de partida: o que já foi gerado; senão, DIC quando só há fator categórico.
  const [mode, setMode] = useState<Mode>(
    state.mixture
      ? "mixture"
      : state.mixed
        ? "mixed"
        : state.rcbd
          ? "rcbd"
          : state.crd
            ? "crd"
            : state.design
              ? "factorial"
              : hasCategorical && !hasNumeric
                ? "crd"
                : "factorial",
  );
  const named = state.factors.filter((f) => f.name.trim());
  const compatible: Record<Mode, boolean> = {
    factorial: hasNumeric && named.filter((f) => f.kind === "numeric").length >= 2,
    crd: named.length >= 1,
    rcbd: named.length >= 2,
    mixed:
      named.filter((f) => f.levelsText.split(/[;,\n]/).filter((v) => v.trim()).length >= 2)
        .length >= 2,
    mixture: named.filter((f) => f.kind === "numeric").length >= 2,
    optimal:
      hasNumeric ||
      state.factors.some(
        (factor, i) =>
          factor.kind === "categorical" &&
          factor.name.trim() !== "" &&
          optimalCategoryLevels(factor.levelsText, state.rows, i).length >= 2,
      ),
  };
  return (
    <>
      <GuidedBlocks
        testId="design-type-blocks"
        order={0}
        blocks={[
          {
            id: "type",
            ready: compatible[mode],
            title: t("design.mode.legend"),
            titled: true,
            content: (
              <fieldset className="editor-card" data-testid="design-mode">
                <legend>{t("design.mode.legend")}</legend>
                {(["factorial", "crd", "rcbd", "mixed", "mixture", "optimal"] as const).map((m) => (
                  <label className="check" key={m}>
                    <input
                      type="radio"
                      name="design-mode"
                      checked={mode === m}
                      onChange={() => setMode(m)}
                    />
                    <span>
                      {t(`design.mode.${m}`)}{" "}
                      <small>
                        {t(compatible[m] ? "design.compatible" : "design.requirementsPending")}
                      </small>
                      <small className="muted block">{t(`design.requirements.${m}`)}</small>
                    </span>
                  </label>
                ))}
                {!compatible[mode] && onEditFactors && (
                  <button type="button" className="button secondary" onClick={onEditFactors}>
                    {t("design.completeFactors")}
                  </button>
                )}
              </fieldset>
            ),
          },
        ]}
      />
      {mode === "crd" ? (
        <CrdPanel />
      ) : mode === "rcbd" ? (
        <RcbdPanel />
      ) : mode === "mixed" ? (
        <MixedPanel />
      ) : mode === "mixture" ? (
        <MixturePanel />
      ) : mode === "optimal" ? (
        <OptimalPanel language={language} />
      ) : (
        <TwoLevelPanel language={language} />
      )}
    </>
  );
}
