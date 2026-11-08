import { describe, expect, it } from "vitest";
import { buildExperimentData, type ColumnMapping, guessMapping, looksLikeHeader } from "./mapping";

const grid = [
  ["Condição", "Atividade (U/mL)", "Unidade"],
  ["Água", "10,5", "U1"],
  ["Água", "11,5", "U1"],
  ["Ácido", "", "U2"],
  ["", "", ""],
];

describe("looksLikeHeader / guessMapping", () => {
  it("recognizes a header row and suggests factor and response", () => {
    expect(looksLikeHeader(grid)).toBe(true);
    expect(looksLikeHeader([["1", "2"]])).toBe(false);
    const m = guessMapping(grid, true);
    expect(m[0]).toMatchObject({ role: "factor", kind: "categorical", name: "Condição" });
    expect(m[1]).toMatchObject({ role: "response", name: "Atividade (U/mL)" });
  });
  it("gives priority to the names of existing responses and factors over the last numeric column (UX23)", () => {
    const g = [
      ["Tratamento", "Biomassa (g)", "Replicata"],
      ["A", "1,5", "1"],
      ["B", "2,5", "2"],
    ];
    const m = guessMapping(g, true, {
      factors: [{ name: "Tratamento", kind: "categorical" }],
      responses: [{ name: "biomassa" }],
    });
    expect(m.map((c) => c.role)).toEqual(["factor", "response", "factor"]);
    // Sem nada cadastrado, a heurística antiga escolhe a última coluna numérica.
    expect(guessMapping(g, true).map((c) => c.role)).toEqual(["factor", "factor", "response"]);
    // Com um fator cadastrado, ele não vira resposta pela heurística.
    const onlyFactor = guessMapping(g, true, {
      factors: [{ name: "Replicata", kind: "numeric" }],
      responses: [],
    });
    expect(onlyFactor.map((c) => c.role)).toEqual(["factor", "response", "factor"]);
  });
  it("names columns when there is no header", () => {
    expect(
      guessMapping(
        [
          ["a", "1"],
          ["b", "2"],
        ],
        false,
      ).map((c) => c.name),
    ).toEqual(["Coluna 1", "Coluna 2"]);
  });
});

function mapping(): ColumnMapping[] {
  return [
    { role: "factor", kind: "categorical", name: "Condição" },
    { role: "response", kind: "numeric", name: "Atividade" },
    { role: "unit", kind: "categorical", name: "Unidade" },
  ];
}

describe("buildExperimentData", () => {
  it("keeps the typed text (accents, decimal comma, empty = missing) and ignores empty rows", () => {
    const { data, issues, skippedEmptyRows } = buildExperimentData(grid, true, mapping());
    expect(issues).toEqual([]);
    expect(skippedEmptyRows).toBe(1);
    expect(data.rows.map((r) => [r.factors[0], r.responses[0], r.unitId])).toEqual([
      ["Água", "10,5", "U1"],
      ["Água", "11,5", "U1"],
      ["Ácido", "", "U2"],
    ]);
  });
  it("keeps repeated measurements of the same unit as distinct observations with distinct ids", () => {
    const { data } = buildExperimentData(grid, true, mapping());
    expect(data.rows[0]?.unitId).toBe(data.rows[1]?.unitId);
    expect(data.rows[0]?.id).not.toBe(data.rows[1]?.id);
  });
  it("uses a mapped observation id column and rejects invalid or duplicate ids", () => {
    const g = [
      ["id", "g", "y"],
      ["a1", "A", "1"],
      ["a2", "A", "2"],
      ["a1", "B", "3"],
      ["bad id", "B", "4"],
    ];
    const m: ColumnMapping[] = [
      { role: "observation", kind: "categorical", name: "id" },
      { role: "factor", kind: "categorical", name: "g" },
      { role: "response", kind: "numeric", name: "y" },
    ];
    const { issues } = buildExperimentData(g, true, m);
    expect(issues).toEqual([
      { code: "import.invalid_observation_id", rows: [4] },
      { code: "import.duplicate_observation_id", rows: [3] },
    ]);
  });
  it("accepts an external design matrix: factor columns with an empty response column", () => {
    const g = [
      ["Temperatura", "pH", "Resposta"],
      ["30", "5", ""],
      ["40", "5", ""],
      ["30", "7", ""],
      ["40", "7", ""],
    ];
    const m: ColumnMapping[] = [
      { role: "factor", kind: "numeric", name: "Temperatura" },
      { role: "factor", kind: "numeric", name: "pH" },
      { role: "response", kind: "numeric", name: "Resposta" },
    ];
    const { data, issues } = buildExperimentData(g, true, m);
    expect(issues).toEqual([]);
    expect(data.factors.map((f) => f.name)).toEqual(["Temperatura", "pH"]);
    expect(data.rows).toHaveLength(4);
    expect(data.rows.every((r) => r.responses[0] === "")).toBe(true);
  });
  it("requires at least one factor or response column", () => {
    const m: ColumnMapping[] = [{ role: "ignore", kind: "categorical", name: "x" }];
    expect(buildExperimentData([["x"], ["1"]], true, m).issues[0]?.code).toBe("import.no_columns");
  });
});

describe("dedicated unit and time roles", () => {
  it("does not choose the last numeric time column as the response", () => {
    const rows = [
      ["unit_id", "Condição", "Resposta", "time"],
      ["A B", "Antes", "1,5", "0,50"],
      ["A B", "Depois", "2,5", "1"],
    ];
    const mapping = guessMapping(rows, true);
    expect(mapping.map((m) => m.role)).toEqual(["unit", "factor", "response", "time"]);
    const result = buildExperimentData(rows, true, mapping);
    expect(result.issues).toEqual([]);
    expect(result.data.factors.map((f) => f.name)).toEqual(["Condição"]);
    expect(result.data.rows.map((r) => [r.unitId, r.responses[0], r.timeText])).toEqual([
      ["A B", "1,5", "0,50"],
      ["A B", "2,5", "1"],
    ]);
  });
  it("keeps an existing time factor in its registered role and rejects duplicate identity columns", () => {
    const rows = [
      ["Tempo", "Resposta"],
      ["0", "1"],
    ];
    const mapping = guessMapping(rows, true, {
      factors: [{ name: "Tempo", kind: "numeric" }],
      responses: [{ name: "Resposta" }],
    });
    expect(mapping.map((m) => m.role)).toEqual(["factor", "response"]);
    const result = buildExperimentData(
      [
        ["A", "B", "Y"],
        ["0", "1", "2"],
      ],
      true,
      [
        { role: "time", kind: "numeric", name: "A" },
        { role: "time", kind: "numeric", name: "B" },
        { role: "response", kind: "numeric", name: "Y" },
      ],
    );
    expect(result.issues).toContainEqual({
      code: "import.multiple_identifier_columns",
      columns: [1, 2],
      rows: [],
    });
  });
});
