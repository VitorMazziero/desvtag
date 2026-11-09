// Catálogo dos exemplos distribuíveis (pasta `examples/` do repositório). Cada projeto é empacotado
// como recurso estático (`no-inline`: o CSP do aplicativo para Windows não permite `fetch` de
// `data:`) e só é baixado quando a pessoa escolhe abri-lo. O exemplo 05 (dados reais
// do grupo, PD-16) não é distribuído e fica de fora.

import { EXAMPLE_IDS, type ExampleId } from "./ids";

const urls = import.meta.glob<string>(
  ["../../../../../examples/*/*.enzitag", "!../../../../../examples/05-kLa/*"],
  { query: "?url&no-inline", import: "default", eager: true },
);

export interface ExampleEntry {
  id: ExampleId;
  /** Nome do arquivo do projeto (sem a pasta). */
  fileName: string;
  url: string;
}

/** Exemplos disponíveis nesta compilação, na ordem do catálogo. */
export function availableExamples(): ExampleEntry[] {
  const entries: ExampleEntry[] = [];
  for (const id of EXAMPLE_IDS) {
    const key = Object.keys(urls).find((path) => path.split("/").at(-2)?.startsWith(`${id}-`));
    const url = key ? urls[key] : undefined;
    if (key && url) entries.push({ id, fileName: key.split("/").at(-1) ?? `${id}.enzitag`, url });
  }
  return entries;
}
