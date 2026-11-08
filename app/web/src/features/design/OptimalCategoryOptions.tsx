import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OptimalCategoricalFactor } from "../../services/engine";
import { splitLevels } from "../analysis/buildRequest";

/** A finite nominal domain, built with labels rather than integer dose surrogates. */
export function optimalCategoryLevels(
  levelsText: string,
  rows: readonly { factors: readonly string[] }[],
  index: number,
) {
  const declared = splitLevels(levelsText);
  return declared.length
    ? declared
    : [...new Set(rows.map((row) => (row.factors[index] ?? "").trim()).filter(Boolean))];
}

export function OptimalCategoryOptions({
  candidates,
  selected,
  onSelect,
  combinations,
  onCombinations,
}: {
  candidates: OptimalCategoricalFactor[];
  selected: OptimalCategoricalFactor[];
  onSelect: (ids: string[]) => void;
  combinations: string[][] | null;
  onCombinations: (value: string[][] | null) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const tuple = selected.map((factor) => draft[factor.id] ?? factor.levels[0] ?? "");
  const duplicate = combinations?.some(
    (values) => JSON.stringify(values) === JSON.stringify(tuple),
  );
  const pages = Math.max(1, Math.ceil((combinations?.length ?? 0) / 20));
  const current = Math.min(page, pages - 1);
  return (
    <fieldset className="optimal-category-options" data-testid="optimal-category-options">
      <legend>{t("design.optimal.categories.title")}</legend>
      <p className="muted small">{t("design.optimal.categories.coding")}</p>
      {candidates.map((factor) => (
        <div className="optimal-category-choice" key={factor.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={selected.some((f) => f.id === factor.id)}
              onChange={(e) =>
                onSelect(
                  e.target.checked
                    ? [...selected.map((f) => f.id), factor.id]
                    : selected.filter((f) => f.id !== factor.id).map((f) => f.id),
                )
              }
            />
            <span>{factor.name}</span>
          </label>
          <p className={factor.levels.length < 2 ? "error small" : "muted small"}>
            {factor.levels.length < 2
              ? t("design.optimal.categories.needLevels")
              : factor.levels.join(" · ")}
          </p>
        </div>
      ))}
      {selected.length > 0 && (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={combinations !== null}
              onChange={(e) => {
                onCombinations(e.target.checked ? [] : null);
                setPage(0);
              }}
            />
            <span>{t("design.optimal.categories.restrict")}</span>
          </label>
          <p className="muted small">
            {t(
              combinations === null
                ? "design.optimal.categories.allCombinations"
                : "design.optimal.categories.allowedOnly",
            )}
          </p>
          {combinations !== null && (
            <>
              <div className="row">
                {selected.map((factor) => (
                  <label className="field" key={factor.id}>
                    <span>{factor.name}</span>
                    <select
                      value={draft[factor.id] ?? factor.levels[0] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [factor.id]: e.target.value })}
                    >
                      {factor.levels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  disabled={duplicate || tuple.some((label) => !label)}
                  onClick={() => onCombinations([...combinations, tuple])}
                >
                  {t("design.optimal.categories.add")}
                </button>
              </div>
              <p role="status">
                {t("design.optimal.categories.count", { count: combinations.length })}
              </p>
              {combinations.length === 0 && (
                <p className="error" role="status">
                  {t("design.optimal.categories.empty")}
                </p>
              )}
              <ul className="facts-list">
                {combinations.slice(current * 20, current * 20 + 20).map((values) => (
                  <li key={JSON.stringify(values)}>
                    <span>
                      {values
                        .map((label, i) => `${selected[i]?.name ?? i + 1}: ${label}`)
                        .join(" · ")}
                    </span>
                    <button
                      type="button"
                      className="button secondary small"
                      aria-label={t("design.optimal.categories.remove", {
                        labels: values.join(" · "),
                      })}
                      onClick={() =>
                        onCombinations(combinations.filter((tuple) => tuple !== values))
                      }
                    >
                      {t("design.optimal.removeConstraint")}
                    </button>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <div className="row">
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                  >
                    {t("optimalVariance.previous")}
                  </button>
                  <span>
                    {current + 1} / {pages}
                  </span>
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={current + 1 >= pages}
                    onClick={() => setPage(current + 1)}
                  >
                    {t("optimalVariance.next")}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
