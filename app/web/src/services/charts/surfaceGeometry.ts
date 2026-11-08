// Dados comuns da superfície (U09): a malha vem do motor; aqui há apenas organização para desenhar.
import type { SurfaceGrid } from "../engine";

export interface SurfaceChartSpec {
  id: string;
  title: string;
  description: string;
  grid: SurfaceGrid;
  /** Nome da resposta e unidade (eixo vertical da superfície / legenda das curvas). */
  responseLabel: string;
  /** Pontos do planejamento, na escala real dos dois eixos (projeção). */
  points?: Array<{ x: number; y: number; label?: string; selected?: boolean }>;
  colorDomain?: [number, number];
  /** Textos já localizados. */
  texts: { extrapolated: string; points: string; reading: string };
  metadata?: string;
}

/** Valor definido da malha ou `null`. */
export function valueAt(grid: SurfaceGrid, iy: number, ix: number): number | null {
  const cell = grid.z[iy]?.[ix];
  return cell && cell.status === "defined" ? cell.value : null;
}

/** Menor e maior valores definidos (a malha informa; a reserva evita divisão por zero). */
export function zRange(grid: SurfaceGrid): [number, number] {
  const lo = grid.zMin ?? 0;
  const hi = grid.zMax ?? lo + 1;
  return hi > lo ? [lo, hi] : [lo, lo + 1];
}

/** Padrão hachurado para a região extrapolada (id único por gráfico). */
export function hatch(id: string, color: string): string {
  return (
    `<defs><pattern id="${id}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" ` +
    `patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${color}" stroke-width="1.5"/></pattern></defs>`
  );
}

/** Uma célula é extrapolação se algum dos quatro vértices for (critério conservador). */
export function cellExtrapolated(grid: SurfaceGrid, iy: number, ix: number): boolean {
  return [
    grid.extrapolated[iy]?.[ix],
    grid.extrapolated[iy]?.[ix + 1],
    grid.extrapolated[iy + 1]?.[ix],
    grid.extrapolated[iy + 1]?.[ix + 1],
  ].some(Boolean);
}
