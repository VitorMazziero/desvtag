// Tipos da integração com o Google Drive (U14). A integração é opcional: nenhum fluxo local depende
// dela e todo erro volta como um código tipado, nunca como exceção sem tratamento.

export interface DriveFileInfo {
  id: string;
  name: string;
  /** Versão monotônica do arquivo no Drive (texto numérico). */
  version: string;
  modifiedTime: string;
  size: number;
}

export type DriveErrorCode =
  | "auth" // sem autorização ou token expirado/revogado: reconectar
  | "permission" // sem permissão para o arquivo
  | "quota" // armazenamento cheio
  | "rateLimit" // limite de requisições: tentar de novo mais tarde
  | "notFound" // arquivo inexistente, na lixeira ou fora do alcance do escopo
  | "network" // sem rede ou resposta inválida
  | "unknown";

export class DriveError extends Error {
  constructor(
    readonly code: DriveErrorCode,
    readonly status = 0,
  ) {
    super(`drive.${code}`);
    this.name = "DriveError";
  }
}

/** Autorização: o token nunca é gravado; vive só na memória da página. */
export interface DriveAuth {
  /** Token válido (pede um novo ao Google se precisar; exige ação do usuário na primeira vez). */
  getToken(): Promise<string>;
  /** Há autorização ativa nesta página. */
  readonly connected: boolean;
  connect(): Promise<void>;
  /** Revoga o token no Google e esquece a conexão. */
  disconnect(): Promise<void>;
}

export interface PickedFile {
  id: string;
  name: string;
}

/** Ligação do projeto aberto a um arquivo do Drive. */
export interface DriveLink {
  fileId: string;
  name: string;
  /** Versão do arquivo na última leitura ou gravação feita por este aplicativo. */
  version: string;
}

export type SaveOutcome =
  | { kind: "saved"; link: DriveLink; created: boolean }
  /** Alguém alterou o arquivo no Drive depois da nossa última leitura: o local foi salvo como cópia. */
  | { kind: "conflict"; remote: DriveFileInfo; copy: DriveFileInfo };
