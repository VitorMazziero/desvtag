import { afterEach, describe, expect, it } from "vitest";
import { DRIVE_SCOPE, GOOGLE_WEB_CLIENT_ID } from "./config";
import { WebDriveAuth } from "./webAuth";

type Callback = (r: { access_token?: string; expires_in?: number; error?: string }) => void;

function installGoogle(options: { fail?: boolean } = {}) {
  const state = {
    config: null as null | { client_id: string; scope: string; callback: Callback },
    requests: [] as string[],
    revoked: [] as string[],
  };
  (globalThis as unknown as { google: unknown }).google = {
    accounts: {
      oauth2: {
        initTokenClient: (config: { client_id: string; scope: string; callback: Callback }) => {
          state.config = config;
          return {
            requestAccessToken: (o?: { prompt?: string }) => {
              state.requests.push(o?.prompt ?? "");
              queueMicrotask(() =>
                options.fail
                  ? config.callback({ error: "access_denied" })
                  : config.callback({
                      access_token: `tok-${state.requests.length}`,
                      expires_in: 3600,
                    }),
              );
            },
          };
        },
        revoke: (token: string) => state.revoked.push(token),
      },
    },
  };
  return state;
}

afterEach(() => {
  (globalThis as unknown as { google?: unknown }).google = undefined;
});

describe("WebDriveAuth", () => {
  it("só carrega os scripts do Google ao conectar, com o cliente web e o escopo mínimo", async () => {
    const loaded: string[] = [];
    const google = installGoogle();
    const auth = new WebDriveAuth(async (url) => void loaded.push(url));
    expect(loaded).toEqual([]);
    expect(auth.connected).toBe(false);
    await auth.connect();
    expect(loaded).toEqual(["https://accounts.google.com/gsi/client"]);
    expect(google.config?.client_id).toBe(GOOGLE_WEB_CLIENT_ID);
    expect(google.config?.scope).toBe(DRIVE_SCOPE);
    expect(DRIVE_SCOPE).toBe("https://www.googleapis.com/auth/drive.file");
    expect(auth.connected).toBe(true);
    expect(google.requests).toEqual(["consent"]);
  });

  it("reaproveita o token até perto do vencimento e renova depois", async () => {
    const google = installGoogle();
    let now = 1_000_000;
    const auth = new WebDriveAuth(
      async () => {},
      () => now,
    );
    await auth.connect();
    expect(await auth.getToken()).toBe("tok-1");
    expect(google.requests).toHaveLength(1);
    now += 3600 * 1000; // passou de uma hora
    expect(auth.connected).toBe(false);
    expect(await auth.getToken()).toBe("tok-2");
    expect(google.requests).toEqual(["consent", ""]);
  });

  it("sem conectar antes, não pede token sozinho; recusa do usuário vira erro de autorização", async () => {
    installGoogle();
    const auth = new WebDriveAuth(async () => {});
    await expect(auth.getToken()).rejects.toMatchObject({ code: "auth" });
    installGoogle({ fail: true });
    const refused = new WebDriveAuth(async () => {});
    await expect(refused.connect()).rejects.toMatchObject({ code: "auth" });
    expect(refused.connected).toBe(false);
  });

  it("desconectar revoga o token no Google e esquece a conexão", async () => {
    const google = installGoogle();
    const auth = new WebDriveAuth(async () => {});
    await auth.connect();
    await auth.disconnect();
    expect(google.revoked).toEqual(["tok-1"]);
    expect(auth.connected).toBe(false);
    await expect(auth.getToken()).rejects.toMatchObject({ code: "auth" });
  });

  it("falha ao carregar o script do Google vira erro de rede", async () => {
    const { DriveError } = await import("./types");
    const auth = new WebDriveAuth(async () => {
      throw new DriveError("network");
    });
    await expect(auth.connect()).rejects.toMatchObject({ code: "network" });
  });
});
