import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import type { FactorialEstimability, FactorialSetup } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { FactorialGeometryDetails } from "../results/FactorialGeometryDetails";
import { buildDataset, splitLevels } from "./buildRequest";

/** Explicit diagnosis of imported/custom fractions, available before collecting a response. */
export function FactorialGeometryPanel({ language }: { language: Language }) {
  const { t } = useTranslation("results");
  const common = useTranslation().t;
  const state = useProject(),
    workspace = useWorkspace(),
    dispatch = useProjectDispatch();
  const { client } = useEngine();
  const candidates = state.factors.filter(
    (f) => f.name.trim() && (f.kind === "categorical" || splitLevels(f.levelsText).length >= 2),
  );
  const [factorIds, setFactorIds] = useState(
    state.analysis.factorial?.factorIds ?? candidates.map((f) => f.id),
  );
  const [blockId, setBlockId] = useState<string | null>(state.analysis.factorial?.blockId ?? null);
  const [interactionOrder, setOrder] = useState(state.analysis.factorial?.interactionOrder ?? 1);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [shown, setShown] = useState<{ key: string; geometry: FactorialEstimability } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [used, setUsed] = useState(false);
  const { dataset, cellErrors } = buildDataset(state);
  const setup: FactorialSetup = {
    factorIds,
    blockId,
    interactionOrder,
    ssType: state.analysis.factorial?.ssType ?? "typeIII",
    marginals: factorIds.map((id) => ({ factors: [id], adjustment: "tukey" })),
    contrasts: [],
  };
  const key = JSON.stringify([
    workspace.projectId,
    workspace.epoch,
    state.id,
    dataset,
    setup,
    responseId,
  ]);
  const current = useRef(key);
  current.current = key;
  const stale = shown !== null && shown.key !== key;
  const diagnose = async () => {
    if (busy || cellErrors.length || factorIds.length === 0) return;
    const source = key;
    setBusy(true);
    setProblems([]);
    setUsed(false);
    try {
      const result = await client.request(
        { type: "anovaFactorialGeometry", dataset, setup, responseId },
        { channel: "factorial-geometry" },
      );
      if (source !== current.current) return;
      if (
        result.outcome.status === "ok" &&
        result.outcome.result.type === "anovaFactorialGeometry"
      ) {
        const { type: _type, ...geometry } = result.outcome.result;
        setShown({ key: source, geometry });
      } else if (result.outcome.status === "error")
        setProblems(engineErrorMessages(common, result.outcome.error));
    } catch {
      if (source === current.current) setProblems([t("factorial.geometry.failed")]);
    } finally {
      setBusy(false);
    }
  };
  if (candidates.length === 0) return null;
  return (
    <details className="advanced factorial-geometry-setup" data-testid="factorial-geometry-setup">
      <summary>{t("factorial.geometry.check")}</summary>
      <p className="muted small">{t("factorial.geometry.beforeCollection")}</p>
      <fieldset>
        <legend>{common("analysis.method.treatments")}</legend>
        {candidates.map((f) => (
          <label className="check" key={f.id}>
            <input
              type="checkbox"
              checked={factorIds.includes(f.id)}
              disabled={blockId === f.id}
              onChange={(e) =>
                setFactorIds(
                  e.target.checked ? [...factorIds, f.id] : factorIds.filter((id) => id !== f.id),
                )
              }
            />
            <span>{f.name}</span>
          </label>
        ))}
      </fieldset>
      <div className="row">
        <label className="field">
          <span>{common("analysis.method.block")}</span>
          <select
            value={blockId ?? ""}
            onChange={(e) => {
              setBlockId(e.target.value || null);
              setFactorIds(factorIds.filter((id) => id !== e.target.value));
            }}
          >
            <option value="">{common("analysis.method.noBlock")}</option>
            {candidates.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{common("analysis.method.order")}</span>
          <select value={interactionOrder} onChange={(e) => setOrder(Number(e.target.value))}>
            {[1, 2, 3, 4].map((order) => (
              <option key={order} value={order}>
                {order}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("factorial.geometry.scope")}</span>
          <select value={responseId ?? ""} onChange={(e) => setResponseId(e.target.value || null)}>
            <option value="">{t("factorial.geometry.conditionsOption")}</option>
            {state.responses.map((r) => (
              <option key={r.id} value={r.id}>
                {t("factorial.geometry.responseOption", { response: r.name })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        className="button secondary"
        disabled={busy || cellErrors.length > 0 || factorIds.length === 0}
        onClick={diagnose}
      >
        {t(busy ? "factorial.geometry.busy" : "factorial.geometry.calculate")}
      </button>
      {cellErrors.length > 0 && <p role="status">{t("factorial.geometry.fixCells")}</p>}
      {problems.length > 0 && (
        <ul className="error" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {stale && (
        <p role="status" className="validation-warning">
          {t("factorial.geometry.stale")}
        </p>
      )}
      {shown && (
        <FactorialGeometryDetails key={shown.key} geometry={shown.geometry} language={language} />
      )}
      {shown && !stale && (
        <div className="row">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              dispatch({ type: "setAnalysis", patch: { factorial: setup } });
              setUsed(true);
            }}
          >
            {t("factorial.geometry.useModel")}
          </button>
          {used && <span role="status">{t("factorial.geometry.modelUsed")}</span>}
        </div>
      )}
    </details>
  );
}
