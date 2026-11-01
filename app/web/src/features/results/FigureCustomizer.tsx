// Personalização de UMA figura (título, rótulos, letras, fonte). A configuração é gravada no projeto
// (experimento atual) e vale para a tela e para o SVG/PNG exportados; não altera nenhum resultado.
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  defaultFigureText,
  type FigureField,
  figureFields,
  MAX_FIGURE_TEXT,
} from "../../services/charts";
import type { FigureStyle } from "../../services/engine";

interface Props {
  /** SVG padrão da figura (sem personalização), de onde saem os campos e os textos sugeridos. */
  svg: string;
  style: FigureStyle | undefined;
  onChange: (style: FigureStyle | null) => void;
}

type TextField = "title" | "xLabel" | "yLabel";
const TEXT_FIELDS: TextField[] = ["title", "xLabel", "yLabel"];

export function FigureCustomizer({ svg, style, onChange }: Props) {
  const { t } = useTranslation("results");
  const id = useId();
  const fields = new Set<FigureField>(figureFields(svg));
  if (fields.size === 0) return null;
  const current: FigureStyle = style ?? {};

  const commit = (patch: Partial<FigureStyle>) => {
    const next: FigureStyle = { ...current, ...patch };
    for (const key of Object.keys(next) as Array<keyof FigureStyle>) {
      if (next[key] === undefined) delete next[key];
    }
    onChange(Object.keys(next).length === 0 ? null : next);
  };

  return (
    <details className="advanced figure-customizer" data-testid="figure-customizer">
      <summary>{t("figure.customize")}</summary>
      <p className="muted small">{t("figure.help")}</p>
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
      {fields.has("letters") && (
        <label className="check">
          <input
            type="checkbox"
            checked={current.showLetters !== false}
            onChange={(e) => commit({ showLetters: e.target.checked ? undefined : false })}
          />
          <span>{t("figure.showLetters")}</span>
        </label>
      )}
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
      <button
        type="button"
        className="button secondary small"
        disabled={style === undefined}
        onClick={() => onChange(null)}
      >
        {t("figure.reset")}
      </button>
    </details>
  );
}
