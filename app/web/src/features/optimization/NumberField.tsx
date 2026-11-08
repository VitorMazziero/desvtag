import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseNumberCell } from "../data/editing";

interface Props {
  label: string;
  visibleLabel?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Aceita campo vazio como "sem valor" (limites opcionais). */
  optional?: boolean;
  help?: string;
}

const parse = (text: string): number => {
  const p = parseNumberCell(text);
  return p.ok && p.value !== null ? p.value : Number.NaN;
};

/** Campo numérico em texto: aceita vírgula ou ponto; só confirma valores válidos. */
export function NumberField({
  label,
  visibleLabel,
  value,
  onChange,
  optional = false,
  help,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const show = (v: number | null) => (v === null ? "" : String(v));
  const [text, setText] = useState(show(value));
  const invalid = text.trim() === "" ? !optional : !Number.isFinite(parse(text));
  // biome-ignore lint/correctness/useExhaustiveDependencies: o texto é o estado local; só o valor externo dispara
  useEffect(() => {
    // Sincroniza apenas quando o valor externo difere do que o texto representa.
    const current = text.trim() === "" ? null : parse(text);
    if (current !== value && !(Number.isNaN(current) && value === null)) setText(show(value));
  }, [value]);
  return (
    <label className="field">
      <span>{visibleLabel ?? label}</span>
      <input
        aria-label={label}
        aria-describedby={invalid ? `${id}-error` : help ? `${id}-help` : undefined}
        type="text"
        inputMode="decimal"
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (next.trim() === "") {
            if (optional) onChange(null);
            return;
          }
          const n = parse(next);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {invalid && (
        <small className="error" id={`${id}-error`}>
          {t("optimization.decision.invalidNumber")}
        </small>
      )}
      {help && (
        <small className="muted" id={`${id}-help`}>
          {help}
        </small>
      )}
    </label>
  );
}
