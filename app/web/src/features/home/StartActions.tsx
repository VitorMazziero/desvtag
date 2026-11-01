import { useTranslation } from "react-i18next";
import { useEngine } from "../../services/engine/EngineContext";
import type { EntryPath } from "../../state/project";
import { missingMethods } from "./availability";

const PATHS: EntryPath[] = ["plan", "analyze", "compare"];

interface Props {
  selected: EntryPath | null;
  onChoose: (path: EntryPath) => void;
}

/** As três entradas: planejar, analisar dados existentes e comparar tratamentos. */
export function StartActions({ selected, onChoose }: Props) {
  const { t } = useTranslation();
  const { info } = useEngine();
  const capabilities = info.phase === "ready" ? info.info.capabilities : null;
  return (
    <fieldset className="choice-group">
      <legend>{t("home.title")}</legend>
      <div className="choice-grid">
        {PATHS.map((path) => {
          const missing = missingMethods(path, capabilities);
          return (
            <label key={path} className="choice-card" data-selected={selected === path}>
              <input
                type="radio"
                name="entry-path"
                value={path}
                checked={selected === path}
                onChange={() => onChoose(path)}
              />
              <span className="choice-title">{t(`home.${path}.title`)}</span>
              <span className="muted">{t(`home.${path}.text`)}</span>
              <span className="badge" data-available={missing.length === 0}>
                {missing.length === 0
                  ? t("home.availability.available")
                  : t("home.availability.limited", {
                      missing: t(`home.availability.missing.${path}`),
                    })}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
