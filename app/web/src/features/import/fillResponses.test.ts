import { describe, expect, it } from "vitest";
import { toCsv } from "../../services/export";
import { decodeText, detectDelimiter, parseCsv, splitMetadata } from "../../services/import/csv";
import type { RowDraft } from "../../state/project";
import {
  assignRows,
  existingResponses,
  fillResponses,
  levelsEqual,
  planSheet,
  responseLabel,
} from "./fillResponses";

const factors = [
  { name: "Temperatura", kind: "numeric" as const },
  { name: "pH", kind: "numeric" as const },
];
const responses = [{ name: "Atividade", unit: "U/mL" }];
const row = (id: string, f: string[], r: string[] = [""], unitId = ""): RowDraft => ({
  id,
  unitId,
  factors: f,
  responses: r,
});

// Planejamento 2² com duas réplicas do ponto central, em ordem de execução embaralhada.
const rows: RowDraft[] = [
  row("o1", ["30", "7"]),
  row("o2", ["20", "5"]),
  row("o3", ["25", "6"]),
  row("o4", ["20", "7"]),
  row("o5", ["25", "6"]),
  row("o6", ["30", "5"]),
];

describe("planilha de coleta: reconhecimento do cabeçalho", () => {
  it("exige todos os fatores e ao menos uma resposta", () => {
    const header = ["run", "Temperatura", "pH", "Atividade (U/mL)"];
    const plan = planSheet(header, factors, responses);
    expect(plan).toEqual({ factorColumns: [1, 2], responseColumns: [3], unitColumn: -1 });
    expect(planSheet(["run", "Temperatura", "Atividade (U/mL)"], factors, responses)).toBeNull();
    expect(planSheet(["run", "Temperatura", "pH"], factors, responses)).toBeNull();
  });

  it("aceita o nome da resposta com ou sem unidade e ignora maiúsculas", () => {
    const plan = planSheet(["temperatura", "PH", "atividade"], factors, responses);
    expect(plan?.responseColumns).toEqual([2]);
    expect(responseLabel(responses[0] as (typeof responses)[0])).toBe("Atividade (U/mL)");
  });

  it("com a coluna da unidade experimental, os fatores podem faltar", () => {
    const plan = planSheet(["unit_id", "Atividade"], factors, responses);
    expect(plan?.unitColumn).toBe(0);
  });
});

