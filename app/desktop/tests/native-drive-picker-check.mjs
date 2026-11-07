import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const fileId = "shared_test_file";
const name = "Compartilhado.enzitag";
const GAPI = `window.gapi = { load: (_, done) => {
  const view = { setIncludeFolders: () => view, setMode: () => view };
  window.google = { picker: {
    ViewId: { DOCS: "docs" }, DocsViewMode: { LIST: "list" },
    DocsView: function () { return view; },
    PickerBuilder: function () {
      let callback;
      const builder = { addView: () => builder, setOAuthToken: () => builder,
        setDeveloperKey: () => builder, setAppId: () => builder, setOrigin: () => builder,
        setCallback: (fn) => { callback = fn; return builder; },
        build: () => ({ setVisible: () => callback({ action: "picked", docs: [{ id: "${fileId}", name: "${name}" }] }) }),
      };
      return builder;
    },
    Response: { ACTION: "action", DOCUMENTS: "docs" }, Action: { PICKED: "picked", CANCEL: "cancel" },
    Document: { ID: "id", NAME: "name" },
  }};
  done();
} };`;

export async function runPickerCheck(page, chromium, evidence) {
  const bytes = readFileSync(resolve(import.meta.dirname, "../../../examples/19-otimo-misto-em-blocos/projeto.enzitag"));
  const requests = [];
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = new URL(request.url());
    requests.push(url.pathname + (url.searchParams.has("alt") ? "?alt=media" : ""));
    assert.equal(request.headers().authorization, "Bearer optima-test-token");
    assert.equal(url.pathname, `/drive/v3/files/${fileId}`);
    if (url.searchParams.get("alt") === "media") return route.fulfill({ headers, body: bytes });
    await route.fulfill({
      headers,
      json: { id: fileId, name, version: "1", size: String(bytes.length) },
    });
  });
  await page.evaluate(() => localStorage.setItem("optima.language", "pt-BR"));
  await page.reload();
  await page.getByTestId("file-menu").locator(":scope > summary").click();
  await page.getByRole("button", { name: "Conectar ao Google Drive" }).click();
  await page.getByRole("button", { name: "Abrir do Drive…" }).click();
  const handoff = process.env.ENZITAG_TEST_PICKER_HANDOFF;
  let url;
  for (let i = 0; i < 100 && !url; i++) {
    try { url = new URL(readFileSync(handoff, "utf8")); } catch { await sleep(100); }
  }
  assert.equal(url?.origin, "https://vitormazziero.github.io");
  assert.ok(url.pathname.endsWith("/drive-picker.html"));
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const picker = await browser.newPage();
    await picker.route("https://apis.google.com/js/api.js", (route) =>
      route.fulfill({ body: GAPI, contentType: "application/javascript" }));
    const returned = picker.waitForURL(/\/\?state=.*&code=shared_test_file/);
    await picker.goto(`http://127.0.0.1:4173/drive-picker.html${url.hash}`);
    await returned;
    assert.equal(new URL(picker.url()).searchParams.has("token"), false);
    const message = page.getByTestId("drive-message");
    await message.waitFor();
    assert.match(await message.innerText(), /Aberto do Drive/);
    assert.deepEqual(requests, [`/drive/v3/files/${fileId}`, `/drive/v3/files/${fileId}?alt=media`]);
    await page.getByTestId("drive-panel").screenshot({ path: resolve(evidence, "opened.png") });
    writeFileSync(resolve(evidence, "picker.json"), JSON.stringify({ requests, externalBrowser: "Edge", fileOpened: true }, null, 2));
  } finally {
    await browser.close();
  }
  console.log("OK: Picker externo abriu um projeto no aplicativo Windows.");
}
