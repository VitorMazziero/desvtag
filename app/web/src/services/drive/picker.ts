import { GOOGLE_PICKER_API_KEY, GOOGLE_PROJECT_NUMBER } from "./config";
import { DriveError, type PickedFile } from "./types";

const GAPI_URL = "https://apis.google.com/js/api.js";

export type ScriptLoader = (url: string) => Promise<void>;

export const loadScript: ScriptLoader = (url) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new DriveError("network"));
    };
    document.head.append(script);
  });

interface PickerView {
  setIncludeFolders(include: boolean): PickerView;
  setMode(mode: string): PickerView;
}
interface PickerBuilder {
  addView(view: PickerView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(id: string): PickerBuilder;
  setOrigin(origin: string): PickerBuilder;
  setCallback(callback: (data: Record<string, unknown>) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}
interface PickerApi {
  DocsView: new (id: string) => PickerView;
  PickerBuilder: new () => PickerBuilder;
  ViewId: { DOCS: string };
  DocsViewMode: { LIST: string };
  Response: { ACTION: string; DOCUMENTS: string };
  Action: { PICKED: string; CANCEL: string };
  Document: { ID: string; NAME: string };
}

export async function pickDriveFile(token: string): Promise<PickedFile | null> {
  await loadScript(GAPI_URL);
  const gapi = (globalThis as unknown as { gapi?: { load(name: string, done: () => void): void } })
    .gapi;
  if (!gapi) throw new DriveError("network");
  await new Promise<void>((resolve) => gapi.load("picker", resolve));
  const picker = (globalThis as unknown as { google?: { picker?: PickerApi } }).google?.picker;
  if (!picker) throw new DriveError("network");
  return new Promise<PickedFile | null>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setMode(picker.DocsViewMode.LIST);
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_PICKER_API_KEY)
      .setAppId(GOOGLE_PROJECT_NUMBER)
      .setOrigin(window.location.origin)
      .setCallback((data) => {
        if (data[picker.Response.ACTION] === picker.Action.PICKED) {
          const doc = (
            data[picker.Response.DOCUMENTS] as Record<string, unknown>[] | undefined
          )?.[0];
          if (!doc || typeof doc[picker.Document.ID] !== "string") {
            resolve(null);
            return;
          }
          resolve({
            id: String(doc[picker.Document.ID]),
            name: String(doc[picker.Document.NAME]),
          });
        } else if (data[picker.Response.ACTION] === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build()
      .setVisible(true);
  });
}
