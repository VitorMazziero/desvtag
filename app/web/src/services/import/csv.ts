// Leitura de CSV/TSV em uma grade de TEXTO (U05). Não interpreta números: isso ocorre depois,
// com as regras de entrada da grade (vazio = ausente; um separador decimal; sem milhar).

export type Delimiter = "," | ";" | "\t" | "|";
export const DELIMITERS: Delimiter[] = [";", ",", "\t", "|"];
export type TextEncodingName = "utf-8" | "windows-1252";

/** Limite de tamanho aceito na importação de texto (proteção de memória). */
export const MAX_TEXT_BYTES = 50 * 1024 * 1024;

export interface DecodedText {
  text: string;
  encoding: TextEncodingName;
  /** `true` quando o arquivo não era UTF-8 válido e foi lido como Windows-1252. */
  fellBack: boolean;
}

/** Decodifica bytes; `auto` tenta UTF-8 estrito e, se falhar, usa Windows-1252 (acentos do Excel antigo). */
export function decodeText(
  bytes: Uint8Array,
  encoding: TextEncodingName | "auto" = "auto",
): DecodedText {
  const strip = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
  if (encoding === "windows-1252") {
    return {
      text: strip(new TextDecoder("windows-1252").decode(bytes)),
      encoding,
      fellBack: false,
    };
  }
  try {
    return {
      text: strip(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      encoding: "utf-8",
      fellBack: false,
    };
  } catch {
    if (encoding === "utf-8") throw new Error("invalid-utf8");
    return {
      text: strip(new TextDecoder("windows-1252").decode(bytes)),
      encoding: "windows-1252",
      fellBack: true,
    };
  }
}

/** Escolhe o separador mais consistente nas primeiras linhas (fora de aspas). */
export function detectDelimiter(text: string): Delimiter {
  const sample = text
    .split(/\r\n|\n|\r/)
    .slice(0, 20)
    .filter((l) => l.trim() !== "");
  let best: Delimiter = ";";
  let bestScore = -1;
  for (const delimiter of DELIMITERS) {
    const counts = sample.map((line) => {
      let inQuotes = false;
      let n = 0;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === delimiter && !inQuotes) n += 1;
      }
      return n;
    });
    const first = counts[0] ?? 0;
    if (first === 0) continue;
    const consistent = counts.filter((n) => n === first).length;
    const score = consistent * 1000 + first;
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

/** CSV conforme RFC 4180: aspas duplas, aspas escapadas (`""`), quebras de linha dentro de aspas. */
export function parseCsv(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === delimiter) endField();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (text.charAt(i + 1) === "\n") i += 1;
      endRow();
    } else field += ch;
  }
  if (field !== "" || row.length > 0) endRow();
  // Uma linha final vazia (arquivo terminado em quebra de linha) não é uma linha de dados.
  while (rows.length > 0 && rows[rows.length - 1]?.every((c) => c === "")) rows.pop();
  return rows;
}
