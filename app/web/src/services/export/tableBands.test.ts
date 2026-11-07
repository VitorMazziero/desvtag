import { expect, it } from "vitest";
import { tableBands } from "./tableBands";

function make(columns: number, rows: number) {
  const table = document.createElement("table");
  table.innerHTML = `<thead><tr>${Array.from({ length: columns }, (_, i) => `<th>C${i}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: columns }, (_, c) => `<td>${r}/${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return table;
}
for (const columns of [3, 8, 33])
  it(`preserves every cell and column association in ${columns}-column paper tables`, () => {
    const original = make(columns, 41),
      html = original.outerHTML;
    const bands = tableBands(original);
    expect(bands).toHaveLength(columns <= 6 ? 1 : Math.ceil((columns - 1) / 5));
    expect(original.outerHTML).toBe(html);
    const seen = new Set<string>();
    for (const table of bands) {
      expect(table.rows).toHaveLength(42);
      expect(table.rows[0]?.cells.length).toBeLessThanOrEqual(6);
      for (let r = 1; r < table.rows.length; r++) {
        expect(table.rows[r]?.cells[0]?.textContent).toBe(`${r - 1}/0`);
        for (const cell of [...(table.rows[r]?.cells ?? [])].slice(1)) {
          expect(seen.has(cell.textContent ?? "")).toBe(false);
          seen.add(cell.textContent ?? "");
        }
      }
    }
    for (let r = 0; r < 41; r++)
      for (let c = 1; c < columns; c++) expect(seen.has(`${r}/${c}`)).toBe(true);
  });

it("adds a shared row ordinal when the repeated reference is not unique", () => {
  const table = make(8, 4);
  for (const row of [...table.tBodies[0]!.rows]) row.cells[0]!.textContent = "Group A";
  const bands = tableBands(table);
  expect(bands).toHaveLength(2);
  for (const band of bands) {
    expect(band.rows[0]?.cells[0]?.textContent).toBe("#");
    for (let r = 1; r < band.rows.length; r++) {
      expect(band.rows[r]?.cells[0]?.textContent).toBe(String(r));
      expect(band.rows[r]?.cells[1]?.textContent).toBe("Group A");
    }
  }
});
