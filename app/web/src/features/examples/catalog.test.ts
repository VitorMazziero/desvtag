import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resources } from "../../i18n";
import { EXAMPLE_IDS } from "./ids";

const examplesDir = resolve(__dirname, "../../../../../examples");

describe("catálogo de exemplos", () => {
  it("cobre todas as pastas distribuíveis de examples/ (o 05 é reservado e não é distribuído)", () => {
    const folders = readdirSync(examplesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d\d-/.test(d.name) && !d.name.startsWith("05-"))
      .map((d) => d.name.slice(0, 2))
      .sort();
    expect([...EXAMPLE_IDS].sort()).toEqual(folders);
  });

  it("tem título e descrição nos dois idiomas", () => {
    for (const lang of ["pt-BR", "en"] as const) {
      const items = (resources[lang].common as { examples: { items: Record<string, unknown> } })
        .examples.items;
      for (const id of EXAMPLE_IDS) {
        expect(items[id], `${lang}/${id}`).toMatchObject({
          title: expect.any(String),
          description: expect.any(String),
        });
      }
    }
  });
});
