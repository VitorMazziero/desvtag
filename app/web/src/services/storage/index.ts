import { isTauri } from "../engine";
import { createBrowserFileProvider } from "./browserFile";
import { createDesktopFileProvider } from "./desktopFile";
import type { StorageProvider } from "./StorageProvider";

export { base64ToBytes, bytesToBase64 } from "./bytes";
export type { OpenedFile, RecentItem, SaveOptions, StorageProvider } from "./StorageProvider";

export function createDefaultStorageProvider(): StorageProvider {
  return isTauri() ? createDesktopFileProvider() : createBrowserFileProvider();
}
