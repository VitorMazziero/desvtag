// CSV de tabelas (U16): UTF-8 com BOM (o Excel reconhece os acentos), vírgula como separador,
// ponto decimal e números com todos os algarismos que os reproduzem. As linhas iniciais com `#`
// registram método, configuração, revisão e versões; leitores como pandas as ignoram com
// `comment="#"`.

export type Cell = string | number | null;

function quote(cell: Cell): string {
  if (cell === null) return "";
  const text = typeof cell === "number" ? String(cell) : cell;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Monta o texto do CSV: metadados (`# chave: valor`), linha em branco e a tabela. */
export function toCsv(header: string[], rows: Cell[][], metadata: Record<string, string>): string {
  const meta = Object.entries(metadata).map(
    ([key, value]) => `# ${key}: ${value.replace(/[\r\n]+/g, " ")}`,
  );
  const table = [header, ...rows].map((row) => row.map(quote).join(","));
  return `﻿${[...meta, "", ...table].join("\r\n")}\r\n`;
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
