import { useEffect, useState } from "react";

interface Props {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Aceita campo vazio como "sem valor" (limites opcionais). */
  optional?: boolean;
  help?: string;
}

const parse = (text: string): number => Number(text.trim().replace(",", "."));

/** Campo numérico em texto: aceita vírgula ou ponto; só confirma valores válidos. */
export function NumberField({ label, value, onChange, optional = false, help }: Props) {
  const show = (v: number | null) => (v === null ? "" : String(v));
  const [text, setText] = useState(show(value));
  const invalid = text.trim() !== "" && !Number.isFinite(parse(text));
  // biome-ignore lint/correctness/useExhaustiveDependencies: o texto é o estado local; só o valor externo dispara
  useEffect(() => {
    // Sincroniza apenas quando o valor externo difere do que o texto representa.
    const current = text.trim() === "" ? null : parse(text);
    if (current !== value && !(Number.isNaN(current) && value === null)) setText(show(value));
  }, [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
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
      {help && <small className="muted">{help}</small>}
    </label>
  );
}
