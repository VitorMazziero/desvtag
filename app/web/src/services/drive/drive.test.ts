import { describe, expect, it } from "vitest";
import { DriveClient, escapeQuery } from "./client";
import { FakeAuth, FakeDrive } from "./fakeDrive";
import { conflictCopyName, openFromDrive, saveToDrive } from "./sync";
import { DriveError } from "./types";

const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

function setup() {
  const drive = new FakeDrive();
  const auth = new FakeAuth();
  return { drive, auth, client: new DriveClient(auth, drive.fetch) };
}

describe("DriveClient", () => {
  it("usa a pasta «EnziTAG Optima» existente e só cria uma vez", async () => {
    const { drive, client } = setup();
    const first = await client.ensureFolder();
    const second = await client.ensureFolder();
    expect(second).toBe(first);
    expect([...drive.files.values()].filter((f) => f.mimeType.endsWith("folder"))).toHaveLength(1);
    expect(
      drive.requests.filter((r) => r.startsWith("POST https://www.googleapis.com/drive")).length,
    ).toBe(1);
  });

  it("envia o token em todos os pedidos e escapa aspas nas consultas", async () => {
    const { auth, client } = setup();
    await client.ensureFolder();
    expect(auth.tokens).toBeGreaterThanOrEqual(2);
    expect(escapeQuery("D'Água\\x")).toBe("D\\'Água\\\\x");
  });

  it("cria, lista, baixa e atualiza um projeto com os mesmos bytes", async () => {
    const { client } = setup();
    const folder = await client.ensureFolder();
    const created = await client.upload("a.enzitag", bytes("conteúdo 1"), { folderId: folder });
    expect(created.version).toBe("1");
    expect((await client.list(folder)).map((f) => f.name)).toEqual(["a.enzitag"]);
    expect(text(await client.download(created.id))).toBe("conteúdo 1");
    const updated = await client.upload("a.enzitag", bytes("conteúdo 2 maior"), {
      fileId: created.id,
    });
    expect(updated.version).toBe("2");
    expect(text(await client.download(created.id))).toBe("conteúdo 2 maior");
  });

  it("traduz as falhas da API em códigos tipados", async () => {
    const { drive, client } = setup();
    drive.failures = [{ status: 401 }];
    await expect(client.ensureFolder()).rejects.toMatchObject({ code: "auth" });
    drive.failures = [{ status: 403, reason: "storageQuotaExceeded" }];
    await expect(client.ensureFolder()).rejects.toMatchObject({ code: "quota" });
    drive.failures = [{ status: 403, reason: "insufficientPermissions" }];
    await expect(client.ensureFolder()).rejects.toMatchObject({ code: "permission" });
    drive.failures = [{ status: 403, reason: "userRateLimitExceeded" }];
    await expect(client.ensureFolder()).rejects.toMatchObject({ code: "rateLimit" });
    drive.failures = [{ status: 429 }];
    await expect(client.ensureFolder()).rejects.toMatchObject({ code: "rateLimit" });
    drive.failures = ["network"];
    await expect(client.ensureFolder()).rejects.toBeInstanceOf(DriveError);
    await expect(client.metadata("inexistente")).rejects.toMatchObject({ code: "notFound" });
  });

  it("arquivo na lixeira conta como inexistente", async () => {
    const { drive, client } = setup();
    const folder = await client.ensureFolder();
    const f = await client.upload("a.enzitag", bytes("x"), { folderId: folder });
    const stored = drive.files.get(f.id);
    if (stored) stored.trashed = true;
    await expect(client.metadata(f.id)).rejects.toMatchObject({ code: "notFound" });
  });
});

describe("saveToDrive / openFromDrive", () => {
  it("primeiro salvamento cria o arquivo; os seguintes atualizam e guardam a versão", async () => {
    const { client } = setup();
    const first = await saveToDrive(client, bytes("v1"), "p.enzitag", null);
    expect(first).toMatchObject({ kind: "saved", created: true });
    if (first.kind !== "saved") throw new Error("esperava salvo");
    const second = await saveToDrive(client, bytes("v2!"), "p.enzitag", first.link);
    expect(second).toMatchObject({ kind: "saved", created: false });
    if (second.kind !== "saved") throw new Error("esperava salvo");
    expect(Number(second.link.version)).toBeGreaterThan(Number(first.link.version));
    const opened = await openFromDrive(client, second.link.fileId);
    expect(text(opened.bytes)).toBe("v2!");
    expect(opened.link.version).toBe(second.link.version);
  });

  it("não sobrescreve quando outra pessoa alterou o arquivo: grava uma cópia ao lado", async () => {
    const { drive, client } = setup();
    const first = await saveToDrive(client, bytes("original"), "p.enzitag", null);
    if (first.kind !== "saved") throw new Error("esperava salvo");
    drive.externalEdit(first.link.fileId, bytes("alteração de outra pessoa"));
    const outcome = await saveToDrive(
      client,
      bytes("meu trabalho local"),
      "p.enzitag",
      first.link,
      new Date(2026, 10, 2, 10, 35),
    );
    expect(outcome.kind).toBe("conflict");
    if (outcome.kind !== "conflict") throw new Error("esperava conflito");
    // o remoto continua intacto
    expect(text(await client.download(first.link.fileId))).toBe("alteração de outra pessoa");
    // o trabalho local está na cópia
    expect(outcome.copy.name).toBe("p (cópia local 2026-11-02 10h35).enzitag");
    expect(text(await client.download(outcome.copy.id))).toBe("meu trabalho local");
  });

  it("arquivo apagado no Drive: cria um novo sem perder o trabalho local", async () => {
    const { drive, client } = setup();
    const first = await saveToDrive(client, bytes("v1"), "p.enzitag", null);
    if (first.kind !== "saved") throw new Error("esperava salvo");
    drive.files.delete(first.link.fileId);
    const again = await saveToDrive(client, bytes("v2"), "p.enzitag", first.link);
    expect(again).toMatchObject({ kind: "saved", created: true });
  });

  it("falha de rede ou de autorização sobe como erro tipado, sem gravar nada parcial", async () => {
    const { drive, client } = setup();
    drive.failures = [{ status: 401 }];
    await expect(saveToDrive(client, bytes("x"), "p.enzitag", null)).rejects.toMatchObject({
      code: "auth",
    });
    expect([...drive.files.values()].filter((f) => !f.mimeType.endsWith("folder"))).toHaveLength(0);
  });

  it("os nomes de cópia mantêm a extensão", () => {
    expect(conflictCopyName("Projeto.enzitag", new Date(2026, 0, 5, 9, 7))).toBe(
      "Projeto (cópia local 2026-01-05 09h07).enzitag",
    );
    expect(conflictCopyName("semextensao", new Date(2026, 0, 5, 9, 7))).toBe(
      "semextensao (cópia local 2026-01-05 09h07)",
    );
  });
});
