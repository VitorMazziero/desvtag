import { describe, expect, it } from "vitest";
import type { Dataset } from "../../services/engine";
import { formPairs, levelsOf } from "./pairing";

const dataset = (rows: Array<[string | null, string | null, number | null]>): Dataset =>
  ({
    factors: [{ id: "f1", name: "Condição", kind: "categorical", unit: null, levels: [] }],
    responses: [{ id: "r1", name: "Atividade", unit: null }],
    observations: rows.map(([unit, level, y], i) => ({
      id: `o${i + 1}`,
      unitId: unit,
      factors: [level],
      responses: [y],
    })),
  }) as unknown as Dataset;

describe("formPairs", () => {
  it("forma um par por unidade com uma observação em cada nível", () => {
    const d = dataset([
      ["u1", "Antes", 10],
      ["u1", "Depois", 12],
      ["u2", "Depois", 15],
      ["u2", "Antes", 11],
    ]);
    const p = formPairs(d, 0, 0);
    expect(p?.levels).toEqual(["Antes", "Depois"]);
    expect(p?.units).toEqual(["u1", "u2"]);
    expect(p?.first).toEqual([10, 11]);
    expect(p?.second).toEqual([12, 15]);
  });

  it("não imputa: unidades incompletas, duplicadas e sem unidade ficam de fora e são contadas", () => {
    const d = dataset([
      ["u1", "Antes", 10],
      ["u1", "Depois", 12],
      ["u2", "Antes", 11],
      ["u3", "Antes", 9],
      ["u3", "Antes", 9.5],
      ["u3", "Depois", 13],
      [null, "Antes", 8],
      ["u4", "Antes", 7],
      ["u4", "Depois", null],
    ]);
    const p = formPairs(d, 0, 0);
    expect(p?.units).toEqual(["u1"]);
    expect(p?.incomplete.sort()).toEqual(["u2", "u4"]);
    expect(p?.duplicated).toEqual(["u3"]);
    expect(p?.withoutUnit).toBe(1);
  });

  it("só serve para fatores com exatamente dois níveis", () => {
    const d = dataset([
      ["u1", "A", 1],
      ["u1", "B", 2],
      ["u1", "C", 3],
    ]);
    expect(levelsOf(d, 0)).toEqual(["A", "B", "C"]);
    expect(formPairs(d, 0, 0)).toBeNull();
  });
});
