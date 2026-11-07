import { describe, expect, it, vi } from "vitest";
import { DriveClient } from "./client";
import { NativeDriveAuth, toDriveError } from "./nativeAuth";
import { DriveError } from "./types";

function auth(handlers: Record<string, () => unknown>) {
  const calls: string[] = [];
  const call = vi.fn(async (command: string) => {
    calls.push(command);
    const handler = handlers[command];
    if (!handler) throw "unknown";
    return handler();
  });
  return { auth: new NativeDriveAuth(call as never), calls };
}

const fail = (code: string) => () => {
  throw code;
};

describe("autorização do Drive no Windows", () => {
  it("reconhece a conexão guardada no cofre sem pedir consentimento", async () => {
    const { auth: native, calls } = auth({
      drive_status: () => ({ connected: true, available: true }),
    });
    expect(native.connected).toBe(false);
    expect(await native.status()).toEqual({ connected: true, available: true });
    expect(native.connected).toBe(true);
    expect(calls).toEqual(["drive_status"]);
  });

  it("conecta, entrega só o token de acesso e desconecta mesmo se a revogação falhar", async () => {
    const { auth: native } = auth({
      drive_connect: () => undefined,
      drive_access_token: () => "ya29.token",
      drive_disconnect: fail("network"),
    });
    await native.connect();
    expect(native.connected).toBe(true);
    expect(await native.getToken()).toBe("ya29.token");
    await expect(native.disconnect()).rejects.toMatchObject({ code: "network" });
    expect(native.connected).toBe(false);
  });

  it("converte os códigos do Rust em erros tipados e desfaz a conexão se foi revogada", async () => {
    for (const code of ["auth", "network", "cancelled", "timeout", "unavailable"]) {
      expect(toDriveError(code)).toMatchObject({ code });
    }
    expect(toDriveError("qualquer coisa")).toMatchObject({ code: "unknown" });
    expect(toDriveError(new Error("x"))).toMatchObject({ code: "unknown" });
    const existing = new DriveError("quota");
    expect(toDriveError(existing)).toBe(existing);
    const { auth: native } = auth({
      drive_status: () => ({ connected: true, available: true }),
      drive_access_token: fail("auth"),
    });
    await native.status();
    await expect(native.getToken()).rejects.toMatchObject({ code: "auth" });
    expect(native.connected).toBe(false);
  });

  it("falha de conexão cancelada ou por tempo não marca conectado", async () => {
    for (const code of ["cancelled", "timeout", "unavailable"]) {
      const { auth: native } = auth({ drive_connect: fail(code) });
      await expect(native.connect()).rejects.toMatchObject({ code });
      expect(native.connected).toBe(false);
    }
  });

  it("cancelar nunca lança, mesmo sem conexão em andamento", async () => {
    const { auth: native, calls } = auth({ drive_cancel: fail("unknown") });
    await expect(native.cancel()).resolves.toBeUndefined();
    expect(calls).toEqual(["drive_cancel"]);
  });

  it("o cliente do Drive usa o token do Rust em cada requisição", async () => {
    const { auth: native } = auth({ drive_access_token: () => "T" });
    const seen: string[] = [];
    const client = new DriveClient(native, async (_url, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      seen.push(String(headers.Authorization));
      return new Response(
        JSON.stringify({ id: "1", name: "a.enzitag", version: "3", modifiedTime: "t", size: "9" }),
        { status: 200 },
      );
    });
    expect((await client.metadata("1")).version).toBe("3");
    expect(seen).toEqual(["Bearer T"]);
  });
});
