// Verifica o contraste WCAG (≥ 4,5:1 para texto) dos pares de tokens de cada tema.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_LIST } from "../../tests/e2e/themes";
import { THEMES } from "../state/preferences";

function tokens(file: string): Record<string, string> {
  const css = readFileSync(join(__dirname, file), "utf8");
  return Object.fromEntries(
    [...css.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)].map((m) => [
      m[1] as string,
      m[2] as string,
    ]),
  );
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const pairs: Array<[string, string]> = [
  ["color-ink", "color-ground"],
  ["color-ink", "color-panel"],
  ["color-ink-secondary", "color-ground"],
  ["color-ink-secondary", "color-panel"],
  ["color-on-action", "color-action"],
  ["color-on-action", "color-action-hover"],
  ["color-accent-text", "color-ground"],
  ["color-accent-text", "color-panel"],
  ["color-ok", "color-ground"],
  ["color-ok", "color-panel"],
  ["color-focus", "color-ground"],
  ["color-focus", "color-panel"],
  ["color-ink", "color-ground-muted"],
  ["color-ink-secondary", "color-ground-muted"],
];

const FILES = [
  "soft-light.css",
  "modern-dark.css",
  "professional.css",
  "industrial.css",
  "organic.css",
  "clay.css",
];

describe.each(FILES)("theme %s", (file) => {
  const t = tokens(file);
  it.each(pairs)("%s on %s has contrast >= 4.5", (fg, bg) => {
    expect(t[fg], `${fg} missing in ${file}`).toBeDefined();
    expect(t[bg], `${bg} missing in ${file}`).toBeDefined();
    expect(contrast(t[fg] as string, t[bg] as string)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("theme list", () => {
  it("has one stylesheet per theme and the E2E list matches the app list", () => {
    expect(FILES).toEqual(THEMES.map((t) => `${t}.css`));
    expect([...THEME_LIST]).toEqual([...THEMES]);
  });
});
