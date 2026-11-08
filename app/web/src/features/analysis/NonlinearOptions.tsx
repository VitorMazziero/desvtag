import { useTranslation } from "react-i18next";
import type { NonlinearSelection } from "../../services/engine";
import { parseNonlinearOptions, saturationParameters } from "./parseNonlinearOptions";
export function NonlinearOptions({
  selection,
  onChange,
  disabled,
  labels,
}: {
  selection: NonlinearSelection;
  onChange: (patch: Partial<NonlinearSelection>) => void;
  disabled: boolean;
  labels: string[];
}) {
  const { t } = useTranslation();
  const names = saturationParameters[selection.model];
  const { errors } = parseNonlinearOptions(selection);
  const field = (kind: "initial" | "lower" | "upper", index: number, value: string) => {
    const next = Array.from({ length: names.length }, (_, i) =>
      i === index ? value : (selection[kind]?.[i] ?? ""),
    );
    onChange({ [kind]: kind !== "initial" && next.every((x) => !x.trim()) ? undefined : next });
  };
  return (
    <fieldset className="editor-card" data-testid="nonlinear-options" disabled={disabled}>
      <legend>{t("saturationOptions.title")}</legend>
      <label className="check">
        <input
          type="checkbox"
          checked={selection.initial !== undefined}
          onChange={(e) =>
            onChange({ initial: e.target.checked ? names.map(() => "") : undefined })
          }
        />
        <span>{t("saturationOptions.manual")}</span>
      </label>
      <p className="muted small">{t("saturationOptions.boundsHelp")}</p>
      {names.map((name, i) => (
        <fieldset className="editor-card" key={name}>
          <legend>{labels[i] ?? name}</legend>
          <div className="row">
            {[
              ...(selection.initial !== undefined ? ["initial" as const] : []),
              "lower" as const,
              "upper" as const,
            ].map((kind) => (
              <label className="field" key={kind}>
                <span>{t(`saturationOptions.${kind}`)}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid={`nonlinear-${kind}-${i}`}
                  value={selection[kind]?.[i] ?? ""}
                  onChange={(e) => field(kind, i, e.target.value)}
                  aria-invalid={Boolean(errors[`${kind}-${i}`])}
                  aria-describedby={
                    errors[`${kind}-${i}`] ? `nonlinear-error-${kind}-${i}` : undefined
                  }
                />
                {errors[`${kind}-${i}`] && (
                  <span className="error small" id={`nonlinear-error-${kind}-${i}`}>
                    {t(`saturationOptions.errors.${errors[`${kind}-${i}`]}`)}
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="check">
        <input
          type="checkbox"
          data-testid="nonlinear-profile"
          checked={Boolean(selection.profile)}
          onChange={(e) => onChange({ profile: e.target.checked ? true : undefined })}
        />
        <span>{t("saturationOptions.profile")}</span>
      </label>
      <p className="muted small">{t("saturationOptions.profileHelp")}</p>
    </fieldset>
  );
}
