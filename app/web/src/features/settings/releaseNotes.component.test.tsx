import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
// @ts-expect-error módulo .mjs de scripts, sem declaração de tipos
import { notesFor, sectionOf, truncateAtBlock } from "../../../../../scripts/release-notes.mjs";
import { parseInline, parseNotes } from "./notesMarkdown";
import { ReleaseNotes } from "./ReleaseNotes";

const NOTES = `> **Versão publicada.** Veja o [registro](https://example.org/registro).

### Métodos novos

| Método | Referência |
|---|---|
| Dunnett | \`scipy\` |
| Holm | **statsmodels** |

- primeiro item
  continuação do item
- segundo item com **negrito**
`;

describe("parseNotes", () => {
  it("reconhece citação, título, tabela e lista", () => {
    const blocks = parseNotes(NOTES);
    expect(blocks.map((b) => b.type)).toEqual(["quote", "heading", "table", "list"]);
    const table = blocks[2];
    expect(table?.type === "table" && table.rows).toHaveLength(2);
    const list = blocks[3];
    expect(list?.type === "list" && list.items).toHaveLength(2);
  });

  it("só links https viram links; o resto vira texto", () => {
    expect(parseInline("[a](https://x.org/p) [b](javascript:void) [c](docs/x.md)")).toEqual([
      { type: "link", text: "a", href: "https://x.org/p" },
      { type: "text", text: " " },
      { type: "text", text: "b" },
      { type: "text", text: " " },
      { type: "text", text: "c" },
    ]);
  });
});

describe("ReleaseNotes", () => {
  it("desenha as notas formatadas, sem Markdown cru na tela", () => {
    render(<ReleaseNotes markdown={NOTES} label="Novidades" />);
    const region = screen.getByRole("region", { name: "Novidades" });
    expect(region).toHaveTextContent("Métodos novos");
    expect(region.querySelector("table")).not.toBeNull();
    expect(region.querySelectorAll("li")).toHaveLength(2);
    expect(region.querySelector("a")?.getAttribute("href")).toBe("https://example.org/registro");
    expect(region.querySelector("a")?.getAttribute("rel")).toContain("noopener");
    expect(region.textContent).not.toContain("**");
    expect(region.textContent).not.toContain("|---|");
    expect(region.textContent).not.toContain("###");
  });

  it("não interpreta HTML nem scripts das notas", () => {
    render(
      <ReleaseNotes
        markdown={'<img src=x onerror="alert(1)"> <script>alert(2)</script>'}
        label="N"
      />,
    );
    const region = screen.getByRole("region", { name: "N" });
    expect(region.querySelector("img")).toBeNull();
    expect(region.querySelector("script")).toBeNull();
    expect(region).toHaveTextContent("<script>alert(2)</script>");
  });
});

describe("notas geradas a partir do CHANGELOG", () => {
  const changelog = `# Histórico\n\n## [0.3.0] — 2026-12-01\n\nTexto novo com [guia](docs/guias/x.md).\n\n${"Parágrafo longo. ".repeat(40)}\n\n${"Outro parágrafo. ".repeat(40)}\n\n## [0.2.0] — 2026-11-02\n\nTexto antigo.\n`;

  it("usa só a seção da versão", () => {
    expect(sectionOf(changelog, "0.2.0")).toBe("Texto antigo.");
    expect(sectionOf(changelog, "9.9.9")).toBeNull();
    expect(notesFor(changelog, "9.9.9")).toBe("EnziTAG Optima 9.9.9 (canal experimental).");
  });

  it("não corta no meio de uma frase e indica o CHANGELOG completo", () => {
    const out = notesFor(changelog, "0.3.0", 900) as string;
    expect(out.length).toBeLessThan(1100);
    expect(out).toContain("…[o texto completo está no CHANGELOG](");
    expect(out.split("\n\n…")[0]?.endsWith(".")).toBe(true);
  });

  it("links relativos viram links absolutos da etiqueta", () => {
    const out = notesFor(changelog, "0.3.0", 100000) as string;
    expect(out).toContain(
      "(https://github.com/VitorMazziero/enzitag-optima/blob/v0.3.0/docs/guias/x.md)",
    );
  });

  it("não corta quando cabe no limite", () => {
    expect(truncateAtBlock("curto", 100, "https://x")).toBe("curto");
  });
});