describe("planilha de coleta: correspondência", () => {
  it("cruza por níveis mesmo com linhas em outra ordem e réplicas na ordem de aparição", () => {
    const body = [
      ["1", "20", "5", "10,5"],
      ["2", "30", "5", "12"],
      ["3", "25", "6", "15"],
      ["4", "25", "6", "15,2"],
      ["5", "20", "7", "11"],
      ["6", "30", "7", "13"],
    ];
    const plan = planSheet(["run", "Temperatura", "pH", "Atividade (U/mL)"], factors, responses);
    expect(plan).not.toBeNull();
    const result = fillResponses(body, plan as NonNullable<typeof plan>, rows, factors);
    expect(result.unmatchedLines).toEqual([]);
    expect(result.invalid).toEqual([]);
    expect(result.cells).toHaveLength(6);
    const text = (rowIndex: number) => result.cells.find((c) => c.row === rowIndex)?.text;
    expect(text(1)).toBe("10,5"); // 20/5 -> o2
    expect(text(5)).toBe("12"); // 30/5 -> o6
    expect(text(2)).toBe("15"); // primeira réplica do ponto central -> o3
    expect(text(4)).toBe("15,2"); // segunda réplica -> o5
    expect(text(0)).toBe("13"); // 30/7 -> o1
    expect(text(3)).toBe("11"); // 20/7 -> o4
    expect(result.replacing).toBe(0);
  });

  it("não grava linhas com níveis diferentes dos planejados e conta ensaios sem linha", () => {
    const plan = planSheet(["Temperatura", "pH", "Atividade"], factors, responses);
    const body = [
      ["20", "5", "10"],
      ["99", "5", "11"],
    ];
    const result = fillResponses(body, plan as NonNullable<typeof plan>, rows, factors);
    expect(result.cells).toEqual([{ row: 1, response: 0, text: "10" }]);
    expect(result.unmatchedLines).toEqual([2]);
    expect(result.rowsWithoutLine).toBe(5);
  });

  it("células em branco ficam como estão; texto não numérico é recusado", () => {
    const plan = planSheet(["Temperatura", "pH", "Atividade"], factors, responses);
    const body = [
      ["20", "5", ""],
      ["30", "7", "abc"],
      ["30", "5", "1e3"],
    ];
    const result = fillResponses(body, plan as NonNullable<typeof plan>, rows, factors);
    expect(result.empty).toBe(1);
    expect(result.invalid).toEqual([{ line: 2, response: 0, text: "abc" }]);
    expect(result.cells).toEqual([{ row: 5, response: 0, text: "1e3" }]);
  });

  it("conta os valores já digitados que seriam substituídos", () => {
    const filled = rows.map((r, i) => (i === 1 ? { ...r, responses: ["9"] } : r));
    const plan = planSheet(["Temperatura", "pH", "Atividade"], factors, responses);
    const result = fillResponses(
      [["20", "5", "10"]],
      plan as NonNullable<typeof plan>,
      filled,
      factors,
    );
    expect(result.replacing).toBe(1);
  });

  it("tolera arredondamento dos níveis numéricos", () => {
    expect(levelsEqual("0,30000000001", "0.3", "numeric")).toBe(true);
    expect(levelsEqual("0,31", "0.3", "numeric")).toBe(false);
    expect(levelsEqual("A", "A ", "categorical")).toBe(true);
    expect(levelsEqual("A", "a", "categorical")).toBe(false);
  });

  it("com unidades experimentais, cruza pela unidade (DIC e DBC)", () => {
    const crdRows: RowDraft[] = [
      row("o1", ["B"], [""], "T2-R1"),
      row("o2", ["A"], [""], "T1-R1"),
      row("o3", ["A"], [""], "T1-R2"),
    ];
    const lines = [
      { unit: "T1-R1", levels: [undefined] },
      { unit: "T1-R2", levels: [undefined] },
      { unit: "T2-R1", levels: [undefined] },
      { unit: "T9-R9", levels: [undefined] },
    ];
    expect(assignRows(lines, crdRows, [{ name: "Condição", kind: "categorical" }])).toEqual([
      1,
      2,
      0,
      null,
    ]);
  });

  it("a matriz reexportada traz os valores já digitados, ensaio a ensaio", () => {
    const withValues = rows.map((r, i) => (i === 2 ? { ...r, responses: ["15"] } : r));
    const lines = [
      { unit: "", levels: ["25", "6"] },
      { unit: "", levels: ["25", "6"] },
      { unit: "", levels: ["20", "5"] },
    ];
    expect(existingResponses(lines, withValues, factors, 1)).toEqual([["15"], [""], [""]]);
  });
});

describe("CSV exportado pelo aplicativo é reimportável", () => {
  it("ignora as linhas de metadados e lê a tabela", () => {
    const text = toCsv(
      ["run", "Temperatura", "pH", "Atividade (U/mL)"],
      [
        [1, 20, 5, null],
        [2, 30, 5, "12"],
      ],
      { app: "EnziTAG Optima", project: "Teste", seed: "7" },
    );
    const decoded = decodeText(new TextEncoder().encode(text)).text;
    const { metadata, body } = splitMetadata(decoded);
    expect(metadata).toEqual({ app: "EnziTAG Optima", project: "Teste", seed: "7" });
    const parsed = parseCsv(body, detectDelimiter(body));
    expect(parsed[0]).toEqual(["run", "Temperatura", "pH", "Atividade (U/mL)"]);
    expect(parsed).toHaveLength(3);
    expect(parsed[2]).toEqual(["2", "30", "5", "12"]);
  });

  it("um # no meio dos dados continua sendo dado", () => {
    const { metadata, body } = splitMetadata("a;b\r\n#1;2\r\n");
    expect(metadata).toEqual({});
    expect(body).toBe("a;b\r\n#1;2\r\n");
  });
});
