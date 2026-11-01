import { describe, expect, it } from "vitest";
import { decodeText, detectDelimiter, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("reads quoted fields, escaped quotes, embedded delimiters and line breaks", () => {
    const text = 'a;b;c\r\n"x;1";"he said ""hi""";"line1\nline2"\r\n';
    expect(parseCsv(text, ";")).toEqual([
      ["a", "b", "c"],
      ["x;1", 'he said "hi"', "line1\nline2"],
    ]);
  });
  it("keeps empty cells as empty text and rows of unequal length", () => {
    expect(parseCsv("a,b,c\n1,,3\n4,5\n", ",")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
      ["4", "5"],
    ]);
  });
  it("handles old Mac line breaks, a final line without newline and trailing blank lines", () => {
    expect(parseCsv("a;b\r1;2\r", ";")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a;b\n1;2", ";")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a;b\n1;2\n\n\n", ";")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("preserves decimal commas, accents and non-Latin text as typed", () => {
    expect(parseCsv("Condição;Atividade\nÁgua;10,5\n日本;7\n", ";")[1]).toEqual(["Água", "10,5"]);
  });
  it("returns no rows for empty input", () => {
    expect(parseCsv("", ";")).toEqual([]);
  });
});

describe("detectDelimiter", () => {
  it("prefers the delimiter that is consistent across lines", () => {
    expect(detectDelimiter("a;b;c\n1,5;2,5;3,5\n4;5;6\n")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3\n")).toBe(",");
    expect(detectDelimiter("a\tb\n1\t2\n")).toBe("\t");
    expect(detectDelimiter("a|b\n1|2\n")).toBe("|");
  });
  it("ignores delimiters inside quotes", () => {
    expect(detectDelimiter('"a,b";"c,d"\n"1,5";"2,5"\n')).toBe(";");
  });
});

describe("decodeText", () => {
  const utf8 = (s: string) => new TextEncoder().encode(s);
  it("reads UTF-8 with and without BOM", () => {
    expect(decodeText(utf8("Água")).text).toBe("Água");
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("Água")])).text).toBe("Água");
  });
  it("falls back to Windows-1252 when the bytes are not valid UTF-8 and says so", () => {
    // "Água" em Windows-1252: Á = 0xC1, g = 0x67, u = 0x75, a = 0x61
    const win = new Uint8Array([0xc1, 0x67, 0x75, 0x61]);
    expect(decodeText(win)).toEqual({ text: "Água", encoding: "windows-1252", fellBack: true });
    expect(() => decodeText(win, "utf-8")).toThrow();
    expect(decodeText(win, "windows-1252").text).toBe("Água");
  });
});
