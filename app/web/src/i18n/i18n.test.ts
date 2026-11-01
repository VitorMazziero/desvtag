import { describe, expect, it } from "vitest";
import { createI18n, detectLanguage, resources } from "./index";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const base = (key: string) => key.replace(PLURAL_SUFFIX, "");

describe("locales", () => {
  it("have the same keys in pt-BR and en for every namespace (plural forms compared by base key)", () => {
    for (const ns of Object.keys(resources["pt-BR"]) as Array<keyof (typeof resources)["pt-BR"]>) {
      const pt = new Set(keys(resources["pt-BR"][ns]).map(base));
      const en = new Set(keys(resources.en[ns]).map(base));
      expect([...en].sort()).toEqual([...pt].sort());
    }
  });

  it("define every plural category each language actually uses", () => {
    const required = (lang: string) =>
      new Set(new Intl.PluralRules(lang).resolvedOptions().pluralCategories);
    for (const [lang, namespaces] of Object.entries(resources)) {
      for (const [ns, tree] of Object.entries(namespaces)) {
        const all = keys(tree);
        const bases = new Set(all.filter((k) => PLURAL_SUFFIX.test(k)).map(base));
        for (const b of bases) {
          for (const category of required(lang)) {
            expect(all, `${lang}/${ns}: ${b}_${category}`).toContain(`${b}_${category}`);
          }
        }
      }
    }
  });

  it("have no empty values", () => {
    expect(JSON.stringify(resources)).not.toContain('""');
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
  it("interpolates in both languages and resolves other namespaces", () => {
    const pt = createI18n("pt-BR");
    const en = createI18n("en");
    expect(
      pt.t("engine.unsupportedProtocolVersion", { ns: "diagnostics", expected: 1, received: 2 }),
    ).toContain("espera 1");
    expect(
      en.t("engine.unsupportedProtocolVersion", { ns: "diagnostics", expected: 1, received: 2 }),
    ).toContain("expects 1");
    expect(pt.t("table.n", { ns: "results" })).toBe("n válido");
    // Plural por regra do idioma, inclusive categorias que o pt-BR tem e o inglês não (many).
    const f = "facts.descriptive.missing_excluded";
    expect(pt.t(f, { ns: "results", count: 1 })).toContain("1 observação sem valor foi");
    expect(pt.t(f, { ns: "results", count: 2 })).toContain("2 observações sem valor foram");
    expect(pt.t(f, { ns: "results", count: 1_000_000 })).toContain("observações");
    expect(en.t(f, { ns: "results", count: 1 })).toContain("1 observation without");
    expect(en.t(f, { ns: "results", count: 5 })).toContain("5 observations without");
    expect(en.t("table.n", { ns: "results" })).toBe("Valid n");
  });
});
