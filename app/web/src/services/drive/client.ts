// Cliente da API REST do Google Drive v3 (U14), com `fetch` e autorização injetados para teste. Só
// usa o escopo `drive.file`: enxerga a pasta «EnziTAG Optima» e os arquivos que o aplicativo criou ou
// que o usuário escolheu abrir. Os bytes são os mesmos do `.enzitag` local.
import { DRIVE_FILE_MIME, DRIVE_FOLDER_NAME } from "./config";
import { type DriveAuth, DriveError, type DriveErrorCode, type DriveFileInfo } from "./types";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FIELDS = "id,name,version,modifiedTime,size";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** Aspas e barras invertidas em consultas `q` do Drive. */
export function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function failure(response: Response): Promise<DriveError> {
  let reason = "";
  try {
    const body = (await response.json()) as {
      error?: { errors?: Array<{ reason?: string }>; status?: string };
    };
    reason = body.error?.errors?.[0]?.reason ?? body.error?.status ?? "";
  } catch {
    // corpo ilegível: vale o código HTTP
  }
  let code: DriveErrorCode = "unknown";
  if (response.status === 401) code = "auth";
  else if (response.status === 404) code = "notFound";
  else if (response.status === 403 || response.status === 429) {
    if (/storageQuotaExceeded/i.test(reason)) code = "quota";
    else if (/rateLimit|RATE_LIMIT|quotaExceeded/i.test(reason) || response.status === 429)
      code = "rateLimit";
    else if (
      /insufficientPermissions|forbidden|PERMISSION_DENIED|appNotAuthorizedToFile/i.test(reason)
    )
      code = "permission";
    else code = "permission";
  }
  return new DriveError(code, response.status);
}

function toInfo(raw: Record<string, unknown>): DriveFileInfo {
  return {
    id: String(raw.id),
    name: String(raw.name),
    version: String(raw.version ?? "0"),
    modifiedTime: String(raw.modifiedTime ?? ""),
    size: Number(raw.size ?? 0),
  };
}

export class DriveClient {
  constructor(
    private readonly auth: Pick<DriveAuth, "getToken">,
    private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
  ) {}

  /** Identifica a conta e mantém o mesmo token durante a operação retomada. */
  async accountSession(): Promise<{ accountId: string; client: DriveClient }> {
    const token = await this.auth.getToken();
    const client = new DriveClient({ getToken: async () => token }, this.fetcher);
    const about = await client.json(`${API}/about?fields=user(permissionId)`);
    const id = (about.user as { permissionId?: unknown } | null)?.permissionId;
    if (typeof id !== "string" || id.trim() === "") throw new DriveError("network");
    return { accountId: id, client };
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.auth.getToken();
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new DriveError("network");
    }
    if (!response.ok) throw await failure(response);
    return response;
  }

  private async json(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const response = await this.request(url, init);
    try {
      return (await response.json()) as Record<string, unknown>;
    } catch {
      throw new DriveError("network");
    }
  }

  /** Pasta «EnziTAG Optima»: usa a existente ou cria uma (visível no Drive do usuário). */
  async ensureFolder(): Promise<string> {
    const q = `name = '${escapeQuery(DRIVE_FOLDER_NAME)}' and mimeType = '${FOLDER_MIME}' and trashed = false`;
    const found = await this.json(
      `${API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name)")}&spaces=drive&pageSize=1`,
    );
    const files = (found.files as Array<{ id: string }> | undefined) ?? [];
    if (files[0]) return files[0].id;
    const created = await this.json(`${API}/files?fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME }),
    });
    return String(created.id);
  }

  /** Projetos da pasta (só os que o aplicativo enxerga com o escopo mínimo). */
  async list(folderId: string): Promise<DriveFileInfo[]> {
    const q = `'${escapeQuery(folderId)}' in parents and trashed = false`;
    const result = await this.json(
      `${API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(`files(${FIELDS})`)}&orderBy=modifiedTime%20desc&pageSize=100`,
    );
    return ((result.files as Array<Record<string, unknown>> | undefined) ?? []).map(toInfo);
  }

  async metadata(fileId: string): Promise<DriveFileInfo> {
    const raw = await this.json(
      `${API}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(`${FIELDS},trashed`)}`,
    );
    if (raw.trashed === true) throw new DriveError("notFound", 404);
    return toInfo(raw);
  }

  async download(fileId: string): Promise<Uint8Array> {
    const response = await this.request(`${API}/files/${encodeURIComponent(fileId)}?alt=media`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async reserveFileId(): Promise<string> {
    const response = await this.json(`${API}/files/generateIds?count=1&space=drive`);
    const id = Array.isArray(response.ids) ? response.ids[0] : undefined;
    if (typeof id !== "string" || !id) throw new DriveError("network");
    return id;
  }

  async shareReadOnly(fileId: string, emailAddress: string): Promise<void> {
    await this.request(
      `${API}/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", role: "reader", emailAddress }),
      },
    );
  }

  /** Cria (`fileId` ausente) ou atualiza o conteúdo; devolve os metadados gravados. */
  async upload(
    name: string,
    bytes: Uint8Array,
    options: { folderId?: string; fileId?: string; createId?: string },
  ): Promise<DriveFileInfo> {
    const boundary = `enzitag-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    const metadata = options.fileId
      ? { name }
      : { name, id: options.createId, parents: options.folderId ? [options.folderId] : undefined };
    const encoder = new TextEncoder();
    const head = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${DRIVE_FILE_MIME}\r\n\r\n`,
    );
    const tail = encoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head, 0);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);
    const url = options.fileId
      ? `${UPLOAD}/files/${encodeURIComponent(options.fileId)}?uploadType=multipart&fields=${FIELDS}`
      : `${UPLOAD}/files?uploadType=multipart&fields=${FIELDS}`;
    const raw = await this.json(url, {
      method: options.fileId ? "PATCH" : "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    const info = toInfo(raw);
    // Conferência: o tamanho gravado precisa ser o enviado (nada de gravação truncada em silêncio).
    if (info.size !== bytes.length) throw new DriveError("unknown");
    return info;
  }
}
