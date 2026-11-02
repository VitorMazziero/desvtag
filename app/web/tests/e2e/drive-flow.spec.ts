import { expect, type Page, test } from "@playwright/test";
import { FakeDrive } from "../../src/services/drive/fakeDrive";
import { openFileMenu } from "./menus";

// Google Drive (ET19) com um Google SIMULADO: os scripts do Google e a API do Drive são
// interceptados. Isto prova a interface e a lógica de sincronização; **não** prova a autorização
// real, que exige a conta do usuário (ver DT-0025).

test.use({ locale: "pt-BR" });

const GIS = `window.google = window.google || {};
window.google.accounts = { oauth2: {
  initTokenClient: (c) => ({ requestAccessToken: () => setTimeout(() => c.callback({ access_token: "token-simulado", expires_in: 3600 }), 0) }),
  revoke: () => { window.__revoked = true; } } };`;

const GAPI = `window.gapi = { load: (name, done) => {
  window.google = window.google || {};
  window.google.picker = {
    ViewId: { DOCS: "docs" }, DocsViewMode: { LIST: "list" },
    DocsView: function () { this.setIncludeFolders = () => this; this.setMode = () => this; },
    PickerBuilder: function () { let cb; const b = { addView: () => b, setOAuthToken: () => b, setDeveloperKey: () => b,
      setAppId: () => b, setCallback: (f) => { cb = f; return b; },
      build: () => ({ setVisible: () => cb({ action: "picked", docs: [{ id: window.__pickId, name: "projeto-no-drive.enzitag" }] }) }) }; return b; },
    Response: { ACTION: "action", DOCUMENTS: "docs" }, Action: { PICKED: "picked", CANCEL: "cancel" }, Document: { ID: "id", NAME: "name" } };
  done(); } };`;

async function mockGoogle(page: Page, drive: FakeDrive) {
  const hits: string[] = [];
  await page.route("https://accounts.google.com/gsi/client", (route) => {
    hits.push("gis");
    return route.fulfill({ contentType: "application/javascript", body: GIS });
  });
  await page.route("https://apis.google.com/js/api.js", (route) => {
    hits.push("gapi");
    return route.fulfill({ contentType: "application/javascript", body: GAPI });
  });
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "*",
    };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    hits.push(`${request.method()} ${new URL(request.url()).pathname}`);
    if (drive.failures[0] === "network") {
      drive.failures.shift();
      return route.abort("failed"); // falha de rede de verdade no navegador
    }
    const response = await drive.fetch(request.url(), {
      method: request.method(),
      headers: request.headers(),
      body: (request.postDataBuffer() ?? undefined) as unknown as BodyInit | undefined,
    });
    return route.fulfill({
      status: response.status,
      headers: {
        ...cors,
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  return hits;
}

test("Drive simulado: conectar, salvar, conflito sem sobrescrever e abrir pelo Picker", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const drive = new FakeDrive();
  const hits = await mockGoogle(page, drive);
  await page.goto("/");
  await page.getByLabel("Nome do projeto").fill("Projeto no Drive");

  // Nenhuma requisição ao Google antes de conectar.
  expect(hits).toEqual([]);
  await openFileMenu(page);
  await expect(page.getByRole("button", { name: "Salvar no Drive" })).toHaveCount(0);
  await page.getByRole("button", { name: "Conectar ao Google Drive" }).click();
  await expect(page.getByText("Conectado ao Google Drive.")).toBeVisible();

  // Primeiro salvamento: cria o arquivo na pasta «EnziTAG Optima».
  await page.getByRole("button", { name: "Salvar no Drive" }).click();
  await expect(page.getByTestId("drive-message")).toContainText("criado na pasta «EnziTAG Optima»");
  const stored = [...drive.files.values()].filter((f) => !f.mimeType.endsWith("folder"));
  expect(stored).toHaveLength(1);
  expect(stored[0]?.name).toBe("Projeto no Drive.enzitag");
  expect(stored[0]?.bytes.length).toBeGreaterThan(100);
  expect(
    [...drive.files.values()].some(
      (f) => f.mimeType.endsWith("folder") && f.name === "EnziTAG Optima",
    ),
  ).toBe(true);

  // Segundo salvamento: atualiza o mesmo arquivo.
  await page.getByLabel("Nome do projeto").fill("Projeto no Drive");
  await page.getByRole("button", { name: "Salvar no Drive" }).click();
  await expect(page.getByTestId("drive-message")).toContainText("Salvo no Drive");
  expect([...drive.files.values()].filter((f) => !f.mimeType.endsWith("folder"))).toHaveLength(1);

  // Outra pessoa altera o arquivo: o próximo salvamento NÃO sobrescreve; vira cópia.
  const original = stored[0];
  if (!original) throw new Error("arquivo inexistente");
  const remoteBytes = new TextEncoder().encode("alteração feita por outra pessoa");
  drive.externalEdit(original.id, remoteBytes);
  await page.getByRole("button", { name: "Salvar no Drive" }).click();
  await expect(page.getByTestId("drive-message")).toContainText("não foi sobrescrito");
  expect(new TextDecoder().decode(drive.files.get(original.id)?.bytes)).toBe(
    "alteração feita por outra pessoa",
  );
  const names = [...drive.files.values()]
    .filter((f) => !f.mimeType.endsWith("folder"))
    .map((f) => f.name);
  expect(names.some((n) => n.includes("cópia local"))).toBe(true);

  // Abrir pelo Picker: escolhe a cópia (um .enzitag válido) e carrega o projeto.
  const copy = [...drive.files.values()].find((f) => f.name.includes("cópia local"));
  if (!copy) throw new Error("cópia inexistente");
  await page.evaluate((id) => {
    (window as unknown as { __pickId: string }).__pickId = id;
  }, copy.id);
  await page.getByLabel("Nome do projeto").fill("outro nome");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Abrir do Drive…" }).click();
  await expect(page.getByTestId("drive-message")).toContainText("Aberto do Drive");
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Projeto no Drive");

  // Desconectar revoga o token no Google e volta ao estado inicial.
  await page.getByRole("button", { name: "Desconectar" }).click();
  await expect(page.getByRole("button", { name: "Conectar ao Google Drive" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __revoked?: boolean }).__revoked)).toBe(
    true,
  );
});

test("Drive: erro de rede ou de autorização não afeta o trabalho local", async ({ page }) => {
  const drive = new FakeDrive();
  await mockGoogle(page, drive);
  await page.goto("/");
  await page.getByLabel("Nome do projeto").fill("Local primeiro");
  await openFileMenu(page);
  await page.getByRole("button", { name: "Conectar ao Google Drive" }).click();
  drive.failures = [{ status: 401 }];
  await page.getByRole("button", { name: "Salvar no Drive" }).click();
  await expect(page.getByTestId("drive-message")).toContainText("autorização do Google expirou");
  // O projeto segue intacto e o salvamento local continua disponível.
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Local primeiro");
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeVisible();
  drive.failures = ["network"];
  await page.getByRole("button", { name: "Conectar ao Google Drive" }).click();
  await page.getByRole("button", { name: "Salvar no Drive" }).click();
  await expect(page.getByTestId("drive-message")).toContainText("Sem conexão com o Google");
});
