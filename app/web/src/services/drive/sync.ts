// Sincronização de um projeto com o Drive (U14): salvar sem perder alterações de outra pessoa ou de
// outra cópia do aplicativo. A API não oferece bloqueio nem transação, então **nada é prometido além
// do que se verifica**: antes de gravar, compara-se a versão do arquivo com a da última leitura. Se
// mudou, o arquivo remoto **não é sobrescrito**: o conteúdo local vai para uma cópia ao lado.
import type { DriveClient } from "./client";
import { DriveError, type DriveFileInfo, type DriveLink, type SaveOutcome } from "./types";

/** Data compacta para nomes de cópia: `2026-11-02 10h35`. */
function stamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}h${p(now.getMinutes())}`;
}

export function conflictCopyName(name: string, now: Date): string {
  const dot = name.lastIndexOf(".");
  const [base, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  return `${base} (cópia local ${stamp(now)})${extension}`;
}

/** Abre um arquivo do Drive: devolve os bytes e a ligação (nome e versão lidos agora). */
export async function openFromDrive(
  client: DriveClient,
  fileId: string,
): Promise<{ bytes: Uint8Array; link: DriveLink }> {
  const info = await client.metadata(fileId);
  const bytes = await client.download(fileId);
  return { bytes, link: { fileId: info.id, name: info.name, version: info.version } };
}

/**
 * Salva `bytes` no Drive. Sem ligação: cria o arquivo na pasta «EnziTAG Optima». Com ligação:
 * atualiza se a versão remota ainda é a que lemos; senão, grava uma cópia e devolve o conflito.
 */
export async function saveToDrive(
  client: DriveClient,
  bytes: Uint8Array,
  name: string,
  link: DriveLink | null,
  now: Date = new Date(),
): Promise<SaveOutcome> {
  if (link === null) {
    const folderId = await client.ensureFolder();
    const info = await client.upload(name, bytes, { folderId });
    return {
      kind: "saved",
      created: true,
      link: { fileId: info.id, name: info.name, version: info.version },
    };
  }
  let remote: DriveFileInfo;
  try {
    remote = await client.metadata(link.fileId);
  } catch (error) {
    // Arquivo apagado ou fora do alcance: não se perde o trabalho local, cria-se um novo.
    if (error instanceof DriveError && error.code === "notFound") {
      const folderId = await client.ensureFolder();
      const info = await client.upload(name, bytes, { folderId });
      return {
        kind: "saved",
        created: true,
        link: { fileId: info.id, name: info.name, version: info.version },
      };
    }
    throw error;
  }
  if (remote.version !== link.version) {
    const folderId = await client.ensureFolder();
    const copy = await client.upload(conflictCopyName(name, now), bytes, { folderId });
    return { kind: "conflict", remote, copy };
  }
  const info = await client.upload(name, bytes, { fileId: link.fileId });
  return {
    kind: "saved",
    created: false,
    link: { fileId: info.id, name: info.name, version: info.version },
  };
}
