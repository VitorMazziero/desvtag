// Compila optima-wasm para WebAssembly e gera a cola JS em src/services/engine/wasm/.
// Requer: alvo wasm32-unknown-unknown e wasm-bindgen-cli na MESMA versão da crate
// `wasm-bindgen` do Cargo.lock (DT-0003).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../..");
const outDir = resolve(here, "../src/services/engine/wasm");
const release = !process.argv.includes("--dev");

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    console.error(`Falha: ${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

const lock = readFileSync(join(appDir, "Cargo.lock"), "utf8");
const locked = /name = "wasm-bindgen"\nversion = "([^"]+)"/.exec(lock)?.[1];
const cli = spawnSync("wasm-bindgen", ["--version"], { encoding: "utf8" });
if (cli.status !== 0) {
  console.error(
    "wasm-bindgen-cli não encontrado. Instale: cargo install wasm-bindgen-cli --version " +
      locked +
      " --locked",
  );
  process.exit(1);
}
const installed = cli.stdout.trim().split(" ")[1];
if (installed !== locked) {
  console.error(
    `wasm-bindgen-cli ${installed} difere da crate wasm-bindgen ${locked} do Cargo.lock.`,
  );
  process.exit(1);
}

const profile = release ? "release" : "debug";
run(
  "cargo",
  [
    "build",
    "-p",
    "optima-wasm",
    "--target",
    "wasm32-unknown-unknown",
    ...(release ? ["--release"] : []),
  ],
  { cwd: appDir },
);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
run("wasm-bindgen", [
  join(appDir, "target/wasm32-unknown-unknown", profile, "optima_wasm.wasm"),
  "--target",
  "web",
  "--out-dir",
  outDir,
  "--out-name",
  "optima_wasm",
  "--typescript",
]);
console.log(`WASM (${profile}) gerado em ${outDir}`);
