// U06 — escolha, opções e geração do planejamento de dois níveis (caminho "Planejar experimento",
// fatores quantitativos).
// Contagem, opções recomendadas, matriz e propriedades vêm do motor; aqui só há entrada de dados.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { nowIso } from "../../lib/ids";
import type {
  Candidate,
  DesignKind,
  DesignSpec,
  GeneratedDesign,
  RunCount,
} from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";
import { rowsFromDesign } from "./designRows";
import { RunMatrix } from "./RunMatrix";

function randomSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? 1;
}

const sameKind = (a: DesignKind, b: DesignKind) => JSON.stringify(a) === JSON.stringify(b);

type Goal = "screening" | "surface";
type SurfaceChoice = "rotatable" | "face" | "custom" | "boxBehnken";

const isSurface = (kind: DesignKind | undefined): boolean =>
  kind?.type === "centralComposite" || kind?.type === "boxBehnken";

function surfaceChoiceOf(kind: DesignKind | undefined): SurfaceChoice {
  if (kind?.type === "boxBehnken") return "boxBehnken";
  if (kind?.type === "centralComposite")
    return kind.axial.type === "rotatable"
      ? "rotatable"
      : kind.axial.type === "faceCentered"
        ? "face"
        : "custom";
  return "rotatable";
}

