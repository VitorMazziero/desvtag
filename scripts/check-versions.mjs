// Garante que a versão do aplicativo é a mesma no workspace Rust, no pacote web,
// no pacote Tauri e na configuração do Tauri (DT-0002).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const found = {
  "app/Cargo.toml [workspace.package]": /\[workspace\.package\][^[]*?version = "([^"]+)"/s.exec(read("app/Cargo.toml"))?.[1],
  "app/web/package.json": JSON.parse(read("app/web/package.json")).version,
  "app/desktop/src-tauri/Cargo.toml": /^version = "([^"]+)"/m.exec(read("app/desktop/src-tauri/Cargo.toml"))?.[1],
  "app/desktop/src-tauri/tauri.conf.json": JSON.parse(read("app/desktop/src-tauri/tauri.conf.json")).version,
};
const versions = new Set(Object.values(found));
console.table(found);
if (versions.size !== 1 || versions.has(undefined)) {
  console.error("As versões não coincidem.");
  process.exit(1);
}
console.log(`Versão única: ${[...versions][0]}`);
