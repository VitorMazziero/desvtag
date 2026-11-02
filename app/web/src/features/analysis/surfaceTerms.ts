// Termos de segunda ordem na forma usada pelo estado (listas de ids de fatores) e conversões
// de/para os termos do contrato do motor.
import type { TermSpec } from "../../services/engine";

/** Todos os termos de segunda ordem: principais, quadráticos e interações de dois fatores. */
export function allSurfaceTerms(ids: string[]): string[][] {
  return [
    ...ids.map((id) => [id]),
    ...ids.map((id) => [id, id]),
    ...ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b])),
  ];
}

export const termKey = (term: string[]): string => term.join("|");

export function termLabel(term: string[], nameOf: (id: string) => string): string {
  const [first, second] = term;
  return term.length === 2 && first === second
    ? `${nameOf(first as string)}²`
    : term.map(nameOf).join(" × ");
}

/** Termos do contrato → listas de ids. */
export function termIdsFromSpecs(specs: TermSpec[]): string[][] {
  return specs.map((s) =>
    s.type === "main"
      ? [s.factorId]
      : s.type === "power"
        ? [s.factorId, s.factorId]
        : (s as { factorIds: string[] }).factorIds,
  );
}

/** Um principal só pode sair se nenhum quadrático ou interação do mesmo fator permanecer. */
export function breaksHierarchy(term: string[], remaining: string[][]): boolean {
  if (term.length !== 1) return false;
  const id = term[0];
  return remaining.some((t) => t.length === 2 && t.includes(id as string));
}
