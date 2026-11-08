// Autorização do Google Drive no aplicativo Windows (ET26, DT-0036): o Rust conduz o navegador do
// sistema, o redirecionamento em loopback e o cofre de credenciais. A interface só recebe o token de
// acesso (curto, mantido em memória); o token de atualização nunca sai do cofre.
import { invoke } from "@tauri-apps/api/core";
import { type DriveAuth, DriveError, type DriveErrorCode } from "./types";

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export interface NativeDriveStatus {
  connected: boolean;
  /** A compilação inclui o segredo do cliente desktop. */
  available: boolean;
}

const CODES: Record<string, DriveErrorCode> = {
  auth: "auth",
  network: "network",
  cancelled: "cancelled",
  timeout: "timeout",
  unavailable: "unavailable",
};

/** Erro de comando Tauri (texto com o código) → erro tipado do Drive. */
export function toDriveError(error: unknown): DriveError {
  if (error instanceof DriveError) return error;
  const text = typeof error === "string" ? error : "";
  return new DriveError(CODES[text] ?? "unknown");
}

export class NativeDriveAuth implements DriveAuth {
  private isConnected = false;

  constructor(private readonly call: Invoke = invoke) {}

  get connected(): boolean {
    return this.isConnected;
  }

  private async run<T>(command: string): Promise<T> {
    try {
      return await this.call<T>(command);
    } catch (error) {
      const failure = toDriveError(error);
      // Autorização revogada: o Rust já limpou o cofre.
      if (failure.code === "auth") this.isConnected = false;
      throw failure;
    }
  }

  /** Estado no cofre (sem rede): permite reconectar sem novo consentimento. */
  async status(): Promise<NativeDriveStatus> {
    const status = await this.run<NativeDriveStatus>("drive_status");
    this.isConnected = status.connected;
    return status;
  }

  async connect(): Promise<void> {
    await this.run<void>("drive_connect");
    this.isConnected = true;
  }

  /** Interrompe uma conexão que espera o navegador. */
  async cancel(): Promise<void> {
    await this.call<void>("drive_cancel").catch(() => undefined);
  }

  getToken(): Promise<string> {
    return this.run<string>("drive_access_token");
  }

  async pick(): Promise<{ id: string } | null> {
    try {
      return { id: await this.call<string>("drive_pick") };
    } catch (error) {
      const failure = toDriveError(error);
      if (failure.code === "cancelled") return null;
      throw failure;
    }
  }

  /** Revoga no Google e apaga o cofre; `false` se o Google não confirmou (o cofre foi apagado). */
  async disconnect(): Promise<void> {
    try {
      await this.run<boolean>("drive_disconnect");
    } finally {
      this.isConnected = false;
    }
  }
}
