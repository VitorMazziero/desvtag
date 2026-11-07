// ET24/ET23 transport benchmark. Data construction only; all analyses use the real engine.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { cpus, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const json = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function mixedRequest(c) {
  return c.request ?? {
    dataset: {
      factors: [], responses: [{ id: "y", name: "Response", unit: null }],
      observations: c.rows.map((row, i) => ({ id: `o${i + 1}`, unitId: row.unit, factors: [], responses: [row.y] })),
    },
    spec: { responseId: "y", intercept: true, terms: [], coding: "treatment", confidenceLevel: 0.95 },
    advanced: {
      covariance: c.structure === "cs" ? "compoundSymmetry" : c.structure,
      times: c.times, timeLabels: [], timeEffect: "categorical", marginalFactors: [],
      marginalTime: true, adjustment: "bonferroni", references: [],
    },
  };
}

export function benchmarkCases() {
  if (process.env.ET24_BENCH_CASES_FILE) {
    const selected = json(process.env.ET24_BENCH_CASES_FILE);
    if (!Array.isArray(selected) || !selected.length || selected.some((c) => !/^[a-zA-Z0-9_-]+$/.test(c.name))) throw new Error("Invalid named benchmark cases");
    return selected;
  }
  const profiles = json("validation/cases/nonlinear_profile/profile.json").cases;
  const mixed = [
    ...json("validation/cases/repeated_covariance/reml.json").cases,
    ...json("validation/cases/repeated_covariance/factorial.json").cases,
  ];
  const powers = json("validation/cases/power_advanced/power.json").cases;
  const cases = [
    ...profiles.map((c) => ({ name: `profile-${c.name}`, operation: { type: "modelNonlinear", ...c.request } })),
    ...mixed.map((c) => ({ name: `mixed-${c.name}`, operation: { type: "modelMixed", ...mixedRequest(c) } })),
    ...powers.map((c) => ({ name: `power-${c.name}`, operation: { type: "powerAnalyze", simulation: null, ...c.request } })),
  ];
  for (const c of profiles.filter((c) => ["monod", "hill"].includes(c.name))) {
    const request = structuredClone(c.request);
    // Repeated fixture rows are a load scenario, not new independent validation data.
    request.x = Array.from({ length: 8 }, () => request.x).flat();
    request.y = Array.from({ length: 8 }, () => request.y).flat();
    cases.push({ name: `profile-${c.name}-256`, operation: { type: "modelNonlinear", ...request } });
  }
  const bounded = structuredClone(profiles[0].request);
  const cap = profiles[0].expected.estimates[0] * 0.75;
  bounded.upper = [cap, null]; bounded.initial[0] = cap * 0.9;
  cases.push({ name: "profile-monod-boundary", operation: { type: "modelNonlinear", ...bounded } });
  for (const q of [6, 8]) {
    const rows = Array.from({ length: 40 }, (_, u) => Array.from({ length: q }, (_, t) => ({
      unit: `u${u + 1}`, time: t,
      y: 10 + 0.3 * t + Math.sin((u + 1) * (t + 1) * 1.67) + 0.8 * Math.cos((u + 2) * (t + 3) * 0.73) + 0.3 * Math.sin(u),
    }))).flat();
    cases.push({ name: `mixed-un-load-q${q}`, operation: { type: "modelMixed", ...mixedRequest({ rows, times: rows.map((r) => r.time), structure: "unstructured" }) } });
  }
  const predictors = Array.from({ length: 4096 }, (_, row) => Array.from({ length: 32 }, (_, col) => {
    let bits = row & (col + 1), parity = 0;
    while (bits) { parity ^= bits & 1; bits >>>= 1; }
    return parity ? -1 : 1;
  }));
  for (const b of [1000, 1000000]) cases.push({ name: `power-max-4096x32-B${b}`, operation: {
    type: "powerAnalyze", design: { type: "regression", predictors, coefficients: Array(32).fill(0.01) },
    sigma: 1, alpha: 0.05, twoSided: true, goal: { type: "powerAt", n: 24 }, simulation: { seed: 42, replications: b },
  } });
  const saved = json("validation/cases/project_file/power_advanced/regression_power_and_simulation_round_trip_without_recalculation.json");
  for (const count of [100, 1000]) {
    const document = structuredClone(saved);
    const original = document.experiments[0].powerResult.records[0];
    document.experiments[0].powerResult.records = Array.from({ length: count }, (_, i) => ({
      ...structuredClone(original), id: i === 0 ? original.id : `benchmark-power-${i}`,
    }));
    cases.push({ name: `history-${count}-encode`, operation: { type: "projectEncode", document } });
  }
  const filter = process.env.ET24_BENCH_FILTER;
  return filter ? cases.filter((c) => new RegExp(filter).test(c.name)) : cases;
}

