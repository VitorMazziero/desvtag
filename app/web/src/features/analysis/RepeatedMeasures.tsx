// Medidas repetidas e dados dependentes (v0.3): comparação pareada (t pareado e Wilcoxon) e modelo
// linear misto com intercepto aleatório por unidade experimental (REML, Satterthwaite). Os dois usam
// a coluna «Unidade» da grade de dados. Os resultados são calculados ao pedir e guardados com suas entradas e revisão.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { RepeatedSelection, TermSpec } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { useProblemFocus } from "../menus/useProblemFocus";
import { buildDataset } from "./buildRequest";
import { repeatedSignature } from "./familySignatures";
import { MixedOptions } from "./MixedOptions";
import { mixedAdvancedRequest } from "./mixedRequest";
import { formPairs, levelsOf } from "./pairing";
import { unitIdentities } from "./unitIdentities";
import { useFamilyRecorder } from "./useFamilyRecorder";

export function RepeatedMeasures({
  language,
  embedded = false,
  onShowUnits,
}: {
  language: Language;
  embedded?: boolean;
  onShowUnits?: () => void;
}) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();
  const { dataset: gridDataset } = buildDataset(state);
  // Unidade experimental (UX25): a coluna «Unidade» da grade (padrão) ou um fator categórico usado
  // como identificador da unidade, sem copiar valores para a coluna.
  const savedSelection = state.mixedModelResult?.selection;
  const unitSource = savedSelection?.unitSource ?? "";
  const unitFactor = state.factors.findIndex((f) => f.id === unitSource);
  const units = useMemo(
    () =>
      unitIdentities(
        state.rows.map((r) => (unitFactor < 0 ? r.unitId : (r.factors[unitFactor] ?? ""))),
      ),
    [state.rows, unitFactor],
  );
  const dataset = useMemo(
    () => ({
      ...gridDataset,
      observations: gridDataset.observations.map((o, i) => ({
        ...o,
        unitId:
          units.ids.get(
            (unitFactor < 0
              ? (state.rows[i]?.unitId ?? "")
              : (state.rows[i]?.factors[unitFactor] ?? "")
            ).trim(),
          ) ?? null,
      })),
    }),
    [gridDataset, state.rows, unitFactor, units],
  );
  const responses = state.responses.filter((r) => r.name.trim() !== "");
  const responseId =
    savedSelection?.responseId ?? state.analysis.responseId ?? responses[0]?.id ?? "";
  const twoLevel = state.factors.flatMap((f, i) =>
    f.kind === "categorical" && f.name.trim() !== "" && levelsOf(dataset, i).length === 2
      ? [{ id: f.id, name: f.name, index: i }]
      : [],
  );
  const selection: RepeatedSelection = savedSelection ?? {
    method: twoLevel.length ? ("paired" as const) : ("mixed" as const),
    responseId: responseId || null,
    unitSource: unitSource || null,
    pairFactor: twoLevel[0]?.id ?? null,
    fixed: null,
  };
  const { method, fixed } = selection;
  const pairFactor = selection.pairFactor ?? "";
  const update = (patch: Partial<typeof selection>) =>
    dispatch({
      type: "setFamilySelection",
      family: "repeated",
      selection: { ...selection, ...patch },
    });
  const setUnitSource = (unitSource: string) =>
    update({
      unitSource: unitSource || null,
      fixed: chosenFixed.filter((id) => id !== unitSource),
      ...(selection.advanced
        ? {
            advanced: {
              ...selection.advanced,
              interactions: selection.advanced.interactions.filter(
                (ids) => !ids.includes(unitSource),
              ),
              marginalFactors: selection.advanced.marginalFactors.filter((id) => id !== unitSource),
              references: selection.advanced.references.filter(
                (reference) => reference.factorId !== unitSource,
              ),
              timeSource:
                selection.advanced.timeSource === unitSource ? null : selection.advanced.timeSource,
            },
          }
        : {}),
    });
  const setResponseId = (responseId: string) => update({ responseId });
  const setMethod = (method: string) =>
    update({ method: method === "paired" ? "paired" : "mixed" });
  const setPairFactor = (pairFactor: string) => update({ pairFactor });
  const setFixed = (fixed: string[]) =>
    update({
      fixed,
      ...(selection.advanced
        ? {
            advanced: {
              ...selection.advanced,
              marginalFactors: selection.advanced.marginalFactors.filter((id) =>
                fixed.includes(id),
              ),
              references: selection.advanced.references.filter((r) => fixed.includes(r.factorId)),
              interactions: selection.advanced.interactions.filter((ids) =>
                ids.every((id) => fixed.includes(id)),
              ),
            },
          }
        : {}),
    });
  const named = state.factors.filter((f) => f.name.trim() !== "");
  const chosenFixed = fixed ?? named.filter((f) => f.id !== unitSource).map((f) => f.id);
  const signature = repeatedSignature(state, selection);
  const capture = useFamilyRecorder();
  const record = state.mixedModelResult?.records.at(-1);
  const stale = Boolean(record && record.signature !== signature);
  const [problems, setProblems] = useState<string[]>([]);
  const problemFocus = useProblemFocus(problems);
  const [busy, setBusy] = useState(false);
  // O conteúdo só existe enquanto o painel está aberto (evita rótulos duplicados na etapa).
  const [open, setOpen] = useState(embedded);

  const responseIndex = state.responses.findIndex((r) => r.id === responseId);
  const unitsFilled =
    unitFactor >= 0
      ? dataset.observations.some((o) => o.unitId !== null)
      : state.rows.some((r) => r.unitId.trim() !== "");
  const unitCandidates = state.factors.filter(
    (f) => f.kind === "categorical" && f.name.trim() !== "",
  );
  const pairPreview = (() => {
    const factor = twoLevel.find((f) => f.id === pairFactor);
    if (!factor || responseIndex < 0 || !unitsFilled) return null;
    return formPairs(dataset, factor.index, responseIndex);
  })();

  const runPaired = async () => {
    const factor = twoLevel.find((f) => f.id === pairFactor);
    if (!factor || responseIndex < 0) return;
    if (unitSource === factor.id) {
      setProblems([t("repeated.unit.sameAsPair")]);
      return;
    }
    const pairs = formPairs(dataset, factor.index, responseIndex);
    if (!pairs || pairs.units.length < 2) {
      setProblems([t("repeated.paired.noPairs")]);
      return;
    }
    const notes: string[] = [];
    if (pairs.incomplete.length > 0)
      notes.push(
        t("repeated.paired.incomplete", {
          units: pairs.incomplete
            .slice(0, 5)
            .map((id) => units.labels[id] ?? id)
            .join(", "),
        }),
      );
    if (pairs.duplicated.length > 0)
      notes.push(
        t("repeated.paired.duplicated", {
          units: pairs.duplicated
            .slice(0, 5)
            .map((id) => units.labels[id] ?? id)
            .join(", "),
        }),
      );
    if (pairs.withoutUnit > 0)
      notes.push(t("repeated.paired.withoutUnit", { count: pairs.withoutUnit }));
    const request = { first: pairs.first, second: pairs.second, alpha: state.analysis.alpha };
    const save = capture(signature);
    setBusy(true);
    setProblems(notes);
    try {
      const r = await client.request(
        { type: "comparisonPaired", ...request },
        { channel: "paired" },
      );
      if (r.outcome.status === "ok" && r.outcome.result.type === "comparisonPaired") {
        const { type: _type, ...result } = r.outcome.result;
        save({
          family: "repeated",
          selection,
          input: {
            type: "paired",
            responseId,
            factorId: factor.id,
            unitLabels: units.labels,
            unitSource: selection.unitSource,
            pairing: {
              units: pairs.units,
              incomplete: pairs.incomplete,
              duplicated: pairs.duplicated,
              withoutUnit: pairs.withoutUnit,
            },
            request,
          },
          result: { type: "paired", ...result },
        });
      } else if (r.outcome.status === "error") {
        setProblems([...notes, ...engineErrorMessages(t, r.outcome.error)]);
      }
    } catch {
      // resposta obsoleta ou falha de transporte
    } finally {
      setBusy(false);
    }
  };

  const runMixed = async () => {
    if (responseIndex < 0) return;
    // O fator que identifica a unidade não é efeito fixo: ele define o efeito aleatório.
    const terms: TermSpec[] = chosenFixed
      .filter((id) => id !== unitSource)
      .map((id) => ({ type: "main", factorId: id }));
    const advanced = selection.advanced ? mixedAdvancedRequest(state, selection.advanced, t) : null;
    if (advanced?.problems.length) {
      setProblems(advanced.problems);
      return;
    }
    if (selection.advanced)
      terms.push(
        ...selection.advanced.interactions.map((factorIds) => ({
          type: "interaction" as const,
          factorIds,
        })),
      );
    const request = {
      dataset,
      ...(advanced?.request ? { advanced: advanced.request } : {}),
      spec: {
        responseId,
        intercept: true,
        terms,
        coding: selection.advanced?.coding ?? ("treatment" as const),
        confidenceLevel: 1 - state.analysis.alpha,
      },
    };
    const save = capture(signature);
    setBusy(true);
    setProblems([]);
    try {
      const r = await client.request({ type: "modelMixed", ...request }, { channel: "mixed" });
      if (r.outcome.status === "ok" && r.outcome.result.type === "modelMixed") {
        const { type: _type, ...result } = r.outcome.result;
        save({
          family: "repeated",
          selection,
          input: {
            type: "mixed",
            unitSource: selection.unitSource,
            unitLabels: units.labels,
            request,
          },
          result: { type: "mixed", ...result },
        });
      } else if (r.outcome.status === "error") {
        setProblems(engineErrorMessages(t, r.outcome.error));
      }
    } catch {
      // resposta obsoleta ou falha de transporte
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      className="advanced"
      data-testid="repeated-measures"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("repeated.title")}</summary>
      {open && (
        <>
          <p className="muted">{t("repeated.intro")}</p>
          <label className="field" data-testid="repeated-unit-source">
            <span>{t("repeated.unit.label")}</span>
            <select value={unitSource} onChange={(e) => setUnitSource(e.target.value)}>
              <option value="">{t("repeated.unit.grid")}</option>
              {unitCandidates.map((f) => (
                <option key={f.id} value={f.id}>
                  {t("repeated.unit.factor", { name: f.name })}
                </option>
              ))}
            </select>
            <small className="muted">{t("repeated.unit.help")}</small>
          </label>
          {pairPreview && (
            <p className="muted small" role="status" data-testid="repeated-unit-summary">
              {t("repeated.unit.summary", {
                complete: pairPreview.units.length,
                incomplete: pairPreview.incomplete.length,
                duplicated: pairPreview.duplicated.length,
              })}
            </p>
          )}
          {!unitsFilled && unitSource === "" && (
            <div role="status" className="muted" data-testid="repeated-need-units">
              <p>{t("repeated.needUnits")}</p>
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  dispatch({ type: "setUnitColumn", visible: true });
                  onShowUnits?.();
                }}
              >
                {t("repeated.showUnitColumn")}
              </button>
            </div>
          )}
          <div className="row">
            <label className="field">
              <span>{t("repeated.response")}</span>
              <select value={responseId} onChange={(e) => setResponseId(e.target.value)}>
                {responses.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>{t("analysis.method.legend")}</span>
            <select
              data-testid="repeated-method"
              aria-label={t("repeated.method")}
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setProblems([]);
              }}
            >
              <option value="paired">{t("repeated.paired.title")}</option>
              <option value="mixed">{t("repeated.mixed.title")}</option>
            </select>
          </label>
          {method === "paired" && (
            <>
              <h3>{t("repeated.paired.title")}</h3>
              {twoLevel.length === 0 ? (
                <p className="muted">{t("repeated.paired.needTwoLevels")}</p>
              ) : (
                <div className="row">
                  <label className="field">
                    <span>{t("repeated.paired.factor")}</span>
                    <select value={pairFactor} onChange={(e) => setPairFactor(e.target.value)}>
                      {twoLevel.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="button" disabled={busy} onClick={runPaired}>
                    {t("repeated.paired.run")}
                  </button>
                </div>
              )}
            </>
          )}
          {method === "mixed" && (
            <>
              <h3>{t("repeated.mixed.title")}</h3>
              <fieldset className="editor-card">
                <legend>{t("repeated.mixed.fixed")}</legend>
                {named
                  .filter((f) => f.id !== unitSource)
                  .map((f) => (
                    <label className="check" key={f.id}>
                      <input
                        type="checkbox"
                        checked={chosenFixed.includes(f.id)}
                        onChange={(e) =>
                          setFixed(
                            e.target.checked
                              ? [...chosenFixed, f.id]
                              : chosenFixed.filter((id) => id !== f.id),
                          )
                        }
                      />
                      <span>{f.name}</span>
                    </label>
                  ))}
              </fieldset>
              <MixedOptions
                selection={selection}
                factors={named}
                fixed={chosenFixed}
                update={update}
              />
              <button type="button" className="button" disabled={busy} onClick={runMixed}>
                {t("repeated.mixed.run")}
              </button>
            </>
          )}

          {stale && (
            <p role="status" className="stale-notice">
              {t("stale", { ns: "results" })}
            </p>
          )}
          {record && <p className="muted small">{t("family.savedInResults")}</p>}
          {problems.length > 0 && (
            <div ref={problemFocus} role="alert" tabIndex={-1} className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
        </>
      )}
    </details>
  );
}
