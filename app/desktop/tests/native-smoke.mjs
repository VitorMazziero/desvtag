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
// NATIVE_DRIVER: caminho do WebDriver nativo (msedgedriver no Windows); no Linux é o WebKitWebDriver do PATH.
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

  // Estatística descritiva pelo IPC nativo: 2, 4, 4, 4, 5, 5, 7, 9 → média 5, variância 32/7.
  const request = {
    protocolVersion: 1,
    taskId: "native-descriptive",
    operation: {
      type: "descriptiveSummarize",
      dataset: {
        factors: [],
        responses: [{ id: "y", name: "y", unit: null }],
        observations: [2, 4, 4, 4, 5, 5, 7, 9].map((v, i) => ({ id: `o${i + 1}`, unitId: null, factors: [], responses: [v] })),
      },
      responseId: "y",
      groupBy: [],
    },
  };
  const script =
    "const done = arguments[arguments.length - 1];" +
    "window.__TAURI_INTERNALS__.invoke('engine_request', { requestJson: arguments[0] })" +
    ".then((r) => done(r)).catch((e) => done('ERROR:' + String(e)));";
  const raw = await call("POST", `/session/${sessionId}/execute/async`, { script, args: [JSON.stringify(request)] });
  const reply = JSON.parse(raw);
  const overall = reply.outcome?.result?.overall;
  console.log({ taskId: reply.taskId, mean: overall?.mean, variance: overall?.variance });
  if (reply.taskId !== "native-descriptive" || overall?.mean?.value !== 5) throw new Error("Média nativa incorreta");
  if (Math.abs(overall.variance.value - 32 / 7) > 1e-12) throw new Error("Variância nativa incorreta");
  console.log("OK: estatística descritiva calculada pelo motor nativo via IPC do Tauri.");
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
