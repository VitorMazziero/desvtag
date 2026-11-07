// Todo código de problema que o motor pode emitir precisa ter texto nos dois idiomas; sem isso a
// interface mostra «erro desconhecido do motor» (UX44).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resources } from "./index";

const CRATES = join(__dirname, "../../../crates");
const CODE =
  /(?:invalid|error|warning|info|Issue::new|Issue::error|Issue::warning)\(\s*"([a-z_]+\.[a-z_0-9.]+)"/g;

function rustSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "tests" ? [] : rustSources(path);
    return name.endsWith(".rs") ? [path] : [];
  });
}

function emittedCodes(): string[] {
  const codes = new Set<string>();
  for (const crate of readdirSync(CRATES)) {
    const src = join(CRATES, crate, "src");
    try {
      statSync(src);
    } catch {
      continue;
    }
    for (const file of rustSources(src)) {
      for (const match of readFileSync(file, "utf8").matchAll(CODE)) codes.add(match[1] as string);
    }
  }
  return [...codes].sort();
}

function lookup(tree: unknown, code: string): unknown {
  return code.split(".").reduce<unknown>((node, part) => {
    return typeof node === "object" && node !== null
      ? (node as Record<string, unknown>)[part]
      : undefined;
  }, tree);
}

describe("diagnostics translations", () => {
  const codes = emittedCodes();

  it("finds the engine issue codes", () => {
    expect(codes.length).toBeGreaterThan(150);
  });

  for (const lang of ["pt-BR", "en"] as const) {
    it(`cover every issue code the engine emits (${lang})`, () => {
      const issues = (resources[lang].diagnostics as { issues: unknown }).issues;
      const missing = codes.filter((code) => typeof lookup(issues, code) !== "string");
      expect(missing).toEqual([]);
    });
  }
});