/** OS snapshots are outside the timed interval. Summed per-process peaks are an upper bound. */
export async function memorySnapshot(ids, rootPid) {
  if (platform() !== "win32") return { unavailable: "Windows process snapshot only" };
  const safeIds = ids.filter(Number.isSafeInteger).join(",");
  const select = rootPid
    ? `$all=Get-CimInstance Win32_Process; $ids=@(${Number(rootPid)}); do { $next=@($all | Where-Object { $ids -contains $_.ParentProcessId -and $ids -notcontains $_.ProcessId } | ForEach-Object ProcessId); $ids+= $next } while ($next.Count -gt 0)`
    : `$ids=@(${safeIds})`;
  const script = `${select}; $p=@(Get-Process -Id $ids -ErrorAction SilentlyContinue); [pscustomobject]@{processes=$p.Count; workingSetBytes=($p|Measure-Object WorkingSet64 -Sum).Sum; privateBytes=($p|Measure-Object PrivateMemorySize64 -Sum).Sum; sumLifetimePeakWorkingSetUpperBound=($p|Measure-Object PeakWorkingSet64 -Sum).Sum}|ConvertTo-Json -Compress`;
  const { stdout } = await promisify(execFile)("powershell", ["-NoProfile", "-Command", script], { windowsHide: true });
  return JSON.parse(stdout);
}

