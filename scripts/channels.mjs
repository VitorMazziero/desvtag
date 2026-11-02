#!/usr/bin/env node
// Canais de atualização (ET20): decide em quais canais uma versão publicada entra.
//   experimental: toda versão publicada (a série 0.x só existe aqui);
//   stable: somente versões ≥ 1.0.0 sem sufixo de pré-lançamento e que não estejam marcadas como
//   pré-lançamento no GitHub.
// Uso: node scripts/channels.mjs <etiqueta> <true|false (pré-lançamento)>  → imprime os canais, um por linha.
import { pathToFileURL } from "node:url";

const TAG = /^v(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/;

/** Canais que recebem a versão `tag`; lança erro para etiqueta inválida. */
export function channelsFor(tag, prerelease) {
  const m = TAG.exec(tag);
  if (!m) throw new Error(`etiqueta inválida: "${tag}" (esperado vX.Y.Z)`);
  const stable = Number(m[1]) >= 1 && m[4] === undefined && !prerelease;
  return stable ? ["experimental", "stable"] : ["experimental"];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [tag, prerelease] = process.argv.slice(2);
  try {
    for (const channel of channelsFor(tag ?? "", prerelease === "true")) console.log(channel);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
