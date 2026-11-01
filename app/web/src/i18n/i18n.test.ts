import { describe, expect, it } from "vitest";
import { createI18n, detectLanguage, resources } from "./index";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("locales", () => {
  it("have exactly the same keys in pt-BR and en for every namespace", () => {
    for (const ns of Object.keys(resources["pt-BR"]) as Array<keyof (typeof resources)["pt-BR"]>) {
      expect(keys(resources.en[ns]).sort()).toEqual(keys(resources["pt-BR"][ns]).sort());
    }
    expect(Object.keys(resources.en)).toBeDefined();
  });

  it("have no empty values", () => {
    for (const lang of Object.values(resources)) {
      for (const k of keys(lang)) expect(k).not.toBe("");
    }
    const flat = JSON.stringify(resources);
    expect(flat).not.toContain('""');
  });
});

describe("detectLanguage", () => {
  it("picks pt-BR for Portuguese variants and en otherwise", () => {
    expect(detectLanguage(["pt-PT"])).toBe("pt-BR");
    expect(detectLanguage(["pt-BR", "en-US"])).toBe("pt-BR");
    expect(detectLanguage(["en-GB"])).toBe("en");
    expect(detectLanguage(["de-DE", "en-US"])).toBe("en");
    expect(detectLanguage(["de-DE"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });
});

describe("translation", () => {
  it("interpolates and pluralizes in both languages", () => {
    const pt = createI18n("pt-BR");
    const en = createI18n("en");
    expect(pt.t("errors.unsupportedProtocolVersion", { expected: 1, received: 2 })).toContain(
      "espera 1",
    );
    expect(en.t("errors.unsupportedProtocolVersion", { expected: 1, received: 2 })).toContain(
      "expects 1",
    );
    expect(pt.t("engine.methodsCount", { count: 1 })).toBe("1 método");
    expect(pt.t("engine.methodsCount", { count: 3 })).toBe("3 métodos");
    expect(en.t("engine.methodsCount", { count: 1 })).toBe("1 method");
  });
});
