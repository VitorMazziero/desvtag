// Verificação nativa dos fluxos novos da v0.3 (ET20): no aplicativo Tauri real, sob a CSP de produção,
// exporta o relatório em Word (.docx), escreve um comentário e o leva ao relatório, e confere que a
// preferência de canal de atualização chega ao comando nativo `update_check`. Continua na página em
// que `native-pdf-check.mjs` deixou os resultados de uma comparação de tratamentos. O diálogo
// nativo de «Salvar como» não é automatizável: o executável de verificação é construído com
// `--features automation`, que grava na pasta de `ENZITAG_EXPORT_DIR`.
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const { strFromU8, unzipSync } = await import(
  pathToFileURL(resolve(import.meta.dirname, "../../web/node_modules/fflate/esm/index.mjs")).href
);

async function waitForDocx(dir, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".docx")) : [];
    if (files[0]) return resolve(dir, files[0]);
    await sleep(250);
  }
  throw new Error(`Nenhum .docx apareceu em ${dir}; encontrados: ${readdirSync(dir).join(", ")}`);
}

function inspect(file, kind) {
  const bytes = readFileSync(file);
  if (bytes.subarray(0, 2).toString("latin1") !== "PK") throw new Error(`${kind}: não é um pacote zip`);
  const entries = unzipSync(new Uint8Array(bytes));
  for (const name of ["[Content_Types].xml", "word/document.xml", "word/footer1.xml"])
    if (!entries[name]) throw new Error(`${kind}: falta ${name}`);
  const images = Object.keys(entries).filter((n) => n.startsWith("word/media/"));
  if (images.length === 0) throw new Error(`${kind}: sem figuras`);
  return { bytes, document: strFromU8(entries["word/document.xml"]), images: images.length };
}

/**
 * @param {import("playwright-core").Page} page
 * @param {string} exportDir pasta de `ENZITAG_EXPORT_DIR` do executável
 */
export async function runV03Check(page, exportDir) {
  // 1. Relatório em Word.
  await page.getByTestId("section-export").click();
  await page.getByTestId("report-docx-button").click();
  const first = inspect(await waitForDocx(exportDir, 90000), "Word");
  if (first.bytes.length < 5_000) throw new Error(`Word: pequeno demais (${first.bytes.length} bytes)`);
  if (!first.document.includes("Experimento 1")) throw new Error("Word: o título do relatório não aparece");
  console.log(`OK: relatório em Word gerado no aplicativo nativo (${first.bytes.length} bytes, ${first.images} figura(s)).`);

  // 2. Comentário, opção de incluir nos relatórios e novo Word.
  const panel = page.getByTestId("comments-panel");
  await panel.locator("summary").click();
  await panel.getByLabel("Novo comentário").fill("Conferir a repetição do grupo C no aplicativo nativo.");
  await panel.getByRole("button", { name: "Comentar" }).click();
  await panel.getByTestId("comment-c1").waitFor();
  await page.getByLabel("Incluir os comentários do experimento no fim dos relatórios").check();
  rmSync(resolve(exportDir, readdirSync(exportDir).find((f) => f.endsWith(".docx")) ?? "x"), { force: true });
  await page.getByTestId("report-docx-button").click();
  const second = inspect(await waitForDocx(exportDir, 90000), "Word com comentários");
  if (!second.document.includes("Conferir a repetição do grupo C"))
    throw new Error("Word: o comentário não foi para o relatório");
  console.log("OK: comentário escrito no aplicativo nativo e incluído no relatório em Word.");

  // 3. Canal de atualização: a preferência chega ao comando nativo (sem instalar nada).
  // «Sobre e atualizações» (v0.4, ET29): a verificação de atualizações fica nesse menu.
  await page.getByTestId("about-menu").locator(":scope > summary").click();
  const update = page.getByTestId("update-check");
  await update.waitFor();
  const channel = update.getByLabel("Canal de atualização");
  if ((await channel.inputValue()) !== "experimental") throw new Error("Canal padrão deveria ser o experimental (série 0.x)");
  await channel.selectOption("stable");
  await update.getByRole("button", { name: "Verificar atualizações" }).click();
  // O canal estável ainda não tem manifesto publicado: o comando nativo responde com erro, que a
  // interface mostra como «não foi possível verificar»; a resposta (qualquer uma) prova a ligação.
  const status = update.getByRole("status");
  let text = "";
  for (let i = 0; i < 120; i++) {
    text = (await status.textContent()) ?? "";
    if (text !== "" && !/Verificando/.test(text)) break;
    await sleep(500);
  }
  if (text === "" || /Verificando/.test(text)) throw new Error("A verificação de atualização não respondeu em 60 s");
  console.log(`OK: o comando nativo de atualização respondeu no canal estável: «${text.trim()}».`);
}
