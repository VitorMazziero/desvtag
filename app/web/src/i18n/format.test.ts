import { describe, expect, it } from "vitest";
import { formatFull, formatNumber, formatSignificant } from "./format";

it("keeps tooltip precision and locale after changing display precision and notation repeatedly", () => {
  for (let digits = 1; digits <= 21; digits++)
    for (const language of ["pt-BR", "en"] as const)
      for (const value of [1.23456789, 1.23456789e100]) formatSignificant(value, language, digits);
  expect(formatFull(0.1 + 0.2, "en")).toBe("0.30000000000000004");
  expect(formatFull(0.1 + 0.2, "pt-BR")).toBe("0,30000000000000004");
  expect(formatSignificant(1.23456789, "en", 4)).toBe("1.235");
  expect(formatSignificant(1.23456789e100, "pt-BR", 4)).toBe("1,235e100");
});

describe("formatNumber", () => {
  it("uses the decimal separator of the language", () => {
    expect(formatNumber(1.5, "pt-BR")).toBe("1,5");
    expect(formatNumber(1.5, "en")).toBe("1.5");
  });
  it("keeps large integers exact instead of rounding them to a few digits", () => {
    expect(formatNumber(10000002, "pt-BR")).toBe("10000002");
    expect(formatNumber(10000000.2, "en")).toBe("10000000.2");
  });
  it("trims trailing zeros and rounds floating-point noise", () => {
    expect(formatNumber(0.1 + 0.2, "en")).toBe("0.3");
    expect(formatNumber(2, "en")).toBe("2");
  });
  it("does not use grouping separators that could be confused with decimals", () => {
    expect(formatNumber(1234567.5, "pt-BR")).toBe("1234567,5");
  });
});

describe("formatSignificant and formatP", () => {
  it("round to significant digits with the language's decimal separator", async () => {
    const { formatP, formatSignificant } = await import("./format");
    expect(formatSignificant(1.23456789, "en", 4)).toBe("1.235");
    expect(formatSignificant(1.23456789, "pt-BR", 4)).toBe("1,235");
    expect(formatP(0.123456, "en")).toBe("0.1235");
    expect(formatP(1.2345e-9, "en")).toBe("1.235e-9");
    expect(formatP(1.2345e-9, "pt-BR")).toBe("1,235e-9");
    expect(formatP(0, "en")).toBe("0");
  });
});

it("keeps extreme presentation compact and nonzero while retaining language and significant precision", async () => {
  const { formatSignificant } = await import("./format");
  expect(formatSignificant(1.23456789e100, "en")).toBe("1.23457e100");
  expect(formatSignificant(-1.23456789e-100, "pt-BR")).toBe("-1,23457e-100");
  expect(formatSignificant(0, "en")).toBe("0");
  expect(formatSignificant(1e-6, "en")).toBe("0.000001");
  expect(formatSignificant(1e6, "pt-BR")).toBe("1000000");
  expect(formatSignificant(Number.MIN_VALUE, "en")).not.toBe("0");
});
