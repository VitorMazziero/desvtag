// Drive simulado para testes: implementa o subconjunto da API v3 que o cliente usa (listar,
// metadados, download, criar/atualizar por multipart, pasta) com versões que crescem a cada gravação.
// Serve também para simular falhas (401, 403, 429, rede) e alterações feitas por outra pessoa.
import type { DriveAuth } from "./types";

interface Stored {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  bytes: Uint8Array;
  version: number;
  modifiedTime: string;
  trashed: boolean;
}

export class FakeDrive {
  accountId = "test-drive-account";
  grants: Array<{ fileId: string; type: string; role: string; emailAddress: string }> = [];
  files = new Map<string, Stored>();
  private nextId = 1;
  private clock = Date.parse("2026-11-02T12:00:00Z");
  /** Próximas respostas de erro (consumidas em ordem) — `status` ou `"network"`. */
  failures: Array<{ status: number; reason?: string } | "network"> = [];
  uploadFailures: Array<{ status: number; reason: string }> = [];
  requests: string[] = [];

  /** Alteração feita por outra pessoa: grava bytes novos e sobe a versão. */
  externalEdit(id: string, bytes: Uint8Array): void {
    const f = this.files.get(id);
    if (!f) throw new Error("arquivo inexistente");
    f.bytes = bytes;
    f.version += 1;
    f.modifiedTime = this.tick();
  }

  /** Avança o relógio simulado em um minuto e devolve o instante. */
  private tick(): string {
    this.clock += 60_000;
    return new Date(this.clock).toISOString();
  }

  private info(f: Stored) {
    return {
      id: f.id,
      name: f.name,
      version: String(f.version),
      modifiedTime: f.modifiedTime,
      size: String(f.bytes.length),
      trashed: f.trashed,
    };
  }

  private json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  fetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    this.requests.push(`${init.method ?? "GET"} ${input}`);
    const failure = this.failures.shift();
    if (failure === "network") throw new TypeError("Failed to fetch");
    if (failure)
      return this.json({ error: { errors: [{ reason: failure.reason ?? "" }] } }, failure.status);
    const url = new URL(input);
    const method = init.method ?? "GET";
    const path = url.pathname;
    const isUpload = path.startsWith("/upload/drive/v3/files");
    const uploadFailure = isUpload ? this.uploadFailures.shift() : undefined;
    if (uploadFailure) {
      return this.json(
        { error: { errors: [{ reason: uploadFailure.reason }] } },
        uploadFailure.status,
      );
    }
    const permission = /^\/drive\/v3\/files\/([^/]+)\/permissions$/.exec(path);
    if (method === "POST" && permission?.[1]) {
      const fileId = decodeURIComponent(permission[1]);
      if (!this.files.has(fileId)) return this.json({ error: {} }, 404);
      const data = JSON.parse(new TextDecoder().decode(init.body as Uint8Array));
      this.grants.push({ fileId, ...data });
      return this.json({ id: "permission" });
    }
    if (method === "GET" && path === "/drive/v3/files/generateIds") {
      return this.json({ ids: [`id${this.nextId++}`] });
    }

    if (method === "GET" && path === "/drive/v3/about") {
      return this.json({ user: { permissionId: this.accountId } });
    }

    if (!isUpload && method === "GET" && path === "/drive/v3/files") {
      const q = url.searchParams.get("q") ?? "";
      const folderMatch =
        /name = '(.*)' and mimeType = 'application\/vnd\.google-apps\.folder'/.exec(q);
      if (folderMatch) {
        const wanted = (folderMatch[1] ?? "").replace(/\\'/g, "'");
        const hit = [...this.files.values()].filter(
          (f) => f.mimeType.endsWith("folder") && f.name === wanted && !f.trashed,
        );
        return this.json({ files: hit.map((f) => ({ id: f.id, name: f.name })) });
      }
      const parentMatch = /'(.*)' in parents/.exec(q);
      const parent = parentMatch?.[1];
      const list = [...this.files.values()]
        .filter(
          (f) =>
            !f.trashed && !f.mimeType.endsWith("folder") && (!parent || f.parents.includes(parent)),
        )
        .sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
      return this.json({ files: list.map((f) => this.info(f)) });
    }
    if (!isUpload && method === "POST" && path === "/drive/v3/files") {
      const meta = JSON.parse(String(init.body)) as { name: string; mimeType: string };
      const id = `id${this.nextId++}`;
      this.files.set(id, {
        id,
        name: meta.name,
        mimeType: meta.mimeType,
        parents: [],
        bytes: new Uint8Array(),
        version: 1,
        modifiedTime: this.tick(),
        trashed: false,
      });
      return this.json({ id });
    }
    const fileMatch = /^\/(?:upload\/)?drive\/v3\/files\/([^/]+)$/.exec(path);
    if (fileMatch && method === "GET") {
      const f = this.files.get(decodeURIComponent(fileMatch[1] as string));
      if (!f) return this.json({ error: { errors: [{ reason: "notFound" }] } }, 404);
      if (url.searchParams.get("alt") === "media")
        return new Response(f.bytes as BlobPart, { status: 200 });
      return this.json(this.info(f));
    }
    if (isUpload) {
      const body = init.body as Uint8Array;
      const text = new TextDecoder("latin1").decode(body);
      const boundary = /boundary=(.+)$/.exec(
        new Headers(init.headers).get("content-type") ?? "",
      )?.[1];
      if (!boundary) return this.json({ error: {} }, 400);
      // latin1 mapeia 1:1 byte→caractere; o JSON dos metadados é UTF-8 e é relido dos bytes.
      const jsonMatch = /\r\n\r\n(\{[\s\S]*?\})\r\n--/.exec(text);
      const json = jsonMatch
        ? new TextDecoder("utf-8").decode(
            body.slice(jsonMatch.index + 4, jsonMatch.index + 4 + (jsonMatch[1]?.length ?? 0)),
          )
        : "{}";
      const meta = JSON.parse(json) as { id?: string; name?: string; parents?: string[] };
      const marker = `Content-Type: application/octet-stream\r\n\r\n`;
      const start = text.indexOf(marker) + marker.length;
      const end = text.lastIndexOf(`\r\n--${boundary}--`);
      const content = body.slice(start, end);
      const update = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(path);
      if (update && method === "PATCH") {
        const f = this.files.get(decodeURIComponent(update[1] as string));
        if (!f) return this.json({ error: { errors: [{ reason: "notFound" }] } }, 404);
        if (meta.name) f.name = meta.name;
        f.bytes = content;
        f.version += 1;
        f.modifiedTime = this.tick();
        return this.json(this.info(f));
      }
      if (method === "POST") {
        const id = meta.id ?? `id${this.nextId++}`;
        if (this.files.has(id)) return this.json({ error: {} }, 409);
        const f: Stored = {
          id,
          name: meta.name ?? "sem-nome",
          mimeType: "application/octet-stream",
          parents: meta.parents ?? [],
          bytes: content,
          version: 1,
          modifiedTime: this.tick(),
          trashed: false,
        };
        this.files.set(id, f);
        return this.json(this.info(f));
      }
    }
    return this.json({ error: {} }, 400);
  };
}

/** Autorização de teste: token fixo, com contagem de pedidos e revogação simulada. */
export class FakeAuth implements DriveAuth {
  connected = true;
  tokens = 0;
  async getToken(): Promise<string> {
    this.tokens += 1;
    if (!this.connected) throw new Error("sem conexão");
    return "token-de-teste";
  }
  async connect(): Promise<void> {
    this.connected = true;
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
}
