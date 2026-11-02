// Personalização de UMA figura: textos, letras manuais, anotações livres e aparência. A configuração
// é gravada no projeto (experimento atual) e vale para a tela e para o SVG/PNG exportados; não
// altera nenhum resultado.
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  computedLetters,
  defaultFigureText,
  type FigureField,
  figureFields,
  letterSlots,
  MAX_FIGURE_TEXT,
} from "../../services/charts";
import type { FigureAnnotation, FigureStyle } from "../../services/engine";

interface Props {
  /** SVG padrão da figura (sem personalização), de onde saem os campos e os textos sugeridos. */
  svg: string;
  style: FigureStyle | undefined;
  onChange: (style: FigureStyle | null) => void;
}

type TextField = "title" | "xLabel" | "yLabel";
const TEXT_FIELDS: TextField[] = ["title", "xLabel", "yLabel"];
const MAX_ANNOTATIONS = 20;
const MAX_LETTER_CHARS = 8;

/** "a ab - c" → ["a", "ab", "", "c"]: o hífen deixa um grupo sem letra. */
function parseLetters(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .filter((w) => w !== "")
    .map((w) => (w === "-" ? "" : w.slice(0, MAX_LETTER_CHARS)));
}

export function FigureCustomizer({ svg, style, onChange }: Props) {
  const { t } = useTranslation("results");
  const id = useId();
  const [lettersText, setLettersText] = useState((style?.manualLetters ?? []).join(" "));
  const fields = new Set<FigureField>(figureFields(svg));
  if (fields.size === 0) return null;
  const current: FigureStyle = style ?? {};
  const annotations = current.annotations ?? [];
  const slots = letterSlots(svg);

  const commit = (patch: Partial<FigureStyle>) => {
    const next: FigureStyle = { ...current, ...patch };
    for (const key of Object.keys(next) as Array<keyof FigureStyle>) {
      if (next[key] === undefined) delete next[key];
    }
    onChange(Object.keys(next).length === 0 ? null : next);
  };
  const setAnnotation = (index: number, patch: Partial<FigureAnnotation>) =>
    commit({
      annotations: annotations.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    });
  const suggested = computedLetters(svg)
    .map((l) => (l === "" ? "-" : l))
    .join(" ");

  return (
    <details className="advanced figure-customizer" data-testid="figure-customizer">
      <summary>{t("figure.customize")}</summary>
      <p className="muted small">{t("figure.help")}</p>

      <fieldset className="editor-card">
        <legend>{t("figure.texts")}</legend>
        {TEXT_FIELDS.filter((f) => fields.has(f)).map((field) => (
          <label className="field" key={field}>
            <span>{t(`figure.${field}`)}</span>
            <input
              type="text"
              maxLength={MAX_FIGURE_TEXT}
              value={current[field] ?? ""}
              placeholder={defaultFigureText(svg, field)}
              onChange={(e) =>
                commit({ [field]: e.target.value === "" ? undefined : e.target.value })
              }
            />
          </label>
        ))}
      </fieldset>

      {fields.has("letters") && (
        <fieldset className="editor-card">
          <legend>{t("figure.lettersGroup")}</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={current.showLetters !== false}
              onChange={(e) => commit({ showLetters: e.target.checked ? undefined : false })}
            />
            <span>{t("figure.showLetters")}</span>
          </label>
          <label className="field">
            <span>{t("figure.manualLetters")}</span>
            <input
              type="text"
              data-testid="manual-letters"
              value={lettersText}
              placeholder={t("figure.manualLettersPlaceholder", { letters: suggested })}
              onChange={(e) => {
                setLettersText(e.target.value);
                const parsed = parseLetters(e.target.value).slice(0, slots);
                commit({ manualLetters: parsed.length === 0 ? undefined : parsed });
              }}
            />
            <small className="muted">{t("figure.manualLettersHelp")}</small>
          </label>
        </fieldset>
      )}

      <fieldset className="editor-card">
        <legend>{t("figure.annotationsGroup")}</legend>
        <p className="muted small">{t("figure.annotationHelp")}</p>
        {annotations.map((a, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: anotações não têm identificador; a ordem é a identidade
          <div className="row" key={i} data-testid={`annotation-${i}`}>
            <label className="field">
              <span className="sr-only">{t("figure.annotationText", { n: i + 1 })}</span>
              <input
                type="text"
                aria-label={t("figure.annotationText", { n: i + 1 })}
                maxLength={MAX_FIGURE_TEXT}
                value={a.text}
                onChange={(e) => setAnnotation(i, { text: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="sr-only">{t("figure.annotationX", { n: i + 1 })}</span>
              <input
                type="range"
                min={0}
                max={100}
                aria-label={t("figure.annotationX", { n: i + 1 })}
                value={Math.round(a.x * 100)}
                onChange={(e) => setAnnotation(i, { x: Number(e.target.value) / 100 })}
              />
            </label>
            <label className="field">
              <span className="sr-only">{t("figure.annotationY", { n: i + 1 })}</span>
              <input
                type="range"
                min={0}
                max={100}
                aria-label={t("figure.annotationY", { n: i + 1 })}
                value={Math.round(a.y * 100)}
                onChange={(e) => setAnnotation(i, { y: Number(e.target.value) / 100 })}
              />
            </label>
            <button
              type="button"
              className="button secondary small"
              aria-label={t("figure.annotationRemove", { n: i + 1 })}
              onClick={() =>
                commit({
                  annotations: annotations.filter((_x, k) => k !== i).length
                    ? annotations.filter((_x, k) => k !== i)
                    : undefined,
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary small"
          disabled={annotations.length >= MAX_ANNOTATIONS}
          onClick={() => commit({ annotations: [...annotations, { text: "", x: 0.5, y: 0.5 }] })}
        >
          {t("figure.annotationAdd")}
        </button>
      </fieldset>

      <fieldset className="editor-card">
        <legend>{t("figure.appearance")}</legend>
        <label className="field">
          <span id={`${id}-font`}>{t("figure.fontScale")}</span>
          <select
            aria-labelledby={`${id}-font`}
            value={current.fontScale === undefined ? "" : String(current.fontScale)}
            onChange={(e) =>
              commit({ fontScale: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          >
            <option value="">{t("figure.fontDevice")}</option>
            <option value="0.85">{t("figure.fontSmall")}</option>
            <option value="1">{t("figure.fontNormal")}</option>
            <option value="1.2">{t("figure.fontLarge")}</option>
          </select>
        </label>
        <label className="field">
          <span id={`${id}-family`}>{t("figure.fontFamily")}</span>
          <select
            aria-labelledby={`${id}-family`}
            value={current.fontFamily ?? ""}
            onChange={(e) =>
              commit({ fontFamily: e.target.value === "" ? undefined : e.target.value })
            }
          >
            <option value="">{t("figure.familyDefault")}</option>
            <option value="sans">{t("figure.familySans")}</option>
            <option value="serif">{t("figure.familySerif")}</option>
            <option value="mono">{t("figure.familyMono")}</option>
          </select>
        </label>
        <div className="row">
          <label className="field">
            <span>{t("figure.color")}</span>
            <input
              type="color"
              data-testid="figure-color"
              value={current.primaryColor ?? "#005a99"}
              onChange={(e) => commit({ primaryColor: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="button secondary small"
            disabled={current.primaryColor === undefined}
            onClick={() => commit({ primaryColor: undefined })}
          >
            {t("figure.colorDefault")}
          </button>
        </div>
        <label className="field">
          <span id={`${id}-bg`}>{t("figure.background")}</span>
          <select
            aria-labelledby={`${id}-bg`}
            value={current.background ?? "white"}
            onChange={(e) =>
              commit({ background: e.target.value === "white" ? undefined : e.target.value })
            }
          >
            <option value="white">{t("figure.backgroundWhite")}</option>
            <option value="transparent">{t("figure.backgroundTransparent")}</option>
          </select>
        </label>
        <label className="field">
          <span id={`${id}-scale`}>{t("figure.exportScale")}</span>
          <select
            aria-labelledby={`${id}-scale`}
            value={String(current.exportScale ?? 2)}
            onChange={(e) =>
              commit({
                exportScale: Number(e.target.value) === 2 ? undefined : Number(e.target.value),
              })
            }
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {t("figure.scaleValue", { n })}
              </option>
            ))}
          </select>
        </label>
        {fields.has("grid") && (
          <label className="check">
            <input
              type="checkbox"
              checked={current.showGrid !== false}
              onChange={(e) => commit({ showGrid: e.target.checked ? undefined : false })}
            />
            <span>{t("figure.showGrid")}</span>
          </label>
        )}
        {fields.has("legend") && (
          <label className="check">
            <input
              type="checkbox"
              checked={current.showLegend !== false}
              onChange={(e) => commit({ showLegend: e.target.checked ? undefined : false })}
            />
            <span>{t("figure.showLegend")}</span>
          </label>
        )}
      </fieldset>

      <button
        type="button"
        className="button secondary small"
        disabled={style === undefined}
        onClick={() => {
          setLettersText("");
          onChange(null);
        }}
      >
        {t("figure.reset")}
      </button>
    </details>
  );
}
