import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { showAllSections } from "./showAll";
import { THEME_LIST } from "./themes";

// Comentários de revisão (ET20) com o motor Rust real: escrever na figura e no experimento,
// responder, resolver, salvar e reabrir o projeto e levar os comentários ao relatório.

const example = fileURLToPath(
  new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
);

async function openExample(page: Page) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByTestId("export-panel")).toBeVisible();
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.beforeEach(async ({ page }) => {
  await showAllSections(page);
});

test("comentários na figura e no experimento sobrevivem a salvar e reabrir e vão ao relatório", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openExample(page);

  // Comentário na primeira figura.
  const figure = page.getByTestId("observed-predicted-chart");
  const thread = figure.locator("details.comments");
  await expect(thread.locator("summary")).toContainText("Comentários (0; 0 em aberto)");
  await thread.locator("summary").click();
  await thread.getByLabel("Novo comentário").fill("Conferir o ponto central\ndesta superfície.");
  await thread.getByLabel("Seu nome").fill("Ana");
  await thread.getByRole("button", { name: "Comentar" }).click();
  await expect(thread.locator("summary")).toContainText("Comentários (1; 1 em aberto)");
  await expect(thread.getByTestId("comment-c1")).toContainText("Conferir o ponto central");
  await expect(thread.getByTestId("comment-c1")).toContainText("Ana");
  await expect(thread.getByTestId("comment-c1")).toContainText(/revisão v\d+/);

  // Comentário sobre o experimento, resposta e resolução, no painel.
  const panel = page.getByTestId("comments-panel");
  await panel.locator("summary").click();
  await expect(panel.getByTestId("comment-c1")).toBeVisible(); // o da figura também aparece aqui
  await panel.getByLabel("Novo comentário").fill("Repetir com mais um ponto central.");
  await panel.getByRole("button", { name: "Comentar" }).click();
  const second = panel.getByTestId("comment-c2");
  await expect(second).toContainText("Experimento");
  await second.getByRole("button", { name: "Responder" }).click();
  await second.getByLabel("Resposta").fill("Combinado.");
  await second.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(second).toContainText("Combinado.");
  await second.getByRole("button", { name: "Resolver" }).click();
  await expect(second).toContainText("resolvido");
  await expect(panel.locator("summary")).toContainText("2; 1 em aberto");

  // Salvar e reabrir: nada se perde.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const saved = await (await download).path();
  const entries = unzipSync(new Uint8Array(readFileSync(saved as string)));
  const projectJson = Object.entries(entries).find(([name]) => name.endsWith(".json"));
  expect(
    Object.keys(entries).some((name) =>
      strFromU8(entries[name] as Uint8Array).includes("Combinado."),
    ),
    `o arquivo salvo deve conter a resposta (${projectJson?.[0]})`,
  ).toBe(true);

  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(saved as string);
  await expect(page.getByTestId("comments-panel")).toBeVisible();
  const reopened = page.getByTestId("comments-panel");
  await expect(reopened.locator("summary")).toContainText("2; 1 em aberto");
  await reopened.locator("summary").click();
  await expect(reopened.getByTestId("comment-c1")).toContainText("Conferir o ponto central");
  await expect(reopened.getByTestId("comment-c2")).toContainText("Combinado.");

  // O relatório só leva os comentários quando o usuário pede.
  const without = page.waitForEvent("download");
  await page.getByTestId("report-button").click();
  expect(readFileSync((await (await without).path()) as string, "utf8")).not.toContain(
    "Repetir com mais um ponto central.",
  );
  await page.getByLabel("Incluir os comentários do experimento no fim dos relatórios").check();
  const withComments = page.waitForEvent("download");
  await page.getByTestId("report-button").click();
  const html = readFileSync((await (await withComments).path()) as string, "utf8");
  expect(html).toContain("Repetir com mais um ponto central.");
  expect(html).toContain("Combinado.");
  expect(html).toContain("Conferir o ponto central");
  expect(html).toContain("resolvido");

  const word = page.waitForEvent("download");
  await page.getByTestId("report-docx-button").click();
  const docx = unzipSync(new Uint8Array(readFileSync((await (await word).path()) as string)));
  const document = strFromU8(docx["word/document.xml"] as Uint8Array);
  expect(document).toContain("Repetir com mais um ponto central.");
  expect(document).toContain("Combinado.");
});

test("excluir um comentário pede confirmação", async ({ page }) => {
  await openExample(page);
  const panel = page.getByTestId("comments-panel");
  await panel.locator("summary").click();
  await panel.getByLabel("Novo comentário").fill("Provisório");
  await panel.getByRole("button", { name: "Comentar" }).click();
  await expect(panel.getByTestId("comment-c1")).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await panel.getByRole("button", { name: "Excluir" }).click();
  await expect(panel.getByTestId("comment-c1")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await panel.getByRole("button", { name: "Excluir" }).click();
  await expect(panel.getByTestId("comment-c1")).toHaveCount(0);
});

for (const theme of THEME_LIST) {
  test(`axe: painel de comentários aberto, com resposta, no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await openExample(page);
    const panel = page.getByTestId("comments-panel");
    await panel.locator("summary").click();
    await panel.getByLabel("Novo comentário").fill("Revisar");
    await panel.getByRole("button", { name: "Comentar" }).click();
    await panel.getByRole("button", { name: "Responder" }).click();
    await panel.getByLabel("Resposta").fill("Feito");
    await panel.getByRole("button", { name: "Enviar resposta" }).click();
    await panel.getByRole("button", { name: "Resolver" }).click();
    const result = await new AxeBuilder({ page })
      .include('[data-testid="comments-panel"]')
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
