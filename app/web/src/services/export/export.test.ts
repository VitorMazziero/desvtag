import { describe, expect, it } from "vitest";
import { toCsv, utf8 } from "./csv";
import { addPngText } from "./png";

describe("toCsv", () => {
  it("writes UTF-8 BOM, metadata comments, quoting and full-precision numbers", () => {
    const text = toCsv(
      ["grupo", "media"],
      [
        ["a, b", 0.1 + 0.2],
        ['dizem "oi"', null],
        ["linha\nquebrada", 1e-7],
      ],
      { method: "one_way_comparison", config: "x\ny" },
    );
    expect(text.startsWith("﻿# method: one_way_comparison\r\n# config: x y\r\n\r\n")).toBe(true);
    expect(text).toContain('"a, b",0.30000000000000004');
    expect(text).toContain('"dizem ""oi""",');
    expect(text).toContain('"linha\nquebrada",1e-7');
    expect(text.endsWith("\r\n")).toBe(true);
  });
  it("encodes accents as UTF-8", () => {
    expect([...utf8("é")]).toEqual([0xc3, 0xa9]);
  });
});

/** PNG mínimo válido: assinatura + IHDR (1×1) + IDAT + IEND (conteúdo não é decodificado aqui). */
function tinyPng(): Uint8Array {
  const chunk = (type: string, data: number[]) => {
    const body = [...type].map((c) => c.charCodeAt(0)).concat(data);
    const len = data.length;
    return [len >>> 24, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...body, 0, 0, 0, 0];
  };
  return Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
    ...chunk("IDAT", [1, 2, 3]),
    ...chunk("IEND", []),
  ]);
}

describe("addPngText", () => {
  it("inserts a tEXt chunk after IHDR with a valid CRC and keeps the rest intact", () => {
    const png = tinyPng();
    const out = addPngText(png, "Description", '{"method":"one_way_comparison"}');
    expect(out.length).toBeGreaterThan(png.length);
    const at = 8 + 12 + 13; // assinatura + IHDR
    const length = new DataView(out.buffer, out.byteOffset + at, 4).getUint32(0);
    const type = String.fromCharCode(...out.subarray(at + 4, at + 8));
    expect(type).toBe("tEXt");
    const payload = new TextDecoder().decode(out.subarray(at + 8, at + 8 + length));
    expect(payload).toBe('Description\0{"method":"one_way_comparison"}');
    // CRC-32 conferido por uma implementação independente (bit a bit).
    let crc = 0xffffffff;
    for (const byte of out.subarray(at + 4, at + 8 + length)) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    const stored = new DataView(out.buffer, out.byteOffset + at + 8 + length, 4).getUint32(0);
    expect(stored).toBe((crc ^ 0xffffffff) >>> 0);
    // O que vem depois é o IDAT e o IEND originais.
    expect([...out.subarray(at + 12 + length)]).toEqual([...png.subarray(8 + 12 + 13)]);
  });
  it("refuses data that is not a PNG", () => {
    expect(() => addPngText(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]), "k", "v")).toThrow();
  });
});

describe("CSV dialects and formula protection", () => {
  it("quotes text that could be read as a formula, but never numbers", async () => {
    const { toCsv, looksLikeFormula } = await import("./csv");
    const csv = toCsv(
      ["a", "b"],
      [
        ['=HYPERLINK("http://x")', -5],
        ["+1", 2],
        ["@SUM(A1)", null],
        ["-texto", 0.5],
        ["\tTAB", 1],
        ["normal", -0.25],
      ],
      {},
    );
    const lines = csv.split("\r\n");
    expect(lines).toContain('"\'=HYPERLINK(""http://x"")",-5');
    expect(lines).toContain("'+1,2");
    expect(lines).toContain("'@SUM(A1),");
    expect(lines).toContain("'-texto,0.5");
    expect(lines).toContain("normal,-0.25"); // número negativo continua número
    expect(looksLikeFormula("=1")).toBe(true);
    expect(looksLikeFormula("texto")).toBe(false);
  });

  it("writes the Excel-PT dialect with semicolons and decimal commas", async () => {
    const { toCsv, EXCEL_PT } = await import("./csv");
    const csv = toCsv(
      ["termo", "valor"],
      [
        ["a;b", 1.5],
        ["x", 1000.25],
      ],
      { método: "m" },
      EXCEL_PT,
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("﻿# método: m");
    expect(lines).toContain("termo;valor");
    expect(lines).toContain('"a;b";1,5');
    expect(lines).toContain("x;1000,25");
  });

  it("builds a workbook with the table and a provenance sheet and valid Excel sheet names", async () => {
    const { buildWorkbook, sheetName } = await import("./xlsx");
    const book = buildWorkbook(
      "ANOVA: [a]/b",
      ["x"],
      [[1], [null], ["t"]],
      { k: "v" },
      "Proveniência",
    );
    expect(book.sheets.map((s) => s.name)).toEqual(["ANOVA   a  b", "Proveniência"]);
    expect(book.sheets[0]?.rows).toEqual([["x"], [1], [null], ["t"]]);
    expect(book.sheets[1]?.rows).toEqual([["k", "v"]]);
    expect(sheetName("x".repeat(40))).toHaveLength(31);
    expect(sheetName("")).toBe("Tabela");
    const same = buildWorkbook("Proveniência", ["x"], [], { k: "v" }, "Proveniência");
    expect(new Set(same.sheets.map((s) => s.name.toLowerCase())).size).toBe(2);
  });
});
