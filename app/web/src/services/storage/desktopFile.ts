import { invoke } from "@tauri-apps/api/core";
import { base64ToBytes, bytesToBase64 } from "./bytes";
import type { OpenedFile, RecentItem, StorageProvider } from "./StorageProvider";

interface RawOpened {
  name: string;
  bytesBase64: string;
}

const toOpened = (raw: RawOpened): OpenedFile => ({
  name: raw.name,
  bytes: base64ToBytes(raw.bytesBase64),
});

/**
 * Windows: diálogos nativos e gravação segura no Rust. O caminho nunca passa pela interface;
 * ela só recebe o nome do arquivo.
 */
export function createDesktopFileProvider(): StorageProvider {
  return {
    kind: "desktop",
    overwritesFile: true,
    async open() {
      const raw = await invoke<RawOpened | null>("project_open");
      return raw ? toOpened(raw) : null;
    },
    save(bytes, { saveAs, suggestedName }) {
      return invoke<{ name: string } | null>("project_save", {
        bytesBase64: bytesToBase64(bytes),
        saveAs,
        suggestedName,
      });
    },
    saveCopy(bytes, suggestedName) {
      return invoke<{ name: string } | null>("project_save_copy", {
        bytesBase64: bytesToBase64(bytes),
        suggestedName,
      });
    },
    recents() {
      return invoke<RecentItem[]>("project_recent");
    },
    async openRecent(index) {
      return toOpened(await invoke<RawOpened>("project_open_recent", { index }));
    },
    async detach() {
      await invoke("project_detach");
    },
  };
}
