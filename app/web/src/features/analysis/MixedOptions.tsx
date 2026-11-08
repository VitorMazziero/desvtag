import { useTranslation } from "react-i18next";
import type { MixedAdvancedSelection, RepeatedSelection } from "../../services/engine";
import type { FactorDraft } from "../../state/project";

export const defaultMixedOptions: MixedAdvancedSelection = {
  covariance: "compoundSymmetry",
  timeSource: null,
  timeEnabled: false,
  occasionOrder: "",
  timeEffect: "none",
  coding: "sum",
  interactions: [],
  marginalFactors: [],
  marginalTime: false,
  adjustment: "bonferroni",
  references: [],
};

export function MixedOptions({
  selection,
  factors,
  fixed,
  update,
}: {
  selection: RepeatedSelection;
  factors: FactorDraft[];
  fixed: string[];
  update: (patch: Partial<RepeatedSelection>) => void;
}) {
  const { t } = useTranslation();
  const options = selection.advanced;
  const set = (patch: Partial<MixedAdvancedSelection>) =>
    update({ advanced: { ...(options ?? defaultMixedOptions), ...patch } });
  const selected = factors.filter((f) => fixed.includes(f.id) && f.id !== selection.unitSource);
  const categorical = selected.filter((f) => f.kind === "categorical");
  const numeric = selected.filter((f) => f.kind === "numeric");
  return (
    <fieldset className="editor-card" data-testid="mixed-options">
      <legend>{t("mixedAdvanced.options")}</legend>
      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(options)}
          onChange={(e) => update({ advanced: e.target.checked ? defaultMixedOptions : undefined })}
        />
        <span>{t("mixedAdvanced.enable")}</span>
      </label>
      {options && (
        <>
          <p className="muted small">{t("mixedAdvanced.capacity")}</p>
          <div className="row">
            <label className="field">
              <span>{t("mixedAdvanced.covariance")}</span>
              <select
                data-testid="mixed-covariance"
                value={options.covariance}
                onChange={(e) =>
                  set({
                    covariance: e.target.value as MixedAdvancedSelection["covariance"],
                    ...(e.target.value !== "compoundSymmetry" ? { timeEnabled: true } : {}),
                  })
                }
              >
                {(["compoundSymmetry", "ar1", "unstructured"] as const).map((value) => (
                  <option key={value} value={value}>
                    {t(`mixedAdvanced.structures.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("mixedAdvanced.coding")}</span>
              <select
                value={options.coding}
                onChange={(e) =>
                  set({ coding: e.target.value as MixedAdvancedSelection["coding"] })
                }
              >
                <option value="sum">{t("mixedAdvanced.sum")}</option>
                <option value="treatment">{t("mixedAdvanced.treatment")}</option>
              </select>
            </label>
          </div>
          <p className="muted">{t(`mixedAdvanced.structureHelp.${options.covariance}`)}</p>
          <label className="check">
            <input
              type="checkbox"
              checked={options.timeEnabled}
              disabled={options.covariance !== "compoundSymmetry"}
              onChange={(e) =>
                set({
                  timeEnabled: e.target.checked,
                  ...(!e.target.checked
                    ? { timeEffect: "none" as const, marginalTime: false }
                    : {}),
                })
              }
            />
            <span>{t("mixedAdvanced.useTime")}</span>
          </label>
          {options.timeEnabled && (
            <>
              <div className="row">
                <label className="field">
                  <span>{t("mixedAdvanced.timeSource")}</span>
                  <select
                    data-testid="mixed-time-source"
                    value={options.timeSource ?? ""}
                    onChange={(e) => set({ timeSource: e.target.value || null })}
                  >
                    <option value="">{t("mixedAdvanced.timeColumn")}</option>
                    {factors
                      .filter((f) => f.id !== selection.unitSource)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("mixedAdvanced.timeEffect")}</span>
                  <select
                    data-testid="mixed-time-effect"
                    value={options.timeEffect}
                    onChange={(e) =>
                      set({
                        timeEffect: e.target.value as MixedAdvancedSelection["timeEffect"],
                        ...(e.target.value !== "categorical" ? { marginalTime: false } : {}),
                      })
                    }
                  >
                    {(["none", "numeric", "categorical"] as const).map((value) => (
                      <option key={value} value={value}>
                        {t(`mixedAdvanced.timeEffects.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {options.timeSource && fixed.includes(options.timeSource) && (
                <p className="muted small" data-testid="mixed-existing-time-effect">
                  {t("mixedAdvanced.existingTimeEffect", {
                    name:
                      factors.find((f) => f.id === options.timeSource)?.name ?? options.timeSource,
                  })}
                </p>
              )}
              <label className="field">
                <span>{t("mixedAdvanced.occasionOrder")}</span>
                <input
                  type="text"
                  data-testid="mixed-occasion-order"
                  value={options.occasionOrder}
                  onChange={(e) => set({ occasionOrder: e.target.value })}
                />
                <small className="muted">{t("mixedAdvanced.orderHelp")}</small>
              </label>
              <p className="muted small">
                {t(`mixedAdvanced.timeHelpByCovariance.${options.covariance}`)}
              </p>
            </>
          )}
          {selected.length > 1 && (
            <fieldset className="editor-card">
              <legend>{t("mixedAdvanced.interactions")}</legend>
              {selected.flatMap((a, i) =>
                selected.slice(i + 1).map((b) => {
                  const checked = options.interactions.some(
                    (ids) => ids.length === 2 && ids.includes(a.id) && ids.includes(b.id),
                  );
                  return (
                    <label className="check" key={`${a.id}:${b.id}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          set({
                            interactions: e.target.checked
                              ? [...options.interactions, [a.id, b.id]]
                              : options.interactions.filter(
                                  (ids) => !(ids.includes(a.id) && ids.includes(b.id)),
                                ),
                          })
                        }
                      />
                      <span>
                        {a.name} × {b.name}
                      </span>
                    </label>
                  );
                }),
              )}
            </fieldset>
          )}
          <fieldset className="editor-card">
            <legend>{t("mixedAdvanced.marginal")}</legend>
            <p className="muted small">{t("mixedAdvanced.marginalHelp")}</p>
            {categorical.map((f) => (
              <label className="check" key={f.id}>
                <input
                  type="checkbox"
                  checked={options.marginalFactors.includes(f.id)}
                  onChange={(e) =>
                    set({
                      marginalFactors: e.target.checked
                        ? [...options.marginalFactors, f.id]
                        : options.marginalFactors.filter((id) => id !== f.id),
                    })
                  }
                />
                <span>{f.name}</span>
              </label>
            ))}
            {options.timeEnabled && options.timeEffect === "categorical" && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={options.marginalTime}
                  onChange={(e) => set({ marginalTime: e.target.checked })}
                />
                <span>{t("mixedAdvanced.timeMarginal")}</span>
              </label>
            )}
            {numeric.map((f) => (
              <label className="field" key={f.id}>
                <span>{t("mixedAdvanced.reference", { name: f.name })}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={options.references.find((v) => v.factorId === f.id)?.value ?? ""}
                  onChange={(e) =>
                    set({
                      references: [
                        ...options.references.filter((v) => v.factorId !== f.id),
                        { factorId: f.id, value: e.target.value },
                      ],
                    })
                  }
                />
                <small className="muted">{t("mixedAdvanced.referenceHelp")}</small>
              </label>
            ))}
            <label className="field">
              <span>{t("mixedAdvanced.adjustment")}</span>
              <select
                value={options.adjustment}
                onChange={(e) =>
                  set({ adjustment: e.target.value as MixedAdvancedSelection["adjustment"] })
                }
              >
                <option value="bonferroni">Bonferroni</option>
                <option value="holm">Holm</option>
              </select>
            </label>
            <small className="muted">{t("mixedAdvanced.intervalAdjustment")}</small>
          </fieldset>
        </>
      )}
    </fieldset>
  );
}
