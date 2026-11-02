// Notas de versão em Markdown simples → blocos tipados. Só texto: nunca HTML, nunca recursos
// externos. A interface os desenha com elementos do React (sem `dangerouslySetInnerHTML`).

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "heading"; level: 3 | 4 | 5; inlines: Inline[] }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "quote"; inlines: Inline[] }
  | { type: "list"; items: Inline[][] }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] };

const INLINE = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;

/** Só endereços https viram links (o resto fica como texto). */
function safeHref(href: string): string | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: "text", text: text.slice(last, index) });
    if (match[2] !== undefined) out.push({ type: "bold", text: match[2] });
    else if (match[3] !== undefined) out.push({ type: "code", text: match[3] });
    else {
      const href = safeHref(match[5] ?? "");
      out.push(
        href
          ? { type: "link", text: match[4] ?? "", href }
          : { type: "text", text: match[4] ?? "" },
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

const isRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isSeparator = (line: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

export function parseNotes(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || /^-{3,}$/.test(line.trim())) {
      i += 1;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(5, Math.max(3, (heading[1] ?? "###").length)) as 3 | 4 | 5;
      blocks.push({ type: "heading", level, inlines: parseInline(heading[2] ?? "") });
      i += 1;
    } else if (isRow(line) && isSeparator(lines[i + 1] ?? "")) {
      const header = cells(line).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && isRow(lines[i] ?? "")) {
        rows.push(cells(lines[i] ?? "").map(parseInline));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        let text = (lines[i] ?? "").replace(/^\s*[-*]\s+/, "");
        i += 1;
        // continuação indentada do mesmo item
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i] ?? "") &&
          !/^\s*[-*]\s+/.test(lines[i] ?? "")
        ) {
          text += ` ${(lines[i] ?? "").trim()}`;
          i += 1;
        }
        items.push(parseInline(text));
      }
      blocks.push({ type: "list", items });
    } else if (line.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) {
        parts.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", inlines: parseInline(parts.join(" ")) });
    } else {
      const parts: string[] = [];
      while (
        i < lines.length &&
        (lines[i] ?? "").trim() !== "" &&
        !/^(#{1,6}\s|\s*[-*]\s+|>)/.test(lines[i] ?? "") &&
        !isRow(lines[i] ?? "")
      ) {
        parts.push((lines[i] ?? "").trim());
        i += 1;
      }
      if (parts.length === 0) {
        i += 1;
      } else {
        blocks.push({ type: "paragraph", inlines: parseInline(parts.join(" ")) });
      }
    }
  }
  return blocks;
}
