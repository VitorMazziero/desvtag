// Verificação nativa: abre o aplicativo Tauri real via tauri-driver (WebDriver) e confere
// que a interface obtém `engine.info` do motor Rust nativo (comando `engine_request`).
// Uso: node tests/native-smoke.mjs <caminho-do-executável>
// Requer `tauri-driver` e o WebDriver da plataforma (WebKitWebDriver no Linux, msedgedriver no Windows).
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const app = process.argv[2];
if (!app) {
  console.error("Uso: node tests/native-smoke.mjs <executável>");
  process.exit(2);
}
const base = "http://127.0.0.1:4444";
const driver = spawn("tauri-driver", [], { stdio: ["ignore", "inherit", "inherit"] });
let sessionId;

async function call(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(json)}`);
  return json.value;
}

async function textOf(testId) {
  const el = await call("POST", `/session/${sessionId}/element`, {
    using: "css selector",
    value: `[data-testid="${testId}"]`,
  });
  const id = Object.values(el)[0];
  return call("GET", `/session/${sessionId}/element/${id}/text`);
}

let failed = false;
try {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/status`);
      break;
    } catch {
      await sleep(100);
    }
  }
  const session = await call("POST", "/session", {
    capabilities: { alwaysMatch: { "tauri:options": { application: resolve(app) } } },
  });
  sessionId = session.sessionId;
  let version = "";
  for (let i = 0; i < 100 && !version; i++) {
    try {
      version = await textOf("engine-version");
    } catch {
      await sleep(100);
    }
  }
  const environment = await textOf("engine-environment");
  const protocol = await textOf("engine-protocol");
  console.log({ version, protocol, environment });
  if (version !== "0.1.0" || protocol !== "1") throw new Error("Versões inesperadas do motor");
  if (!/Tauri|nativo|native/i.test(environment)) throw new Error("Ambiente não é o nativo Tauri");
  console.log("OK: interface obteve engine.info do motor nativo via comando Tauri.");
} catch (error) {
  failed = true;
  console.error("FALHA:", error);
} finally {
  if (sessionId) await call("DELETE", `/session/${sessionId}`).catch(() => {});
  driver.kill();
}
process.exit(failed ? 1 : 0);
