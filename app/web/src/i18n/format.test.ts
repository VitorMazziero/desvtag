import { describe, expect, it } from "vitest";
import { formatNumber } from "./format";

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
