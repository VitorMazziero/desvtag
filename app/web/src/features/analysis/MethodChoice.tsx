// Escolha do método da comparação (ET11): um fator com Tukey, Games–Howell, Dunnett, Bonferroni,
// Holm ou Kruskal–Wallis/Dunn; ou ANOVA multifatorial com blocos, médias marginais e contrastes.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Adjustment, FactorialSetup, Procedure } from "../../services/engine";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import type { AnalysisDraft } from "../../state/project";
import { splitLevels } from "./buildRequest";

type ProcedureKey = "tukey" | Procedure["type"];

function levelsOf(
  state: ReturnType<typeof useProject>,
  factorId: string | null | undefined,
): string[] {
  const index = state.factors.findIndex((f) => f.id === factorId);
  const factor = state.factors[index];
  if (!factor) return [];
  const declared = splitLevels(factor.levelsText);
  if (declared.length > 0) return declared;
  return [
    ...new Set(state.rows.map((r) => (r.factors[index] ?? "").trim()).filter((v) => v !== "")),
  ];
}

function defaultSetup(factorIds: string[]): FactorialSetup {
  return {
    factorIds,
    blockId: null,
    interactionOrder: 2,
    ssType: "typeIII",
    marginals: marginalsFor(factorIds),
    contrasts: [],
  };
}

function marginalsFor(factorIds: string[]): FactorialSetup["marginals"] {
  const single = factorIds.map((id) => ({ factors: [id], adjustment: "tukey" as const }));
  return factorIds.length > 1
    ? [...single, { factors: factorIds, adjustment: "holm" as const }]
    : single;
}

