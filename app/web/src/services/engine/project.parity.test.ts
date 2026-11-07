// @vitest-environment node
// Formato `.enzitag` e importação de XLSX no WebAssembly, contra arquivos escritos por
// software independente (Python: zipfile, hashlib, openpyxl). Espelha os testes nativos em
// app/crates/desvtag-project/tests/.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  commitWorkspace,
  createWorkspace,
  toDocument,
  workspaceReducer,
} from "../../state/workspace";
import { bytesToBase64 } from "../storage/bytes";
import { type EngineResponse, type Operation, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

const cases = resolve(__dirname, "../../../../../validation/cases");

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) });
});

function call(operation: Operation): EngineResponse {
  const request = { protocolVersion: PROTOCOL_VERSION, taskId: "t", operation };
  return JSON.parse(handleRequest(JSON.stringify(request))) as EngineResponse;
}

const decode = (bytes: Uint8Array) =>
  call({ type: "projectDecode", bytesBase64: bytesToBase64(bytes) });
const fileOf = (name: string) => new Uint8Array(readFileSync(join(cases, "project_file", name)));

describe("project_file: Python-written .enzitag read by the WebAssembly engine", () => {
  it("decodes the valid file into exactly the expected document", () => {
    const response = decode(fileOf("001-valid.enzitag"));
    expect(response.outcome.status).toBe("ok");
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "projectDecode")
      return;
    const expected = JSON.parse(
      readFileSync(join(cases, "project_file/001-valid.expected.json"), "utf8"),
    );
    expect(response.outcome.result.document).toEqual(expected);
    expect(response.outcome.result.migratedFrom).toBeNull();
  });

  const spec = JSON.parse(readFileSync(join(cases, "project_file/cases.json"), "utf8")) as Record<
    string,
    { ok: boolean; code?: string; params?: Record<string, string> }
  >;
  for (const [file, expected] of Object.entries(spec).filter(([, s]) => !s.ok)) {
    it(`refuses ${file} with ${expected.code}`, () => {
      const response = decode(fileOf(file));
      expect(response.outcome.status).toBe("error");
      if (response.outcome.status !== "error") return;
      expect(response.outcome.error.code).toBe("invalidProject");
      expect(response.outcome.error.issues[0]?.code).toBe(expected.code);
      for (const [k, v] of Object.entries(expected.params ?? {})) {
        expect(response.outcome.error.issues[0]?.params[k]).toBe(v);
      }
    });
  }
});

describe("round trip of a real workspace through the engine", () => {
  it("encode then decode returns the same experiments, revisions and rows (accents included)", () => {
    const now = "2026-11-01T10:00:00.000Z";
    let ws = createWorkspace("p-test", "Açúcar — ensaio", "Experimento 1", now);
    ws = [
      { type: "addFactor" as const },
      {
        type: "updateFactor" as const,
        id: "f1",
        patch: { name: "Condição", levelsText: "Água; Ácido" },
      },
      { type: "addResponse" as const },
      { type: "updateResponse" as const, id: "r1", patch: { name: "Atividade", unit: "U/mL" } },
      { type: "addRow" as const },
      { type: "setCell" as const, row: 0, column: 1, value: "Água" },
      { type: "setCell" as const, row: 0, column: 2, value: "10,5" },
    ].reduce(workspaceReducer, ws);
    ws = commitWorkspace(ws, "manualSave", now);
    const doc = toDocument(ws, now, "0.1.0");

    const encoded = call({ type: "projectEncode", document: doc });
    expect(encoded.outcome.status).toBe("ok");
    if (encoded.outcome.status !== "ok" || encoded.outcome.result.type !== "projectEncode") return;
    expect(encoded.outcome.result.sha256).toHaveLength(64);

    const decoded = call({
      type: "projectDecode",
      bytesBase64: encoded.outcome.result.bytesBase64,
    });
    expect(decoded.outcome.status).toBe("ok");
    if (decoded.outcome.status !== "ok" || decoded.outcome.result.type !== "projectDecode") return;
    const back = decoded.outcome.result.document;
    expect(back.name).toBe("Açúcar — ensaio");
    expect(back.experiments[0]?.revisions.map((r) => r.reason)).toEqual(["created", "manualSave"]);
    expect(back.experiments[0]?.revisions[1]?.data.rows[0]?.responses).toEqual(["10,5"]);
    // O Rust preencheu os resumos que a interface enviou vazios.
    expect(back.experiments[0]?.revisions.every((r) => r.contentHash.length === 64)).toBe(true);

    const reloaded = workspaceReducer(createWorkspace("x", "", "", now), {
      type: "loadDocument",
      document: back,
      fileName: "a.enzitag",
      now,
    });
    expect(reloaded.experiments[0]?.rows).toEqual(ws.experiments[0]?.rows);
  });

  it("encoding is deterministic: the same document yields the same bytes and digest", () => {
    const doc = toDocument(
      createWorkspace("p-det", "x", "E", "2026-11-01T10:00:00.000Z"),
      "2026-11-01T10:00:00.000Z",
      "0.1.0",
    );
    const a = call({ type: "projectEncode", document: doc });
    const b = call({ type: "projectEncode", document: doc });
    expect(a).toEqual(b);
  });
});

