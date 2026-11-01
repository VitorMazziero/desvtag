// Verificações do aplicativo nativo, independentes do mecanismo de automação (WebDriver no
// Linux, CDP no Windows). Recebem funções para ler o texto de um elemento e para chamar o IPC.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = (p) => resolve(import.meta.dirname, "../../..", p);

/**
 * @param {{ text: (testId: string) => Promise<string>, invoke: (requestJson: string) => Promise<string> }} io
 */
export async function runChecks({ text, invoke }) {
  let version = "";
  for (let i = 0; i < 100 && !version; i++) {
    try {
      version = await text("engine-version");
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const environment = await text("engine-environment");
  const protocol = await text("engine-protocol");
  console.log({ version, protocol, environment });
  if (version !== "0.1.0" || protocol !== "1") throw new Error("Versões inesperadas do motor");
  if (!/Tauri|nativo|native/i.test(environment)) throw new Error("Ambiente não é o nativo Tauri");
  console.log("OK: interface obteve engine.info do motor nativo via comando Tauri.");

  // Estatística descritiva pelo IPC nativo: 2, 4, 4, 4, 5, 5, 7, 9 → média 5, variância 32/7.
  const descriptive = {
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
  const reply = JSON.parse(await invoke(JSON.stringify(descriptive)));
  const overall = reply.outcome?.result?.overall;
  console.log({ taskId: reply.taskId, mean: overall?.mean, variance: overall?.variance });
  if (reply.taskId !== "native-descriptive" || overall?.mean?.value !== 5) throw new Error("Média nativa incorreta");
  if (Math.abs(overall.variance.value - 32 / 7) > 1e-12) throw new Error("Variância nativa incorreta");
  console.log("OK: estatística descritiva calculada pelo motor nativo via IPC do Tauri.");

  // Formato .enzitag pelo IPC nativo: arquivo escrito por Python (independente do Rust).
  const golden = readFileSync(root("validation/cases/project_file/001-valid.enzitag"));
  const expected = JSON.parse(readFileSync(root("validation/cases/project_file/001-valid.expected.json"), "utf8"));
  const decode = (taskId, bytes) =>
    JSON.stringify({ protocolVersion: 1, taskId, operation: { type: "projectDecode", bytesBase64: bytes.toString("base64") } });
  const decoded = JSON.parse(await invoke(decode("native-decode", golden)));
  if (decoded.outcome?.status !== "ok") throw new Error(`Falha ao ler o .enzitag: ${JSON.stringify(decoded)}`);
  if (JSON.stringify(decoded.outcome.result.document) !== JSON.stringify(expected)) throw new Error("Documento nativo difere do esperado");
  console.log("OK: arquivo .enzitag escrito em Python lido pelo motor nativo (", decoded.outcome.result.document.name, ").");

  // Arquivo adulterado é recusado com o código esperado, sem exceção.
  const tampered = readFileSync(root("validation/cases/project_file/003-tampered.enzitag"));
  const bad = JSON.parse(await invoke(decode("native-tampered", tampered)));
  if (bad.outcome?.error?.issues?.[0]?.code !== "project.integrity_failed") throw new Error("Adulteração não detectada");
  console.log("OK: arquivo adulterado recusado com project.integrity_failed.");

  // XLSX pelo IPC nativo (valores armazenados; fórmula sem valor vira vazia).
  const xlsx = readFileSync(root("validation/cases/import_xlsx/001-acentos-virgula-ausentes-formula/input.xlsx"));
  const sheet = JSON.parse(
    await invoke(
      JSON.stringify({
        protocolVersion: 1,
        taskId: "native-xlsx",
        operation: { type: "importXlsx", bytesBase64: xlsx.toString("base64"), sheet: null },
      }),
    ),
  );
  const rows = sheet.outcome?.result?.rows;
  if (rows?.[1]?.[0] !== "Água" || rows?.[1]?.[1] !== "10,5") throw new Error("XLSX nativo incorreto");
  console.log("OK: planilha XLSX lida pelo motor nativo.");
}
