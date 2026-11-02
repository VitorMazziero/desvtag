import { describe, expect, it } from "vitest";
import { clampSeed, MAX_SEED, randomSeed } from "./seed";

describe("sementes", () => {
  it("limita ao maior inteiro seguro e rejeita valores inválidos", () => {
    expect(clampSeed("9223372036854775813")).toBe(MAX_SEED);
    expect(clampSeed(MAX_SEED + 10)).toBe(MAX_SEED);
    expect(clampSeed("12,7")).toBe(0);
    expect(clampSeed("")).toBe(0);
    expect(clampSeed(-5)).toBe(0);
    expect(clampSeed("42.9")).toBe(42);
    expect(Number.isSafeInteger(clampSeed(MAX_SEED))).toBe(true);
  });

  it("a semente aleatória é um inteiro seguro", () => {
    for (let i = 0; i < 20; i++) expect(Number.isSafeInteger(randomSeed())).toBe(true);
  });
});