export function TwoLevelPanel({ language }: { language: Language }) {
  const { t } = useTranslation();
  const state = useProject();
  const dispatch = useProjectDispatch();
  const { client } = useEngine();

  const factors = state.factors.filter((f) => f.kind === "numeric" && f.name.trim() !== "");
  const ignored = state.factors.filter((f) => f.kind !== "numeric" || f.name.trim() === "");

  const [levels, setLevels] = useState<Record<string, { low: string; high: string }>>(() =>
    Object.fromEntries(
      (state.design?.factors ?? []).map((f) => [
        f.id,
        { low: String(f.low), high: String(f.high) },
      ]),
    ),
  );
  const initialKind = state.design?.kind;
  const [kind, setKind] = useState<DesignKind>(
    initialKind && !isSurface(initialKind) ? initialKind : { type: "fullFactorial" },
  );
  const [goal, setGoal] = useState<Goal>(isSurface(initialKind) ? "surface" : "screening");
  const [choice, setChoice] = useState<SurfaceChoice>(surfaceChoiceOf(initialKind));
  const [alphaText, setAlphaText] = useState(
    initialKind?.type === "centralComposite" && initialKind.axial.type === "custom"
      ? String(initialKind.axial.alpha)
      : "1.5",
  );
  const [inscribed, setInscribed] = useState(
    initialKind?.type === "centralComposite" ? initialKind.inscribed : false,
  );
  const [cubeGenerators, setCubeGenerators] = useState(
    initialKind?.type === "centralComposite" ? initialKind.generators.join(", ") : "",
  );
  const [budget, setBudget] = useState("");
  const [replicates, setReplicates] = useState(state.design?.replicates ?? 1);
  const [centerPoints, setCenterPoints] = useState(state.design?.centerPoints ?? 0);
  const [randomize, setRandomize] = useState(state.design?.randomize ?? true);
  const [seed, setSeed] = useState(state.design?.seed ?? randomSeed());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [count, setCount] = useState<RunCount | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const parsed = factors.map((f) => ({
    f,
    low: Number(levels[f.id]?.low?.replace(",", ".") ?? ""),
    high: Number(levels[f.id]?.high?.replace(",", ".") ?? ""),
    filled: (levels[f.id]?.low ?? "").trim() !== "" && (levels[f.id]?.high ?? "").trim() !== "",
  }));
  const levelsValid = parsed.every(
    (p) => p.filled && Number.isFinite(p.low) && Number.isFinite(p.high) && p.low < p.high,
  );
  const alpha = Number(alphaText.replace(",", "."));
  const surfaceKind: DesignKind =
    choice === "boxBehnken"
      ? { type: "boxBehnken" }
      : {
          type: "centralComposite",
          axial:
            choice === "rotatable"
              ? { type: "rotatable" }
              : choice === "face"
                ? { type: "faceCentered" }
                : { type: "custom", alpha },
          inscribed,
          generators: cubeGenerators
            .split(/[;,]/)
            .map((g) => g.trim())
            .filter((g) => g !== ""),
        };
  const alphaValid = choice !== "custom" || Number.isFinite(alpha);
  const candidate: DesignSpec | null =
    factors.length >= 2 && levelsValid && (goal === "screening" || alphaValid)
      ? {
          kind: goal === "surface" ? surfaceKind : kind,
          factors: parsed.map((p) => ({
            id: p.f.id,
            name: p.f.name,
            low: p.low,
            high: p.high,
            unit: p.f.unit.trim() === "" ? null : p.f.unit,
          })),
          replicates,
          centerPoints,
          randomize,
          seed,
        }
      : null;
  // Identidade estável: os efeitos só reexecutam quando o conteúdo da especificação muda.
  const specKey = JSON.stringify(candidate);
  const spec: DesignSpec | null = useMemo(
    () => (specKey === "null" ? null : (JSON.parse(specKey) as DesignSpec)),
    [specKey],
  );

  // Opções recomendadas pelo motor para o número de fatores e o orçamento.
  const k = factors.length;
  useEffect(() => {
    if (k < 2) {
      setCandidates([]);
      return;
    }
    let live = true;
    const maxRuns = budget.trim() === "" ? null : Math.max(0, Math.floor(Number(budget)));
    client
      .request(
        { type: "designRecommend", factors: k, maxRuns: Number.isFinite(maxRuns) ? maxRuns : null },
        { channel: "design-recommend" },
      )
      .then((r) => {
        if (live && r.outcome.status === "ok" && r.outcome.result.type === "designRecommend")
          setCandidates((r.outcome.result as unknown as { candidates: Candidate[] }).candidates);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, k, budget]);

  // A recomendação define o tipo inicial (enquanto não há planejamento gerado).
  const recommended = candidates.find((c) => c.recommended);
  useEffect(() => {
    if (state.design === null && recommended && goal === "screening") setKind(recommended.kind);
  }, [recommended, state.design, goal]);

  // Contagem de ensaios antes de gerar.
  useEffect(() => {
    if (!spec) {
      setCount(null);
      setProblems([]);
      return;
    }
    let live = true;
    client
      .request({ type: "designCount", ...spec }, { channel: "design-count" })
      .then((r) => {
        if (!live) return;
        if (r.outcome.status === "ok" && r.outcome.result.type === "designCount") {
          const { type: _type, ...rest } = r.outcome.result as unknown as RunCount & {
            type: string;
          };
          setCount(rest);
          setProblems([]);
        } else if (r.outcome.status === "error") {
          setCount(null);
          setProblems(engineErrorMessages(t, r.outcome.error));
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, spec, t]);

  const generate = async () => {
    if (!spec) return;
    if (state.design !== null || state.rows.some((r) => r.responses.some((c) => c.trim() !== ""))) {
      if (!window.confirm(t("design.confirmReplace"))) return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await client.request(
        { type: "designGenerate", ...spec },
        { channel: "design-generate" },
      );
      if (response.outcome.status === "ok" && response.outcome.result.type === "designGenerate") {
        const generated = response.outcome.result as unknown as GeneratedDesign;
        const { rows, counters } = rowsFromDesign(generated, state);
        dispatch({ type: "applyDesign", design: spec, rows, counters, now: nowIso() });
        setMessage(t("design.generated", { total: generated.count.total }));
      } else if (response.outcome.status === "error") {
        setProblems(engineErrorMessages(t, response.outcome.error));
      }
    } catch {
      setProblems([t("engine.unavailable", { ns: "diagnostics" })]);
    } finally {
      setBusy(false);
    }
  };

  const kindLabel = (c: Candidate) =>
    c.kind.type === "fullFactorial"
      ? t("design.kind.fullFactorial")
      : c.kind.type === "fractional"
        ? t("design.kind.fractional", { generators: c.kind.generators.join(", ") })
        : t("design.kind.plackettBurman");

  return (
    <section aria-labelledby="design-title" data-testid="design-panel">
      <h2 id="design-title">{t("design.title")}</h2>
      <p className="muted">{t("design.intro")}</p>
      {k < 2 && (
        <p role="status" className="error">
          {t("design.needFactors")}
        </p>
      )}
      {ignored.length > 0 && (
        <p className="muted small">
          {t("design.categoricalIgnored", { names: ignored.map((f) => f.name || f.id).join(", ") })}
        </p>
      )}

      {k >= 2 && (
        <>
          <fieldset className="editor-card">
            <legend>{t("design.levelsTitle")}</legend>
            {factors.map((f) => (
              <div className="row" key={f.id}>
                <strong>{f.name}</strong>
                <label className="field">
                  <span>{`${f.name} — ${t("design.low")}`}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={levels[f.id]?.low ?? ""}
                    onChange={(e) =>
                      setLevels({
                        ...levels,
                        [f.id]: { low: e.target.value, high: levels[f.id]?.high ?? "" },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>{`${f.name} — ${t("design.high")}`}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={levels[f.id]?.high ?? ""}
                    onChange={(e) =>
                      setLevels({
                        ...levels,
                        [f.id]: { low: levels[f.id]?.low ?? "", high: e.target.value },
                      })
                    }
                  />
                </label>
                {f.unit && <span className="muted small">{f.unit}</span>}
              </div>
            ))}
            {!levelsValid && parsed.some((p) => p.filled) && (
              <p role="alert" className="error">
                {t("design.levelsInvalid")}
              </p>
            )}
          </fieldset>

          <fieldset className="editor-card">
            <legend>{t("design.goal")}</legend>
            <label className="check">
              <input
                type="radio"
                name="design-goal"
                checked={goal === "screening"}
                onChange={() => setGoal("screening")}
              />
              <span>{t("design.goalScreening")}</span>
            </label>
            <label className="check">
              <input
                type="radio"
                name="design-goal"
                checked={goal === "surface"}
                onChange={() => {
                  setGoal("surface");
                  if (centerPoints === 0) {
                    setCenterPoints(5);
                    setMessage(t("design.surface.centerSuggested"));
                  }
                }}
              />
              <span>{t("design.goalSurface")}</span>
            </label>
          </fieldset>

          {goal === "screening" && (
            <>
              <label className="field">
                <span>{t("design.budget")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
              <p className="muted small">{t("design.budgetHelp")}</p>
            </>
          )}

          {goal === "surface" && (
            <fieldset className="editor-card" data-testid="surface-options">
              <legend>{t("design.surface.legend", { count: k })}</legend>
              <p className="muted small">{t("design.surface.intro")}</p>
              {(["rotatable", "face", "custom", "boxBehnken"] as const).map((c) => (
                <label className="check" key={c}>
                  <input
                    type="radio"
                    name="surface-kind"
                    checked={choice === c}
                    disabled={c === "boxBehnken" && (k < 3 || k > 5)}
                    onChange={() => setChoice(c)}
                  />
                  <span>{t(`design.surface.${c}`)}</span>
                </label>
              ))}
              {(k < 3 || k > 5) && (
                <p className="muted small">{t("design.surface.boxBehnkenUnavailable")}</p>
              )}
              {choice === "custom" && (
                <label className="field">
                  <span>{t("design.surface.alpha")}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={alphaText}
                    onChange={(e) => setAlphaText(e.target.value)}
                  />
                </label>
              )}
              {choice !== "boxBehnken" && (
                <>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={inscribed}
                      onChange={(e) => setInscribed(e.target.checked)}
                    />
                    <span>{t("design.surface.inscribed")}</span>
                  </label>
                  <p className="muted small">{t("design.surface.inscribedHelp")}</p>
                  <label className="field">
                    <span>{t("design.surface.cubeGenerators")}</span>
                    <input
                      type="text"
                      value={cubeGenerators}
                      onChange={(e) => setCubeGenerators(e.target.value)}
                    />
                    <small className="muted">{t("design.surface.cubeGeneratorsHelp")}</small>
                  </label>
                </>
              )}
            </fieldset>
          )}

          {goal === "screening" && (
            <fieldset className="editor-card">
              <legend>{t("design.optionsTitle", { count: k })}</legend>
              {candidates.map((c) => (
                <label className="check" key={JSON.stringify(c.kind)}>
                  <input
                    type="radio"
                    name="design-kind"
                    checked={sameKind(kind, c.kind)}
                    onChange={() => setKind(c.kind)}
                  />
                  <span>
                    {kindLabel(c)} — {t("design.candidate", { runs: c.baseRuns })},{" "}
                    {c.resolution === null
                      ? t("design.noResolution")
                      : t("design.resolution", { resolution: c.resolution })}
                    {c.recommended && <strong> · {t("design.recommended")}</strong>}
                    {!c.withinBudget && <em> · {t("design.overBudget")}</em>}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="row">
            <label className="field">
              <span>{t("design.replicates")}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={replicates}
                onChange={(e) =>
                  setReplicates(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
              />
            </label>
            <label className="field">
              <span>{t("design.centerPoints")}</span>
              <input
                type="number"
                min={0}
                max={50}
                value={centerPoints}
                onChange={(e) =>
                  setCenterPoints(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                }
              />
            </label>
          </div>
          <p className="muted small">{t("design.replicatesHelp")}</p>
          <p className="muted small">{t("design.centerHelp")}</p>
          <label className="check">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            <span>{t("design.randomize")}</span>
          </label>
          {randomize && (
            <div className="row">
              <label className="field">
                <span>{t("design.seed")}</span>
                <input
                  type="number"
                  min={0}
                  value={seed}
                  onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
              </label>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setSeed(randomSeed())}
              >
                {t("design.newSeed")}
              </button>
            </div>
          )}
          {randomize && <p className="muted small">{t("design.seedHelp")}</p>}

          {count && (
            <p data-testid="run-count" role="status">
              {t("design.count", {
                total: count.total,
                base: count.baseRuns,
                replicates,
                centers: count.centerRuns,
              })}
            </p>
          )}
          {problems.length > 0 && (
            <div role="alert" className="error">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            className="button"
            disabled={!spec || count === null || busy}
            onClick={generate}
          >
            {state.design ? t("design.regenerate") : t("design.generate")}
          </button>
          {message && (
            <p role="status" className="muted" data-testid="design-generated">
              {message}
            </p>
          )}
        </>
      )}

      {state.design && <RunMatrix spec={state.design} language={language} />}
    </section>
  );
}
