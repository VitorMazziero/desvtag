import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../i18n";
import { StatNumber } from "./StatCell";

describe("statistical number presentation", () => {
  it("keeps a small nonzero estimate and full precision instead of presenting exact zero", () => {
    const { container } = render(
      <I18nextProvider i18n={createI18n("pt-BR")}>
        <StatNumber stat={{ status: "defined", value: 2.81965e-15 }} language="pt-BR" residual />
      </I18nextProvider>,
    );
    expect(screen.getByText("≈ 0")).toBeTruthy();
    expect(container.querySelector("[data-full-value]")?.getAttribute("data-full-value")).toBe(
      "2.81965e-15",
    );
    expect(screen.getByRole("math").getAttribute("aria-label")).toContain(
      "Numericamente próximo de zero",
    );
  });
  it("distinguishes a non-estimable parameter from absent observations and zero residual df", () => {
    const { container } = render(
      <I18nextProvider i18n={createI18n("en")}>
        <StatNumber stat={{ status: "undefined", reason: "notEstimable" }} language="en" />
        <StatNumber stat={{ status: "undefined", reason: "noValidObservations" }} language="en" />
        <StatNumber
          stat={{ status: "undefined", reason: "noResidualDegreesOfFreedom" }}
          language="en"
        />
      </I18nextProvider>,
    );
    expect(container.querySelectorAll("[data-stat-state]")).toHaveLength(3);
    expect(screen.getByText("n.e.")).toBeTruthy();
    expect(screen.getByText("n/d")).toBeTruthy();
    expect(screen.getByText("no df")).toBeTruthy();
    expect(container.querySelectorAll("[data-full-value]")).toHaveLength(0);
  });
});
