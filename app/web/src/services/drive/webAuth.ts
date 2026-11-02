// Autorização do Google Drive na versão web (U14): Google Identity Services (fluxo de token, sem
// segredo) e o Google Picker para abrir arquivos. Os scripts do Google **só são carregados quando o
// usuário pede para conectar** (o aplicativo não faz nenhuma requisição externa antes disso). O token
// fica na memória da página, nunca no armazenamento, e expira em cerca de uma hora: depois, um novo
// pedido (que o navegador pode exibir como janela do Google) renova a autorização.
import {
  DRIVE_SCOPE,
  GOOGLE_PICKER_API_KEY,
  GOOGLE_PROJECT_NUMBER,
  GOOGLE_WEB_CLIENT_ID,
} from "./config";
import { type DriveAuth, DriveError, type PickedFile } from "./types";

const GIS_URL = "https://accounts.google.com/gsi/client";
const GAPI_URL = "https://apis.google.com/js/api.js";
/** Folga antes do vencimento para pedir um token novo. */
const EXPIRY_MARGIN_MS = 60_000;

interface TokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
}
interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
  picker?: Record<string, unknown>;
}

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
    script.onerror = () => reject(new DriveError("network"));
    document.head.append(script);
  });

const globalGoogle = (): GoogleGlobal | undefined =>
  (globalThis as unknown as { google?: GoogleGlobal }).google;

export class WebDriveAuth implements DriveAuth {
  private token: string | null = null;
  private expiresAt = 0;
  private client: TokenClient | null = null;
  private pending: { resolve: (t: string) => void; reject: (e: DriveError) => void } | null = null;

  constructor(
    private readonly loader: ScriptLoader = loadScript,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get connected(): boolean {
    return this.token !== null && this.now() < this.expiresAt;
  }

  private async ensureClient(): Promise<TokenClient> {
    if (this.client) return this.client;
    await this.loader(GIS_URL);
    const google = globalGoogle();
    if (!google?.accounts?.oauth2) throw new DriveError("network");
    this.client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        const waiting = this.pending;
        this.pending = null;
        if (response.error || !response.access_token) {
          waiting?.reject(new DriveError("auth"));
          return;
        }
        this.token = response.access_token;
        this.expiresAt = this.now() + Number(response.expires_in ?? 3600) * 1000 - EXPIRY_MARGIN_MS;
        waiting?.resolve(response.access_token);
      },
      error_callback: () => {
        const waiting = this.pending;
        this.pending = null;
        waiting?.reject(new DriveError("auth"));
      },
    });
    return this.client;
  }

  private request(prompt: string): Promise<string> {
    return this.ensureClient().then(
      (client) =>
        new Promise<string>((resolve, reject) => {
          this.pending = { resolve, reject };
          client.requestAccessToken({ prompt });
        }),
    );
  }

  async connect(): Promise<void> {
    await this.request("consent");
  }

  async getToken(): Promise<string> {
    if (this.token && this.connected) return this.token;
    if (!this.token) throw new DriveError("auth"); // nunca conectou: o usuário precisa clicar em Conectar
    return this.request(""); // renovação silenciosa quando o Google permitir
  }

  async disconnect(): Promise<void> {
    const token = this.token;
    this.token = null;
    this.expiresAt = 0;
    if (token) globalGoogle()?.accounts?.oauth2?.revoke(token);
  }

  /** Google Picker: o usuário escolhe um arquivo `.enzitag`; `null` se cancelar. */
  async pick(): Promise<PickedFile | null> {
    const token = await this.getToken();
    await this.loader(GAPI_URL);
    const gapi = (
      globalThis as unknown as { gapi?: { load(name: string, done: () => void): void } }
    ).gapi;
    if (!gapi) throw new DriveError("network");
    await new Promise<void>((resolve) => gapi.load("picker", resolve));
    const picker = (globalGoogle() as unknown as { picker: Record<string, any> }).picker;
    return new Promise<PickedFile | null>((resolve) => {
      const view = new picker.DocsView(picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setMode(picker.DocsViewMode.LIST);
      new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_PICKER_API_KEY)
        .setAppId(GOOGLE_PROJECT_NUMBER)
        .setCallback((data: Record<string, any>) => {
          if (data[picker.Response.ACTION] === picker.Action.PICKED) {
            const doc = data[picker.Response.DOCUMENTS][0];
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
}
