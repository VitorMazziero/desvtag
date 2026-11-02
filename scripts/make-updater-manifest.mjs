#!/usr/bin/env node
// Gera o manifesto `latest.json` do atualizador do Tauri (canal experimental) a partir do instalador
// NSIS assinado. A assinatura (`.sig`) é produzida pelo `tauri build` com a chave privada, que fica
// somente em segredo do GitHub; aqui só se lê o arquivo de assinatura.
//
// Uso: node scripts/make-updater-manifest.mjs <instalador.exe> <instalador.exe.sig> <saida/latest.json> [tag]
// A etiqueta (`v0.1.0`) vem do 4.º argumento ou de GITHUB_REF_NAME.
import { notesFor } from "./release-notes.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const [installer, signaturePath, output, tagArg] = process.argv.slice(2);
if (!installer || !signaturePath || !output) {
  console.error("uso: make-updater-manifest.mjs <instalador> <assinatura> <saida> [tag]");
  process.exit(2);
}
const tag = tagArg ?? process.env.GITHUB_REF_NAME ?? "";
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  console.error(`etiqueta inválida: "${tag}" (esperado vX.Y.Z)`);
  process.exit(2);
}
const version = tag.slice(1);
const repo = process.env.GITHUB_REPOSITORY ?? "VitorMazziero/enzitag-optima";
const signature = readFileSync(signaturePath, "utf8").trim();
if (signature === "") {
  console.error("assinatura vazia");
  process.exit(2);
}

// Notas: só a seção da versão no CHANGELOG (cortada em limite de bloco, não no meio de uma frase);
// sem seção, uma frase padrão.
let notes = `EnziTAG Optima ${version} (canal experimental).`;
try {
  const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  notes = notesFor(changelog, version, 4000);
} catch {
  // sem CHANGELOG legível: mantém a frase padrão
}

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(basename(installer))}`,
    },
  },
};
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Manifesto gravado em ${output} para ${tag}`);
