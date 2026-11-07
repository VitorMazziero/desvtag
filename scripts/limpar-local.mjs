#!/usr/bin/env node
// Limpeza de artefatos locais REGENERÁVEIS (compilação, dependências, resíduos de teste).
// Padrão: simulação (nada é apagado). Para apagar, passe --executar.
//
// Uso:
//   node scripts/limpar-local.mjs                  simula o nível 1
//   node scripts/limpar-local.mjs --nivel 2        simula os níveis 1 e 2
//   node scripts/limpar-local.mjs --nivel 3 --executar
//
// Níveis (cumulativos):
//   1  resíduos de teste: relatórios e capturas do Playwright, caches do Vite
//   2  artefatos de build: web/dist, WebAssembly gerado, instaladores e executáveis do Tauri
//   3  caches de compilação e dependências: app/target, src-tauri/target, node_modules
//
// Nunca toca em: código-fonte, .git, examples/, validation/, docs/, referencias/ e na pasta
// ~/.tauri (chaves do atualizador). Tudo o que é apagado é recriado pelos comandos do guia do ambiente.
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Caminhos relativos à raiz, por nível. Lista fechada: nada fora dela é removido. */
const NIVEIS = {
  1: [
    "app/web/test-results",
    "app/web/playwright-report",
    "app/web/.vite",
    "app/web/node_modules/.vite",
    "app/web/node_modules/.cache",
  ],
  2: [
    "app/web/dist",
    "app/web/src/services/engine/wasm",
    "app/desktop/src-tauri/target/release/bundle",
    "app/desktop/src-tauri/target/release/desvtag-desktop.exe",
    "app/target/wasm32-unknown-unknown",
    "app/target/desvtag-wasm",
  ],
  3: ["app/target", "app/desktop/src-tauri/target", "app/web/node_modules"],
};

const args = process.argv.slice(2);
const executar = args.includes("--executar");
const i = args.indexOf("--nivel");
const nivel = i >= 0 ? Number(args[i + 1]) : 1;
if (![1, 2, 3].includes(nivel)) {
  console.error("Use --nivel 1, 2 ou 3.");
  process.exit(2);
}

function tamanho(caminho) {
  const info = statSync(caminho);
  if (!info.isDirectory()) return info.size;
  let total = 0;
  for (const nome of readdirSync(caminho)) {
    try {
      total += tamanho(join(caminho, nome));
    } catch {
      // arquivo removido ou sem permissão durante a contagem
    }
  }
  return total;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const alvos = [];
for (let n = 1; n <= nivel; n++) {
  for (const rel of NIVEIS[n]) {
    const abs = resolve(root, rel);
    // Trava de segurança: o alvo precisa estar DENTRO da raiz do repositório.
    if (relative(root, abs).startsWith("..") || !abs.startsWith(root + sep)) {
      console.error(`Caminho fora do repositório recusado: ${rel}`);
      process.exit(2);
    }
    if (existsSync(abs)) alvos.push({ n, rel, abs, bytes: tamanho(abs) });
  }
}

// Um item dentro de outro já listado não é contado nem apagado duas vezes.
const unicos = alvos.filter((a) => !alvos.some((b) => b !== a && a.abs.startsWith(b.abs + sep)));

let total = 0;
for (const a of unicos) {
  total += a.bytes;
  console.log(`${executar ? "apagando" : "apagaria "} [nível ${a.n}] ${a.rel.padEnd(52)} ${mb(a.bytes).padStart(10)}`);
  if (executar) rmSync(a.abs, { recursive: true, force: true, maxRetries: 3 });
}
console.log(
  `\n${executar ? "Liberado" : "Seria liberado"}: ${mb(total)} (${unicos.length} itens, até o nível ${nivel}).`,
);
if (!executar) console.log("Simulação: nada foi apagado. Acrescente --executar para apagar.");
else if (nivel >= 3) console.log("Para voltar a compilar: npm ci (app/web), npm run build:wasm e os comandos do guia do ambiente.");
