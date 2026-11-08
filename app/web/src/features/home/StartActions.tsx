import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEngine } from "../../services/engine/EngineContext";
import type { EntryPath } from "../../state/project";
import { missingMethods } from "./availability";

const PATHS: EntryPath[] = ["plan", "analyze", "compare"];

interface Props {
  selected: EntryPath | null;
  onStart: (path: EntryPath) => void;
}

/** As três entradas: planejar, analisar dados existentes e comparar tratamentos. */
export function StartActions({ selected, onStart }: Props) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState(selected);
  const { info } = useEngine();
  const capabilities = info.phase === "ready" ? info.info.capabilities : null;
  return (
    <fieldset className="choice-group">
      <legend className="sr-only">{t("home.title")}</legend>
      <div className="choice-grid">
        {PATHS.map((path) => {
          // Loading is not evidence of an unavailable method; avoid moving the action under the pointer.
          const missing = capabilities ? missingMethods(path, capabilities) : [];
          return (
            <label key={path} className="choice-card" data-selected={choice === path}>
              <span className="choice-title">
                <input
                  type="radio"
                  name="objective"
                  value={path}
                  checked={choice === path}
                  onChange={() => setChoice(path)}
                  aria-labelledby={`objective-${path}-title`}
                  aria-describedby={`objective-${path}-details`}
                  data-testid={`objective-${path}`}
                />
                <span id={`objective-${path}-title`}>{t(`home.${path}.title`)}</span>
              </span>
              <span className="choice-details" id={`objective-${path}-details`}>
                <span className="muted">{t(`home.${path}.text`)}</span>
                <span className="muted small">{t(`home.${path}.example`)}</span>
              </span>
              {missing.length > 0 && (
                <span className="badge" data-available={false}>
                  {t("home.availability.limited", {
                    missing: t(`home.availability.missing.${path}`),
                  })}
                </span>
              )}
            </label>
          );
        })}
      </div>
      <button
        type="button"
        className="button choice-start"
        data-testid="objective-start"
        disabled={choice === null}
        onClick={() => choice && onStart(choice)}
      >
        {t("home.startAction")}
      </button>
    </fieldset>
  );
}
