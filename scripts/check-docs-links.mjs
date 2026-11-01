// Verifica links relativos e âncoras em todos os arquivos .md versionados.
// Uso: node scripts/check-docs-links.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((f) => !f.includes("node_modules/"));

const strip = (text) => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");

const anchorsCache = new Map();
function anchors(path) {
  if (!anchorsCache.has(path)) {
    const text = readFileSync(join(root, path), "utf8").replace(/```[\s\S]*?```/g, "");
    anchorsCache.set(path, new Set([...text.matchAll(/^#+\s+(.*)$/gm)].map((m) => slug(m[1]))));
  }
  return anchorsCache.get(path);
}

let links = 0;
const problems = [];
for (const file of files) {
  const text = strip(readFileSync(join(root, file), "utf8"));
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    links += 1;
    const [path, fragment] = target.split("#");
    const resolved = path ? posix.normalize(posix.join(dirname(file).replaceAll("\\", "/"), path)) : file;
    if (!existsSync(join(root, normalize(resolved)))) {
      problems.push(`${file}: arquivo inexistente -> ${target}`);
    } else if (fragment && resolved.endsWith(".md") && !anchors(resolved).has(fragment)) {
      problems.push(`${file}: âncora inexistente -> ${target}`);
    }
  }
}
console.log(`${files.length} arquivos .md, ${links} links relativos verificados.`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
