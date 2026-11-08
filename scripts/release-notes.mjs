// Notas de uma versão a partir do CHANGELOG (seção `## [X.Y.Z]`), sem cortar no meio de uma frase.
// Usado pelo manifesto do atualizador e pelo rascunho do release.
//
// Uso: node scripts/release-notes.mjs vX.Y.Z [limite-de-caracteres]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "https://github.com/VitorMazziero/desvtag";

/** Seção da versão no CHANGELOG, sem o título da seção; `null` se não existir. */
export function sectionOf(changelog, version) {
  const escaped = version.replace(/\./g, "\\.");
  const match = new RegExp(`^## \\[${escaped}\\][^\\n]*\\r?\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m").exec(
    changelog,
  );
  const text = match?.[1]?.replace(/\r\n/g, "\n").trim();
  return text ? text : null;
}

/**
 * Corta no último limite de bloco (linha em branco) antes de `limit`; se o primeiro bloco já passa do
 * limite, corta no último fim de frase. Acrescenta a indicação de que há mais no CHANGELOG.
 */
export function truncateAtBlock(text, limit, moreUrl) {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  let cut = head.lastIndexOf("\n\n");
  if (cut < limit / 4) {
    const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf(".\n"));
    cut = sentence > 0 ? sentence + 1 : head.lastIndexOf(" ");
  }
  const kept = head.slice(0, cut > 0 ? cut : limit).trimEnd();
  return `${kept}\n\n…[o texto completo está no CHANGELOG](${moreUrl})`;
}

export function notesFor(changelog, version, limit = 4000) {
  const section = sectionOf(changelog, version);
  if (section === null) return `DesvTAG ${version} (canal experimental).`;
  // Links relativos do repositório viram links absolutos da etiqueta (o aplicativo e o GitHub os abrem).
  const absolute = section.replace(
    /\]\((?!https?:|#|mailto:)([^)\s]+)\)/g,
    (_, path) => `](${REPO}/blob/v${version}/${path})`,
  );
  return truncateAtBlock(absolute, limit, `${REPO}/blob/v${version}/CHANGELOG.md`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tag = process.argv[2] ?? "";
  if (!/^v\d+\.\d+\.\d+/.test(tag)) {
    console.error("Uso: node scripts/release-notes.mjs vX.Y.Z [limite]");
    process.exit(2);
  }
  const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  process.stdout.write(`${notesFor(changelog, tag.slice(1), Number(process.argv[3] ?? 60000))}\n`);
}