export function MethodChoice() {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const setup = state.analysis.factorial;
  const mode = setup === null ? "oneWay" : "factorial";
  const categorical = state.factors.filter((f) => f.kind === "categorical" && f.name.trim() !== "");
  const patch = (p: Partial<AnalysisDraft>) => dispatch({ type: "setAnalysis", patch: p });
  const [contrastName, setContrastName] = useState("");
  const [contrastFactor, setContrastFactor] = useState("");
  const [contrastText, setContrastText] = useState("");
  const [contrastError, setContrastError] = useState<string | null>(null);

  const procedure = state.analysis.procedure;
  const key: ProcedureKey = procedure === null ? "tukey" : procedure.type;
  const chooseProcedure = (next: ProcedureKey) => {
    const levels = levelsOf(state, state.analysis.factorId);
    const value: Procedure | null =
      next === "tukey"
        ? null
        : next === "dunnett"
          ? { type: "dunnett", control: levels[0] ?? "" }
          : next === "kruskalDunn"
            ? { type: "kruskalDunn", adjustment: "holm" }
            : { type: next };
    patch({ procedure: value });
  };

  const update = (next: Partial<FactorialSetup>) => {
    if (setup === null) return;
    const merged = { ...setup, ...next };
    if (next.factorIds) merged.marginals = marginalsFor(next.factorIds);
    patch({ factorial: merged });
  };

  const addContrast = () => {
    if (setup === null) return;
    const factorId = contrastFactor || setup.factorIds[0] || "";
    const levels = levelsOf(state, factorId);
    const coefficients = contrastText
      .split(/[;\n]|\s+/)
      .map((c) => c.trim().replace(",", "."))
      .filter((c) => c !== "")
      .map(Number);
    if (
      contrastName.trim() === "" ||
      coefficients.length !== levels.length ||
      coefficients.some((c) => !Number.isFinite(c))
    ) {
      setContrastError(t("analysis.method.contrastInvalid", { count: levels.length }));
      return;
    }
    setContrastError(null);
    update({
      contrasts: [
        ...setup.contrasts,
        { name: contrastName.trim(), factors: [factorId], coefficients },
      ],
    });
    setContrastName("");
    setContrastText("");
  };

  return (
    <fieldset className="editor-card" data-testid="method-choice">
      <legend>{t("analysis.method.legend")}</legend>
      <label className="check">
        <input
          type="radio"
          name="analysis-mode"
          checked={mode === "oneWay"}
          onChange={() => patch({ factorial: null })}
        />
        <span>{t("analysis.method.oneWay")}</span>
      </label>
      <label className="check">
        <input
          type="radio"
          name="analysis-mode"
          checked={mode === "factorial"}
          disabled={categorical.length === 0}
          onChange={() =>
            patch({
              factorial: defaultSetup(
                [state.analysis.factorId ?? categorical[0]?.id ?? ""].filter((x) => x !== ""),
              ),
              procedure: null,
            })
          }
        />
        <span>{t("analysis.method.factorial")}</span>
      </label>

      {mode === "oneWay" && (
        <>
          <label className="field">
            <span>{t("analysis.method.procedure")}</span>
            <select
              value={key}
              onChange={(e) => chooseProcedure(e.target.value as ProcedureKey)}
              data-testid="procedure-select"
            >
              {(
                ["tukey", "gamesHowell", "dunnett", "bonferroni", "holm", "kruskalDunn"] as const
              ).map((k) => (
                <option key={k} value={k}>
                  {t(`analysis.method.procedures.${k}`)}
                </option>
              ))}
            </select>
            <small className="muted">{t(`analysis.method.help.${key}`)}</small>
          </label>
          {procedure?.type === "dunnett" && (
            <label className="field">
              <span>{t("analysis.method.control")}</span>
              <select
                value={procedure.control}
                onChange={(e) => patch({ procedure: { type: "dunnett", control: e.target.value } })}
              >
                {levelsOf(state, state.analysis.factorId).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          {procedure?.type === "kruskalDunn" && (
            <label className="field">
              <span>{t("analysis.method.adjustment")}</span>
              <select
                value={procedure.adjustment}
                onChange={(e) =>
                  patch({
                    procedure: { type: "kruskalDunn", adjustment: e.target.value as Adjustment },
                  })
                }
              >
                <option value="holm">Holm</option>
                <option value="bonferroni">Bonferroni</option>
              </select>
            </label>
          )}
        </>
      )}

      {setup !== null && (
        <>
          <fieldset>
            <legend>{t("analysis.method.treatments")}</legend>
            {categorical.map((f) => (
              <label className="check" key={f.id}>
                <input
                  type="checkbox"
                  checked={setup.factorIds.includes(f.id)}
                  disabled={setup.blockId === f.id}
                  onChange={(e) =>
                    update({
                      factorIds: e.target.checked
                        ? [...setup.factorIds, f.id]
                        : setup.factorIds.filter((id) => id !== f.id),
                    })
                  }
                />
                <span>{f.name}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>{t("analysis.method.block")}</span>
            <select
              value={setup.blockId ?? ""}
              onChange={(e) =>
                update({
                  blockId: e.target.value || null,
                  factorIds: setup.factorIds.filter((id) => id !== e.target.value),
                })
              }
            >
              <option value="">{t("analysis.method.noBlock")}</option>
              {categorical.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <small className="muted">{t("analysis.method.blockHelp")}</small>
          </label>
          <div className="row">
            <label className="field">
              <span>{t("analysis.method.order")}</span>
              <select
                value={String(setup.interactionOrder)}
                onChange={(e) => update({ interactionOrder: Number(e.target.value) })}
              >
                {[1, 2, 3].map((o) => (
                  <option key={o} value={o}>
                    {t(`analysis.method.orders.${o}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("analysis.method.ssType")}</span>
              <select
                value={setup.ssType}
                onChange={(e) => update({ ssType: e.target.value as FactorialSetup["ssType"] })}
              >
                {(["typeI", "typeII", "typeIII"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`analysis.method.ssTypes.${s}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted small">{t("analysis.method.ssHelp")}</p>

          <fieldset>
            <legend>{t("analysis.method.contrasts")}</legend>
            <p className="muted small">{t("analysis.method.contrastsHelp")}</p>
            <ul className="facts-list">
              {setup.contrasts.map((c, i) => (
                <li key={c.name}>
                  {c.name}: {c.coefficients.join("; ")}{" "}
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => update({ contrasts: setup.contrasts.filter((_, j) => j !== i) })}
                  >
                    {t("analysis.method.removeContrast")}
                  </button>
                </li>
              ))}
            </ul>
            <div className="row">
              <label className="field">
                <span>{t("analysis.method.contrastName")}</span>
                <input
                  type="text"
                  value={contrastName}
                  onChange={(e) => setContrastName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("analysis.method.contrastFactor")}</span>
                <select
                  value={contrastFactor || setup.factorIds[0] || ""}
                  onChange={(e) => setContrastFactor(e.target.value)}
                >
                  {setup.factorIds.map((id) => (
                    <option key={id} value={id}>
                      {state.factors.find((f) => f.id === id)?.name ?? id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("analysis.method.contrastCoefficients")}</span>
                <input
                  type="text"
                  value={contrastText}
                  onChange={(e) => setContrastText(e.target.value)}
                />
              </label>
              <button type="button" className="button secondary small" onClick={addContrast}>
                {t("analysis.method.addContrast")}
              </button>
            </div>
            {contrastError && (
              <p role="alert" className="error">
                {contrastError}
              </p>
            )}
          </fieldset>
        </>
      )}
    </fieldset>
  );
}
