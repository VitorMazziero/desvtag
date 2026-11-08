import { PROJECT_FILE_ACCEPT } from "../../lib/projectFileName";
import type { OpenedFile, StorageProvider } from "./StorageProvider";

/** Seleciona um arquivo do computador por um `<input type="file">` criado sob demanda. */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    });
    input.addEventListener("cancel", () => {
      resolve(null);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

/** Baixa `bytes` como arquivo. */
export function downloadBytes(
  bytes: Uint8Array,
  name: string,
  type = "application/octet-stream",
): void {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MIME: Record<string, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  svg: "image/svg+xml",
  png: "image/png",
  html: "text/html;charset=utf-8",
};

function mimeOf(name: string): string {
  return MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export async function readFileBytes(file: File): Promise<OpenedFile> {
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

/** Navegador: abrir por seleção de arquivo; salvar por download. */
export function createBrowserFileProvider(): StorageProvider {
  return {
    kind: "browser",
    overwritesFile: false,
    async open() {
      const file = await pickFile(PROJECT_FILE_ACCEPT);
      return file ? readFileBytes(file) : null;
    },
    async save(bytes, { suggestedName }) {
      downloadBytes(bytes, suggestedName);
      return { name: suggestedName };
    },
    async saveCopy(bytes, suggestedName) {
      downloadBytes(bytes, suggestedName);
      return { name: suggestedName };
    },
    async exportFile(bytes, suggestedName) {
      downloadBytes(bytes, suggestedName, mimeOf(suggestedName));
      return { name: suggestedName };
    },
    async recents() {
      return [];
    },
    async openRecent() {
      throw new Error("Recent projects are not available in the browser");
    },
    async detach() {},
  };
}

export { pickFile };
