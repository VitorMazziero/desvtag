// Run queue and resume in separate application processes with the same isolated
// NATIVE_DRIVE_PROFILE. ENZITAG_TEST_DRIVE=1 requires the automation build.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FakeDrive } from "../../web/src/services/drive/fakeDrive.ts";

export async function runQueueCheck(page, evidence, phase) {
  assert.ok(["queue", "resume", "faults"].includes(phase));
  const drive = new FakeDrive();
  if (phase === "resume") {
    // O ID de criação já foi reservado pela primeira instância.
    await drive.fetch("https://www.googleapis.com/drive/v3/files/generateIds?count=1");
    drive.requests.length = 0;
  }
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "*",
  };
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    assert.equal(request.headers().authorization, "Bearer optima-test-token");
    // Keep the first upload in flight until native-cdp closes the process.
    if (phase === "queue" && request.url().includes("/upload/")) return;
    const response = await drive.fetch(request.url(), {
      method: request.method(),
      headers: request.headers(),
      body: request.postDataBuffer(),
    });
    await route.fulfill({
      status: response.status,
      headers: { ...cors, "content-type": "application/json" },
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  await page.evaluate(() => localStorage.setItem("optima.language", "pt-BR"));
  await page.reload();
  const pending = page.getByTestId("drive-pending");
  const message = page.getByTestId("drive-message");
  if (phase !== "resume") await page.getByLabel("Nome do projeto").fill("Projeto nativo pendente");
  await page.getByTestId("file-menu").locator(":scope > summary").click();
  if (phase === "resume") await pending.waitFor();
  await page.getByRole("button", { name: "Conectar ao Google Drive" }).click();
  if (phase === "faults") {
    const save = page.getByRole("button", { name: "Salvar no Drive", exact: true });
    for (const [status, reason, text] of [
      [403, "storageQuotaExceeded", "O armazenamento do seu Drive está cheio."],
      [403, "insufficientFilePermissions", "Sem permissão para este arquivo no Drive."],
    ]) {
      drive.uploadFailures.push({ status, reason });
      await save.click();
      await message.getByText(text, { exact: true }).waitFor();
      assert.equal(await pending.count(), 0);
    }
    drive.uploadFailures.push({ status: 429, reason: "rateLimitExceeded" });
    await save.click();
    await pending.waitFor();
    await page.getByRole("button", { name: "Retomar gravações" }).click();
    await message.getByText("Gravações enviadas: 1.", { exact: true }).waitFor();
    await pending.waitFor({ state: "detached" });
    assert.equal([...drive.files.values()].filter((file) => file.name === "Projeto nativo pendente.desvtag").length, 1);
    await page.getByTestId("drive-panel").screenshot({ path: resolve(evidence, "faults-recovered.png") });
  } else if (phase === "queue") {
    const uploading = page.waitForRequest((request) => request.url().includes("/upload/"));
    await page.getByRole("button", { name: "Salvar no Drive", exact: true }).click();
    await uploading;
    await page.getByTestId("drive-panel").screenshot({ path: resolve(evidence, "interrupted.png") });
  } else {
    await message.waitFor();
    assert.match(await message.innerText(), /Gravações enviadas: 1/);
    await pending.waitFor({ state: "detached" });
    const files = [...drive.files.values()].filter((file) => file.name === "Projeto nativo pendente.desvtag");
    assert.equal(files.length, 1);
    assert.equal(Buffer.from(files[0].bytes).subarray(0, 2).toString(), "PK");
    await page.getByTestId("drive-panel").screenshot({ path: resolve(evidence, "resumed.png") });
  }
  writeFileSync(resolve(evidence, `${phase}.json`), JSON.stringify({ phase, requests: drive.requests }, null, 2));
  console.log(`OK: fila nativa (${phase}).`);
}
