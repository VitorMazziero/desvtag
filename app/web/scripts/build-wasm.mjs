// Compila desvtag-wasm para WebAssembly e gera a cola JS em src/services/engine/wasm/.
// Requer: alvo wasm32-unknown-unknown e wasm-bindgen-cli na MESMA versão da crate
// `wasm-bindgen` do Cargo.lock (DT-0003).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const locked = /name = "wasm-bindgen"\r?\nversion = "([^"]+)"/.exec(lock)?.[1];
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

// O diretório de compilação pode estar fora do repositório (`build.target-dir` ou CARGO_TARGET_DIR);
// o Cargo informa o caminho real.
const meta = spawnSync("cargo", ["metadata", "--no-deps", "--format-version", "1"], {
  cwd: appDir,
  encoding: "utf8",
  maxBuffer: 1 << 26,
});
if (meta.status !== 0) {
  console.error("Falha: cargo metadata");
  process.exit(meta.status ?? 1);
}
const metadata = JSON.parse(meta.stdout);
const version = metadata.packages.find((pkg) => pkg.name === "desvtag-wasm")?.version;
if (!version) {
  console.error("O workspace não informou a versão do pacote desvtag-wasm.");
  process.exit(1);
}
// O arquivo final do Cargo tem nome fixo. Separe-o entre worktrees e versões
// mesmo quando os checkouts usam o mesmo diretório externo de compilação.
const checkout = createHash("sha256")
  .update(`${metadata.workspace_root}\n${version}`)
  .digest("hex")
  .slice(0, 16);
const targetDir = join(metadata.target_directory, "desvtag-wasm", checkout);
run(
  "cargo",
  [
    "build",
    "-p",
    "desvtag-wasm",
    "--locked",
    "--target-dir",
    targetDir,
    "--target",
    "wasm32-unknown-unknown",
    ...(release ? ["--release"] : []),
  ],
  { cwd: appDir },
);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
run("wasm-bindgen", [
  join(targetDir, "wasm32-unknown-unknown", profile, "desvtag_wasm.wasm"),
  "--target",
  "web",
  "--out-dir",
  outDir,
  "--out-name",
  "desvtag_wasm",
  "--typescript",
]);
console.log(`WASM (${profile}) gerado em ${outDir}`);