describe("import_xlsx in WebAssembly vs the openpyxl case", () => {
  it("returns the expected text grid and warning counts", () => {
    const dir = join(cases, "import_xlsx/001-acentos-virgula-ausentes-formula");
    const expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8"));
    const bytes = new Uint8Array(readFileSync(join(dir, "input.xlsx")));
    const response = call({ type: "importXlsx", bytesBase64: bytesToBase64(bytes), sheet: null });
    expect(response.outcome.status).toBe("ok");
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "importXlsx") return;
    expect(response.outcome.result.rows).toEqual(expected.rows);
    expect(response.outcome.result.sheets).toEqual(expected.sheets);
    const counts = Object.fromEntries(
      response.outcome.result.warnings.map((w) => [w.code, Number(w.params.count)]),
    );
    expect(counts).toEqual(expected.warningCounts);
  });
});

describe("project with CRD and figure styles: same bytes in WebAssembly and native", () => {
  // O motor nativo (verificação nativa do Tauri, `native-checks.mjs`) codifica o mesmo documento e
  // compara o resumo SHA-256 com esta constante: arquivos idênticos nos dois alvos.
  const EXPECTED_SHA256 = "c9bcb6ac08ec7e35606072e16996d985a3df4f16d29e1e5cce00ba1d3ff57113";

  it("encodes deterministically, preserves the new fields and matches the native digest", () => {
    const decoded = decode(fileOf("001-valid.enzitag"));
    if (decoded.outcome.status !== "ok" || decoded.outcome.result.type !== "projectDecode")
      throw new Error("decode");
    const document = structuredClone(decoded.outcome.result.document);
    const experiment = document.experiments[0];
    if (!experiment) throw new Error("sem experimento");
    experiment.crd = {
      factorId: "f1",
      factorName: "Condição",
      levels: ["A", "B"],
      replicates: 3,
      randomize: true,
      seed: 42,
    };
    experiment.figureStyles = {
      "means-chart": { title: "Atividade (U/mL)", showLetters: false, fontScale: 1.2 },
    };
    const encode = () => call({ type: "projectEncode", document });
    const first = encode();
    if (first.outcome.status !== "ok" || first.outcome.result.type !== "projectEncode")
      throw new Error(JSON.stringify(first.outcome));
    const second = encode();
    if (second.outcome.status !== "ok" || second.outcome.result.type !== "projectEncode")
      throw new Error("encode 2");
    expect(second.outcome.result.sha256).toBe(first.outcome.result.sha256);
    const back = call({ type: "projectDecode", bytesBase64: first.outcome.result.bytesBase64 });
    if (back.outcome.status !== "ok" || back.outcome.result.type !== "projectDecode")
      throw new Error("decode 2");
    expect(back.outcome.result.document.experiments[0]?.crd).toEqual(experiment.crd);
    expect(back.outcome.result.document.experiments[0]?.figureStyles).toEqual(
      experiment.figureStyles,
    );
    expect(first.outcome.result.sha256).toBe(EXPECTED_SHA256);
  });
});

