// @vitest-environment node
// XLSX escrito pelo motor (WebAssembly) e lido de volta pelo leitor do projeto: texto, números,
// células vazias e texto parecido com fórmula (nunca executado).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildWorkbook } from "../export/xlsx";
import { type EngineResponse, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) });
});

function run(operation: unknown): EngineResponse {
  return JSON.parse(
    handleRequest(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, taskId: "x", operation })),
  ) as EngineResponse;
}

describe("XLSX export in WebAssembly", () => {
  it("writes a workbook that the project reader returns unchanged", () => {
    const book = buildWorkbook(
      "Coeficientes",
      ["termo", "estimativa", "p"],
      [
        ["Temperatura²", 5.0158, 1.5e-7],
        ["ação & <b>", -0.25, null],
        ["=1+1", 3, 0.1],
      ],
      { método: "response_surface", revisão: "v2" },
      "Proveniência",
    );
    const written = run({ type: "exportXlsx", ...book });
    if (written.outcome.status !== "ok" || written.outcome.result.type !== "exportXlsx")
      throw new Error(JSON.stringify(written.outcome));
    expect(written.outcome.result.size).toBeGreaterThan(500);
    const bytes = written.outcome.result.bytesBase64;
    expect(Buffer.from(bytes, "base64").subarray(0, 2).toString()).toBe("PK");
    const read = run({ type: "importXlsx", bytesBase64: bytes, sheet: null });
    if (read.outcome.status !== "ok" || read.outcome.result.type !== "importXlsx")
      throw new Error(JSON.stringify(read.outcome));
    expect(read.outcome.result.sheets).toEqual(["Coeficientes", "Proveniência"]);
    expect(read.outcome.result.rows).toEqual([
      ["termo", "estimativa", "p"],
      ["Temperatura²", "5.0158", "0.00000015"],
      ["ação & <b>", "-0.25", ""],
      ["=1+1", "3", "0.1"],
    ]);
  });

  it("refuses invalid sheet names with an explicit diagnostic", () => {
    const refused = run({ type: "exportXlsx", sheets: [{ name: "a/b", rows: [] }] });
    expect(refused.outcome.status).toBe("error");
    if (refused.outcome.status === "error")
      expect(refused.outcome.error.issues[0]?.code).toBe("export.invalid_sheet_name");
  });
});
