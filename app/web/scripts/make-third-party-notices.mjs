// Gera `public/THIRD_PARTY_NOTICES.txt`: avisos de licença de terceiros distribuídos com o aplicativo
// (dependências de produção do npm, fontes OFL-1.1 e crates Rust do motor WASM e do aplicativo
// Windows). Uso: `node scripts/make-third-party-notices.mjs` (a partir de `app/web`, com `cargo` e
// `node_modules` disponíveis). A saída é determinística (ordem alfabética).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const lines = [];
const add = (...x) => lines.push(...x);

add("EnziTAG Optima — avisos de software de terceiros", "");
add("O aplicativo (MIT) inclui os componentes abaixo, sob as licenças indicadas.", "");

add("== Pacotes npm de produção ==", "");
const prod = Object.entries(lock.packages)
  .filter(([path, p]) => path && !p.dev && !p.devOptional && !path.includes("/node_modules/"))
  .map(([path, p]) => ({ name: path.replace("node_modules/", ""), ...p }))
  .sort((a, b) => a.name.localeCompare(b.name));
for (const p of prod) {
  const file = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license"]
    .map((f) => resolve("node_modules", p.name, f))
    .find(existsSync);
  const copyright = file
    ? (
        readFileSync(file, "utf8")
          .split("\n")
          .find((l) => /copyright|\(c\)/i.test(l)) ?? ""
      ).trim()
    : "";
  // Pacotes sem o campo `license` no `package.json` (ex.: png-js) declaram a licença no arquivo.
  const license =
    p.license ??
    (file && /^MIT License/i.test(readFileSync(file, "utf8")) ? "MIT (arquivo LICENSE)" : "ver LICENSE");
  add(`${p.name} ${p.version} — ${license}${copyright ? ` — ${copyright}` : ""}`);
}
add("");

add("== Fontes (SIL Open Font License 1.1) ==", "");
const fonts = prod.filter((p) => p.name.startsWith("@fontsource/"));
for (const f of fonts) {
  const text = readFileSync(resolve("node_modules", f.name, "LICENSE"), "utf8");
  add(`-- ${f.name} ${f.version}`, text.split("\n").slice(0, 2).join("\n").trim(), "");
}
const ofl = readFileSync(resolve("node_modules/@fontsource/geist-sans/LICENSE"), "utf8");
add("Texto da licença (comum a todas as fontes acima):", "", ofl.trim(), "");

// A Roboto vai dentro dos PDFs (pacote `pdfmake/build/vfs_fonts`); a licença está gravada na fonte.
add("== Fonte embutida nos PDFs (SIL Open Font License 1.1) ==", "");
add(
  "-- Roboto 3.014 (via pdfmake)",
  "Copyright 2011 The Roboto Project Authors (https://github.com/googlefonts/roboto-classic)",
  "Roboto é marca registrada da Google. Licença: SIL Open Font License 1.1 (texto acima).",
  "",
);

function crates(manifest) {
  const out = JSON.parse(
    execFileSync(
      "cargo",
      ["metadata", "--format-version", "1", "--locked", "--offline", "--manifest-path", manifest],
      {
        encoding: "utf8",
        maxBuffer: 1 << 28,
      },
    ),
  );
  return out.packages
    .filter((p) => p.source !== null)
    .map((p) => `${p.name} ${p.version} — ${p.license ?? "ver o repositório do crate"}`);
}
add("== Crates Rust do motor (WebAssembly) ==", "");
add(...[...new Set(crates("../Cargo.toml"))].sort(), "");
add("== Crates Rust do aplicativo Windows (Tauri) ==", "");
add(...[...new Set(crates("../desktop/src-tauri/Cargo.toml"))].sort(), "");
add(
  "Os textos completos das licenças MIT, Apache-2.0, MPL-2.0, BSD, ISC, Zlib e Unicode-3.0 aplicáveis",
  "acompanham o código-fonte de cada componente em seu repositório público.",
);

writeFileSync("public/THIRD_PARTY_NOTICES.txt", `${lines.join("\n")}\n`);
console.log(`public/THIRD_PARTY_NOTICES.txt: ${prod.length} pacotes npm, ${fonts.length} fontes`);
