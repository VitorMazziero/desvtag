// CSV da matriz de ensaios (U16): ordem de execução, ordem padrão, tipo, repetição, níveis reais e codificados.
import type { GeneratedDesign } from "../../services/engine";
import { type Cell, toCsv } from "../../services/export";

export function matrixTable(
  design: GeneratedDesign,
  metadata: Record<string, string>,
  /** Colunas de resposta a preencher (planilha de coleta, ET13). */
  collection?: { header: string[]; cells: Cell[][] },
): { header: string[]; rows: Cell[][]; meta: Record<string, string> } {
  const names = design.spec.factors.map((f) => f.name);
  const header = [
    "run",
    "standard_order",
    "point",
    "replicate",
    ...names,
    ...names.map((n) => `${n} (coded)`),
    ...(collection?.header ?? []),
  ];
  const rows: Cell[][] = design.runs.map((r, i) => [
    r.run,
    r.standardOrder,
    r.point,
    r.replicate,
    ...r.real,
    ...r.coded,
    ...(collection?.cells[i] ?? []),
  ]);
  const kind =
    design.spec.kind.type === "fractional"
      ? `fractional (${design.spec.kind.generators.join(", ")})`
      : design.spec.kind.type === "plackettBurman"
        ? `plackett-burman (${design.spec.kind.runs} runs)`
        : design.spec.kind.type === "centralComposite"
          ? `central composite (alpha ${design.axialDistance ?? ""}${design.spec.kind.inscribed ? ", inscribed" : ""})`
          : design.spec.kind.type === "boxBehnken"
            ? "box-behnken"
            : "full factorial";
  const meta = {
    ...metadata,
    method: `${design.provenance.methodId} v${design.provenance.methodVersion}`,
    engine: design.provenance.engineVersion,
    design: kind,
    resolution: design.resolution === null ? "none" : String(design.resolution),
    replicates: String(design.spec.replicates),
    center_points: String(design.spec.centerPoints),
    randomized: String(design.spec.randomize),
    seed: String(design.spec.seed),
    randomization: design.randomizationAlgorithm,
  };
  return { header, rows, meta };
}

export function matrixCsv(design: GeneratedDesign, metadata: Record<string, string>): string {
  const { header, rows, meta } = matrixTable(design, metadata);
  return toCsv(header, rows, meta);
}
