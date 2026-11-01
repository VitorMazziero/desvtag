// Abrir e salvar bytes de projeto (U13). A serialização `.enzitag` pertence ao Rust (P02);
// aqui só se movem bytes entre o aplicativo e o armazenamento.

export interface OpenedFile {
  /** Nome do arquivo (sem caminho). */
  name: string;
  bytes: Uint8Array;
}

export interface RecentItem {
  name: string;
  /** Caminho para exibição; a interface não o reenvia (abre-se por posição). */
  path: string;
}

export interface SaveOptions {
  /** Pedir novo destino mesmo que o projeto já esteja ligado a um arquivo. */
  saveAs: boolean;
  suggestedName: string;
}

export interface StorageProvider {
  readonly kind: "browser" | "desktop";
  /**
   * `true` quando "Salvar" regrava o mesmo arquivo (Windows). No navegador, salvar baixa um
   * arquivo novo: não há como atualizar o original sem permissão e isso não é prometido.
   */
  readonly overwritesFile: boolean;
  /** `null`: o usuário cancelou. */
  open(): Promise<OpenedFile | null>;
  /** `null`: cancelado. */
  save(bytes: Uint8Array, options: SaveOptions): Promise<{ name: string } | null>;
  saveCopy(bytes: Uint8Array, suggestedName: string): Promise<{ name: string } | null>;
  /** Exporta uma figura, tabela ou relatório; `null`: cancelado. O caminho não volta à interface. */
  exportFile(bytes: Uint8Array, suggestedName: string): Promise<{ name: string } | null>;
  recents(): Promise<RecentItem[]>;
  openRecent(index: number): Promise<OpenedFile>;
  /** Novo projeto: desliga o arquivo atual. */
  detach(): Promise<void>;
}