describe("ET22 saved families: byte-identical Rust-native and WebAssembly archives", () => {
  const directory = join(cases, "project_file/families");
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".enzitag"))) {
    it(`preserves every optional record and matches the native SHA-256: ${file}`, () => {
      const bytes = readFileSync(join(directory, file));
      const expected = JSON.parse(
        readFileSync(join(directory, file.replace(".enzitag", ".json")), "utf8"),
      );
      const decoded = decode(bytes);
      if (decoded.outcome.status !== "ok" || decoded.outcome.result.type !== "projectDecode")
        throw new Error(JSON.stringify(decoded));
      expect(decoded.outcome.result.document).toEqual(expected);
      const encoded = call({ type: "projectEncode", document: decoded.outcome.result.document });
      if (encoded.outcome.status !== "ok" || encoded.outcome.result.type !== "projectEncode")
        throw new Error(JSON.stringify(encoded));
      expect(encoded.outcome.result.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
      expect(Buffer.from(encoded.outcome.result.bytesBase64, "base64")).toEqual(bytes);
    });
  }
});

for (const family of ["nonlinear_profile", "power_advanced"])
  describe(`ET24 ${family}: frozen native archives`, () => {
    const directory = join(cases, "project_file", family);
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".enzitag")))
      it(`preserves historical results and exact archive bytes: ${file}`, () => {
        const bytes = readFileSync(join(directory, file));
        const expected = JSON.parse(
          readFileSync(join(directory, file.replace(".enzitag", ".json")), "utf8"),
        );
        const decoded = decode(bytes);
        if (decoded.outcome.status !== "ok" || decoded.outcome.result.type !== "projectDecode")
          throw new Error(JSON.stringify(decoded));
        expect(decoded.outcome.result.document).toEqual(expected);
        const encoded = call({ type: "projectEncode", document: decoded.outcome.result.document });
        if (encoded.outcome.status !== "ok" || encoded.outcome.result.type !== "projectEncode")
          throw new Error(JSON.stringify(encoded));
        expect(encoded.outcome.result.sha256).toBe(
          createHash("sha256").update(bytes).digest("hex"),
        );
        expect(Buffer.from(encoded.outcome.result.bytesBase64, "base64")).toEqual(bytes);
      });
  });

it("rejects inconsistent stored Monte Carlo summaries and degrees of freedom without refitting", () => {
  const path = join(
    cases,
    "project_file/power_advanced/regression_power_and_simulation_round_trip_without_recalculation.json",
  );
  const original = JSON.parse(readFileSync(path, "utf8"));
  const mutations = [
    (r: typeof original) => {
      r.simulation.rejections = 0;
    },
    (r: typeof original) => {
      r.simulation.estimate = (r.simulation.ciLower + r.simulation.ciUpper) / 2;
    },
    (r: typeof original) => {
      r.simulation.standardError *= 1.1;
    },
    (r: typeof original) => {
      r.simulation.ciUpper *= 0.9;
    },
    (r: typeof original) => {
      r.df2 += 100;
    },
  ];
  expect(call({ type: "projectEncode", document: original }).outcome.status).toBe("ok");
  for (const mutate of mutations) {
    const doc = structuredClone(original);
    mutate(doc.experiments[0].powerResult.records.at(-1).result);
    const outcome = call({ type: "projectEncode", document: doc }).outcome;
    expect(outcome.status).toBe("error");
    if (outcome.status === "error")
      expect(outcome.error.issues.some((i) => i.code === "project.invalid_family_result")).toBe(
        true,
      );
  }
});
