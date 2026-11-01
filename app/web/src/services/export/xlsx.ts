// Tabelas em XLSX (U16): o arquivo é escrito pelo motor (Rust); aqui só se monta a pasta de
// trabalho (a tabela e uma planilha "Proveniência" com método, configuração, revisão e versões).
import type { EngineClient, ExportCell, ExportWorkbook } from "../engine";
import type { Cell } from "./csv";

function cellOf(cell: Cell): ExportCell {
  return cell === null ? null : cell;
}

/** Nome de planilha válido no Excel: até 31 caracteres, sem `[]:*?/\`. */
export function sheetName(text: string): string {
  const cleaned = text
    .replace(/[[\]:*?/\\]/g, " ")
    .replace(/^'+|'+$/g, "")
    .trim();
  return (cleaned || "Tabela").slice(0, 31);
}

export function buildWorkbook(
  name: string,
  header: string[],
  rows: Cell[][],
  metadata: Record<string, string>,
  provenanceName: string,
): ExportWorkbook {
  const main = sheetName(name);
  const sheets: ExportWorkbook["sheets"] = [
    { name: main, rows: [header, ...rows.map((r) => r.map(cellOf))] },
  ];
  const entries = Object.entries(metadata);
  if (entries.length > 0) {
    const prov = sheetName(provenanceName);
    sheets.push({
      name: prov.toLowerCase() === main.toLowerCase() ? `${prov} 2`.slice(0, 31) : prov,
      rows: entries.map(([key, value]) => [key, value]),
    });
  }
  return { sheets };
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Pede ao motor o arquivo XLSX; recusas do motor viram erro. */
export async function writeXlsx(client: EngineClient, book: ExportWorkbook): Promise<Uint8Array> {
  const response = await client.request(
    { type: "exportXlsx", ...book },
    { channel: "export-xlsx" },
  );
  if (response.outcome.status !== "ok" || response.outcome.result.type !== "exportXlsx")
    throw new Error("xlsx export refused");
  return fromBase64(response.outcome.result.bytesBase64);
}
