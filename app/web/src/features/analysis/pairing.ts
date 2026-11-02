// Formação dos pares para a comparação pareada: cada unidade experimental com uma observação em
// cada um dos dois níveis do fator forma um par. Nada é imputado nem agregado: unidades sem as duas
// condições ficam de fora e unidades com mais de uma observação no mesmo nível invalidam o par.
import type { Dataset } from "../../services/engine";

export interface PairingResult {
  levels: [string, string];
  first: number[];
  second: number[];
  units: string[];
  /** Unidades que só têm uma das duas condições (ou resposta ausente). */
  incomplete: string[];
  /** Unidades com mais de uma observação em algum nível (não formam par). */
  duplicated: string[];
  /** Observações sem unidade experimental informada. */
  withoutUnit: number;
}

/** Níveis distintos do fator categórico `factorIndex` nos dados (declarados primeiro). */
export function levelsOf(dataset: Dataset, factorIndex: number): string[] {
  const declared = dataset.factors[factorIndex]?.levels ?? [];
  if (declared.length > 0) return declared;
  const present = new Set<string>();
  for (const o of dataset.observations) {
    const v = o.factors[factorIndex];
    if (typeof v === "string") present.add(v);
  }
  return [...present].sort();
}

export function formPairs(
  dataset: Dataset,
  factorIndex: number,
  responseIndex: number,
): PairingResult | null {
  const levels = levelsOf(dataset, factorIndex);
  if (levels.length !== 2) return null;
  const [a, b] = levels as [string, string];
  const byUnit = new Map<string, { a: number[]; b: number[] }>();
  let withoutUnit = 0;
  for (const o of dataset.observations) {
    const level = o.factors[factorIndex];
    const value = o.responses[responseIndex];
    if (typeof level !== "string" || (level !== a && level !== b)) continue;
    if (o.unitId === null || o.unitId === undefined) {
      withoutUnit += 1;
      continue;
    }
    const entry = byUnit.get(o.unitId) ?? { a: [], b: [] };
    if (typeof value === "number") (level === a ? entry.a : entry.b).push(value);
    byUnit.set(o.unitId, entry);
  }
  const result: PairingResult = {
    levels: [a, b],
    first: [],
    second: [],
    units: [],
    incomplete: [],
    duplicated: [],
    withoutUnit,
  };
  for (const [unit, e] of byUnit) {
    if (e.a.length > 1 || e.b.length > 1) result.duplicated.push(unit);
    else if (e.a.length === 1 && e.b.length === 1) {
      result.first.push(e.a[0] as number);
      result.second.push(e.b[0] as number);
      result.units.push(unit);
    } else result.incomplete.push(unit);
  }
  return result;
}
