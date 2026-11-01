// Gera src/services/engine/contracts.generated.ts a partir dos tipos Rust (ts-rs).
// Uso: node scripts/gen-contracts.mjs [--check]
//   --check: falha (código 1) se o arquivo versionado estiver desatualizado.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../..");
const bindings = join(appDir, "target", "ts-bindings");
const output = resolve(here, "../src/services/engine/contracts.generated.ts");
const check = process.argv.includes("--check");

rmSync(bindings, { recursive: true, force: true });
const run = spawnSync("cargo", ["test", "--workspace", "export_bindings"], {
  cwd: appDir,
  stdio: ["ignore", "inherit", "inherit"],
  env: process.env,
});
if (run.status !== 0) {
  console.error("Falha ao gerar os tipos com `cargo test export_bindings`.");
  process.exit(run.status ?? 1);
}

const requestSource = readFileSync(join(appDir, "crates/optima-engine/src/request.rs"), "utf8");
const protocol = /pub const PROTOCOL_VERSION: u32 = (\d+);/.exec(requestSource);
const projectSource = readFileSync(join(appDir, "crates/optima-project/src/document.rs"), "utf8");
const schema = /pub const SCHEMA_VERSION: u32 = (\d+);/.exec(projectSource);
if (!protocol || !schema) {
  console.error("Não foi possível ler PROTOCOL_VERSION/SCHEMA_VERSION do código Rust.");
  process.exit(1);
}

const files = readdirSync(bindings)
  .filter((name) => name.endsWith(".ts"))
  .sort();
const parts = files.map((name) => {
  const text = readFileSync(join(bindings, name), "utf8").replace(/\r\n/g, "\n");
  return text
    .split("\n")
    .filter(
      (line) => !line.startsWith("// This file was generated") && !line.startsWith("import type"),
    )
    .join("\n")
    .trim();
});

const content = `// GERADO por scripts/gen-contracts.mjs a partir dos tipos Rust (ts-rs).
// NÃO EDITAR. Regenerar com \`npm run gen:contracts\`.

/** Versão do protocolo interface↔motor (optima-engine). */
export const PROTOCOL_VERSION = ${protocol[1]};

/** Versão do esquema do documento do projeto (optima-project). */
export const PROJECT_SCHEMA_VERSION = ${schema[1]};

${parts.join("\n\n")}
`;

if (check) {
  const current = existsSync(output) ? readFileSync(output, "utf8").replace(/\r\n/g, "\n") : "";
  if (current !== content) {
    console.error(
      "contracts.generated.ts está desatualizado. Execute `npm run gen:contracts` e inclua o resultado no commit.",
    );
    process.exit(1);
  }
  console.log("contracts.generated.ts está atualizado.");
} else {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, content);
  console.log(`Gerado ${output} (${files.length} tipos).`);
}
