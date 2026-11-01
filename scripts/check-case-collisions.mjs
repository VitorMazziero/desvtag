// Falha se dois arquivos versionados diferem apenas por maiúsculas/minúsculas: em Windows e macOS
// (sistemas de arquivos que ignoram a caixa) eles seriam o mesmo arquivo.
import { execSync } from "node:child_process";

const files = execSync("git ls-files", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n")
  .filter(Boolean);
const seen = new Map();
const collisions = [];
for (const file of files) {
  const key = file.toLowerCase();
  const previous = seen.get(key);
  if (previous !== undefined && previous !== file) collisions.push(`${previous}  ≡  ${file}`);
  else seen.set(key, file);
}
if (collisions.length > 0) {
  console.error("Arquivos que diferem apenas pela caixa:\n" + collisions.join("\n"));
  process.exit(1);
}
console.log(`${files.length} arquivos versionados, sem colisões de caixa.`);