function filesDigest(folders) {
  const digest = createHash("sha256");
  for (const folder of folders) {
    const base = resolve(root, folder);
    for (const file of readdirSync(base, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => resolve(entry.parentPath, entry.name)).sort()) {
      digest.update(file.slice(root.length).replaceAll("\\", "/"));
      digest.update(readFileSync(file));
    }
  }
  return digest.digest("hex");
}
export async function measureEngine(call, target, output, memory = async () => ({}), extraIdentity = {}) {
  mkdirSync(output, { recursive: true });
  const repetitions = Number(process.env.ET24_BENCH_REPETITIONS ?? 20);
  if (!Number.isInteger(repetitions) || repetitions < 2) throw new Error("At least two measured repetitions required");
  const report = {
    target, recordedAtUtc: new Date().toISOString(), repetitions, warmups: 2,
    environment: { platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemory: totalmem(), node: process.version },
    timing: "JSON transport and response parsing; UI composition/export measured separately; nearest-rank empirical p95",
    memory: "Process snapshots after each case, not allocation counts; sum of lifetime peaks is only an upper bound, not simultaneous peak",
    identity: {
      gitHead: (await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd: root, windowsHide: true })).stdout.trim(),
      sourceTreeSha256: filesDigest(["app/crates", "app/web/src", "app/desktop/src-tauri/src"]),
      sourceSnapshotNote: "Working-tree snapshot at measurement time; compiled artifact hashes are separate. Earlier normal artifacts predate the optional observation hooks and the later resource-budget guards; compare artifact hashes before interpreting a run.",
      distSha256: filesDigest(["app/web/dist"]),
      wasmSha256: createHash("sha256").update(readFileSync(resolve(root, "app/web/src/services/engine/wasm/desvtag_wasm_bg.wasm"))).digest("hex"),
      ...extraIdentity,
    },
    cases: [],
  };
  const summary = resolve(output, "measurements.json");
  for (const c of benchmarkCases()) {
    console.log(`Measuring ${target}: ${c.name}`);
    const request = JSON.stringify({ protocolVersion: 1, taskId: "et24-benchmark", operation: c.operation });
    let response;
    for (let i = 0; i < 2; i++) response = await call(request);
    const parsed = JSON.parse(response);
    const expected = hash(parsed);
    const samples = [];
    for (let i = 0; i < repetitions; i++) {
      const start = performance.now();
      response = await call(request);
      const value = JSON.parse(response);
      samples.push(performance.now() - start);
      if (hash(value) !== expected) throw new Error(`Nondeterministic result: ${c.name}`);
    }
    const ordered = [...samples].sort((a, b) => a - b);
    const item = {
      name: c.name, requestHash: hash(c.operation), resultHash: expected, outcome: parsed.outcome.status,
      samplesMilliseconds: samples, medianMilliseconds: (ordered[Math.floor((repetitions - 1) / 2)] + ordered[Math.floor(repetitions / 2)]) / 2,
      p95Milliseconds: ordered[Math.ceil(repetitions * 0.95) - 1], memory: await memory(),
    };
    report.cases.push(item);
    writeFileSync(resolve(output, `${c.name}.json`), JSON.stringify({ operation: c.operation, response: parsed }, null, 2));
    writeFileSync(summary, JSON.stringify(report, null, 2));
    console.log(`${c.name}: ${item.medianMilliseconds.toFixed(2)} ms median; ${item.p95Milliseconds.toFixed(2)} ms p95; ${item.outcome}`);
    if (c.expectedIssue) {
      if (item.outcome !== "error" || !parsed.outcome.error.issues.some((issue) => issue.code === c.expectedIssue))
        throw new Error(`Expected explicit ${c.expectedIssue}: ${c.name}; inspect stored response`);
    } else if (item.outcome !== "ok") throw new Error(`Benchmark case failed explicitly: ${c.name}; inspect stored response`);
  }
  return report;
}

async function web(output) {
  const { chromium } = await import(pathToFileURL(resolve(root, "app/web/node_modules/playwright-core/index.mjs")));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const Original = Worker;
      window.Worker = new Proxy(Original, { construct(Target, args) {
        window.__benchmarkWorkerUrl = String(args[0]);
        return Reflect.construct(Target, args);
      } });
    });
    await page.goto("http://127.0.0.1:4173/");
    await page.waitForFunction(() => Boolean(window.__benchmarkWorkerUrl));
    await page.evaluate(() => {
      window.__benchmarkWorker = new Worker(window.__benchmarkWorkerUrl, { type: "module" });
      window.__benchmarkId = 0;
    });
    const call = (requestJson) => page.evaluate((requestJson) => new Promise((resolve, reject) => {
      const worker = window.__benchmarkWorker, id = ++window.__benchmarkId;
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error("Benchmark exceeded 120 seconds; worker terminated")); }, 120000);
      worker.onmessage = (event) => { clearTimeout(timeout); event.data.ok ? resolve(event.data.responseJson) : reject(new Error(event.data.message)); };
      worker.onerror = (event) => { clearTimeout(timeout); reject(new Error(event.message)); };
      worker.postMessage({ id, requestJson });
    }), requestJson);
    const cdp = await browser.newBrowserCDPSession();
    await measureEngine(call, "Chromium real WASM worker", output, async () => {
      const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
      return memorySnapshot(processInfo.map((p) => p.id));
    }, { userAgent: await page.evaluate(() => navigator.userAgent) });
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2] !== "web" || !process.argv[3]) throw new Error("Usage: node measure_et24.mjs web <existing-evidence-subdirectory>");
  await web(resolve(process.argv[3]));
}
