// Verificação nativa no Linux: abre o aplicativo Tauri real via tauri-driver (WebDriver) e executa
// as verificações de `native-checks.mjs`. No Windows usa-se `native-cdp.mjs` (WebView2 por CDP).
// Uso: node tests/native-smoke.mjs <caminho-do-executável>
// Requer `tauri-driver` e o WebKitWebDriver do sistema.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { runChecks } from "./native-checks.mjs";

const app = process.argv[2];
if (!app) {
  console.error("Uso: node tests/native-smoke.mjs <executável>");
  process.exit(2);
}
const base = "http://127.0.0.1:4444";
// NATIVE_DRIVER: caminho do WebDriver nativo; no Linux é o WebKitWebDriver do PATH.
const driverArgs = process.env.NATIVE_DRIVER ? ["--native-driver", process.env.NATIVE_DRIVER] : [];
const driver = spawn("tauri-driver", driverArgs, { stdio: ["ignore", "inherit", "inherit"] });
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

async function text(testId) {
  const el = await call("POST", `/session/${sessionId}/element`, { using: "css selector", value: `[data-testid="${testId}"]` });
  return call("GET", `/session/${sessionId}/element/${Object.values(el)[0]}/text`);
}

async function invoke(requestJson) {
  const script =
    "const done = arguments[arguments.length - 1];" +
    "window.__TAURI_INTERNALS__.invoke('engine_request', { requestJson: arguments[0] })" +
    ".then((r) => done(r)).catch((e) => done('ERROR:' + String(e)));";
  return call("POST", `/session/${sessionId}/execute/async`, { script, args: [requestJson] });
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
  await runChecks({ text, invoke });
} catch (error) {
  failed = true;
  console.error("FALHA:", error);
} finally {
  if (sessionId) await call("DELETE", `/session/${sessionId}`).catch(() => {});
  driver.kill();
}
process.exit(failed ? 1 : 0);
