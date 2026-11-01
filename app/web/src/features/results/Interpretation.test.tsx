import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../i18n";
import type { DescriptiveResult, Stat } from "../../services/engine";
import { factParams, Interpretation } from "./Interpretation";

const defined = (value: number): Stat => ({ status: "defined", value });
const summary = {
  nTotal: 6,
  nMissing: 1,
  nValid: 5,
  mean: defined(10.8),
  variance: defined(33.3),
  sd: defined(5.77),
  min: defined(5),
  max: defined(20),
};

const result = (facts: DescriptiveResult["facts"]): DescriptiveResult => ({
  responseId: "r1",
  overall: summary,
  groups: [],
  excludedMissingFactor: 0,
  facts,
  provenance: { methodId: "descriptive_summary", methodVersion: 1, engineVersion: "0.1.0" },
});

describe("factParams", () => {
  it("turns the count string from the engine into a number and leaves the rest alone", () => {
    expect(factParams({ count: "3", group: "B" })).toEqual({ count: 3, group: "B" });
    expect(factParams({ group: "B" })).toEqual({ group: "B" });
    expect(factParams({ count: "abc" })).toEqual({ count: "abc" });
  });
});

describe("Interpretation", () => {
  const facts: DescriptiveResult["facts"] = [
    { key: "descriptive.missing_excluded", params: { count: "1" } },
    { key: "descriptive.missing_excluded", params: { count: "2" } },
    { key: "descriptive.group_too_small", params: { group: "B", count: "1" } },
  ];

  it("uses the singular and plural forms in Portuguese, never showing raw keys", () => {
    render(
      <I18nextProvider i18n={createI18n("pt-BR")}>
        <Interpretation
          result={result(facts)}
          responseName="Atividade"
          responseUnit="U/mL"
          language="pt-BR"
        />
      </I18nextProvider>,
    );
    const text = screen.getByTestId("interpretation").textContent ?? "";
    expect(text).toContain("1 observação sem valor foi contada como ausente");
    expect(text).toContain("2 observações sem valor foram contadas como ausentes");
    expect(text).toContain("O grupo «B» tem 1 observação válida");
    expect(text).not.toContain("facts.");
  });

  it("works in English too", () => {
    render(
      <I18nextProvider i18n={createI18n("en")}>
        <Interpretation
          result={result(facts)}
          responseName="Activity"
          responseUnit=""
          language="en"
        />
      </I18nextProvider>,
    );
    const text = screen.getByTestId("interpretation").textContent ?? "";
    expect(text).toContain("1 observation without a value was counted as missing");
    expect(text).toContain("2 observations without a value were counted as missing");
    expect(text).not.toContain("facts.");
  });
});
