import { useTranslation } from "react-i18next";
import type { OptimalBlocks } from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { parseNumberCell } from "../data/editing";

export interface OptimalBlockDraft {
  enabled: boolean;
  sourceFactorId: string;
  columnName: string;
  oldLabel: string;
  newBlocks: Array<{ id: string; label: string; runs: string }>;
}

export function buildOptimalBlocks(
  state: ProjectState,
  doneRows: Array<{ index: number }>,
  draft: OptimalBlockDraft,
): OptimalBlocks | null {
  if (!doneRows.length || !draft.columnName.trim()) return null;
  const index = state.factors.findIndex(
    (factor) => factor.id === draft.sourceFactorId && factor.kind === "categorical",
  );
  if (draft.sourceFactorId && index < 0) return null;
  const fixedLabels = doneRows.map(({ index: row }) =>
    index < 0 ? draft.oldLabel.trim() : (state.rows[row]?.factors[index] ?? "").trim(),
  );
  if (fixedLabels.some((label) => !label)) return null;
  const labels = [...new Set(fixedLabels)];
  const counts = new Map<string, number>();
  for (const block of draft.newBlocks) {
    const label = block.label.trim(),
      parsed = parseNumberCell(block.runs);
    if (
      !label ||
      counts.has(label) ||
      !parsed.ok ||
      parsed.value === null ||
      !Number.isInteger(parsed.value) ||
      parsed.value < 1 ||
      parsed.value > 60
    )
      return null;
    counts.set(label, parsed.value);
    if (!labels.includes(label)) labels.push(label);
  }
  if (
    labels.length < 2 ||
    labels.length > 8 ||
    doneRows.length + [...counts.values()].reduce((a, b) => a + b, 0) > 60
  )
    return null;
  return {
    labels,
    fixedBlocks: fixedLabels.map((label) => labels.indexOf(label)),
    newRuns: labels.map((label) => counts.get(label) ?? 0),
  };
}

export function OptimalBlockOptions({
  state,
  draft,
  onChange,
}: {
  state: ProjectState;
  draft: OptimalBlockDraft;
  onChange: (value: OptimalBlockDraft) => void;
}) {
  const { t } = useTranslation();
  const invalidCount = (text: string) => {
    const parsed = parseNumberCell(text);
    return (
      !parsed.ok ||
      parsed.value === null ||
      !Number.isInteger(parsed.value) ||
      parsed.value < 1 ||
      parsed.value > 60
    );
  };
  return (
    <fieldset className="editor-card" data-testid="optimal-block-options">
      <legend>{t("blocking.augmentation")}</legend>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(event) => onChange({ ...draft, enabled: event.target.checked })}
        />
        <span>{t("blocking.enable")}</span>
      </label>
      {draft.enabled && (
        <>
          <p className="muted">{t("blocking.designHelp")}</p>
          <div className="form-grid">
            <label className="field">
              <span>{t("blocking.source")}</span>
              <select
                value={draft.sourceFactorId}
                onChange={(event) => onChange({ ...draft, sourceFactorId: event.target.value })}
              >
                <option value="">{t("blocking.singlePrevious")}</option>
                {state.factors
                  .filter((factor) => factor.kind === "categorical")
                  .map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.name || factor.id}
                    </option>
                  ))}
              </select>
            </label>
            {!draft.sourceFactorId && (
              <>
                <label className="field">
                  <span>{t("blocking.columnName")}</span>
                  <input
                    type="text"
                    value={draft.columnName}
                    onChange={(event) => onChange({ ...draft, columnName: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t("blocking.previousLabel")}</span>
                  <input
                    type="text"
                    value={draft.oldLabel}
                    onChange={(event) => onChange({ ...draft, oldLabel: event.target.value })}
                  />
                </label>
              </>
            )}
          </div>
          <p className="muted small">{t("blocking.fixedHelp")}</p>
          {draft.newBlocks.map((block, index) => (
            <fieldset className="editor-card" key={block.id}>
              <legend>{t("blocking.allocation", { n: index + 1 })}</legend>
              <div className="form-grid">
                <label className="field">
                  <span>{t("blocking.blockLabel")}</span>
                  <input
                    type="text"
                    aria-label={`${t("blocking.blockLabel")} ${index + 1}`}
                    aria-invalid={!block.label.trim() || undefined}
                    value={block.label}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        newBlocks: draft.newBlocks.map((value, i) =>
                          i === index ? { ...value, label: event.target.value } : value,
                        ),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("blocking.newRuns")}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`${t("blocking.newRuns")} ${index + 1}`}
                    aria-invalid={invalidCount(block.runs) || undefined}
                    value={block.runs}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        newBlocks: draft.newBlocks.map((value, i) =>
                          i === index ? { ...value, runs: event.target.value } : value,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() =>
                  onChange({ ...draft, newBlocks: draft.newBlocks.filter((_, i) => i !== index) })
                }
              >
                {t("blocking.removeAllocation", { n: index + 1 })}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              onChange({
                ...draft,
                newBlocks: [
                  ...draft.newBlocks,
                  {
                    id: crypto.randomUUID(),
                    label: `${t("blocking.nextBlock")} ${draft.newBlocks.length + 1}`,
                    runs: "4",
                  },
                ],
              })
            }
          >
            {t("blocking.addAllocation")}
          </button>
        </>
      )}
    </fieldset>
  );
}
