import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const cases = resolve(here, "../../../../validation/cases");
const fixtures = resolve(here, "../fixtures");

async function paste(page: Page, label: string, text: string) {
  await page.getByLabel(label).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

/** Cria objetivo, fator, resposta e três observações no experimento atual. */
async function buildProject(page: Page) {
  await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Condição");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  await paste(page, "Condição — Obs. 1", "Água\t10,5\nÁgua\t11,5\nÁcido\t20\n");
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.describe("recuperação após dois segundos de pausa", () => {
  test("restaura a sessão não salva depois de recarregar", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Nome do projeto").fill("Meu ensaio — açúcar");
    await buildProject(page);
    // Antes da pausa de 2 s a recuperação ainda não foi gravada…
    await expect(page.getByTestId("status-recovery")).toHaveAttribute("data-state", "pending");
    await expect(page.getByTestId("status-changes")).toHaveAttribute("data-unsaved", "true");
    // …e depois dela é gravada (sem uma cópia por tecla).
    await expect(page.getByTestId("status-recovery")).toHaveAttribute("data-state", "saved", {
      timeout: 6000,
    });
    await expect(page.getByTestId("status-recovery")).toContainText(
      "não é uma cópia de segurança externa",
    );

    await page.reload();
    const banner = page.getByTestId("recovery-banner");
    await expect(banner).toContainText("Sessão não salva encontrada");
    await banner.getByRole("button", { name: "Restaurar" }).click();
    await expect(page.getByLabel("Nome do projeto")).toHaveValue("Meu ensaio — açúcar");
    // O fluxo reabre na primeira etapa pendente (análise); os dados estão na etapa anterior.
    await expect(page.getByRole("heading", { name: "Análise: resumo descritivo" })).toBeVisible();
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await expect(page.getByLabel("Atividade — Obs. 3")).toHaveValue("20");
    await expect(page.getByLabel("Condição — Obs. 1")).toHaveValue("Água");
  });

  test("descartar remove a recuperação", async ({ page }) => {
    await page.goto("/");
    await buildProject(page);
    await expect(page.getByTestId("status-recovery")).toHaveAttribute("data-state", "saved", {
      timeout: 6000,
    });
    await page.reload();
    await page.getByTestId("recovery-banner").getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByTestId("recovery-banner")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("recovery-banner")).toHaveCount(0);
  });
});

test.describe("salvar e abrir (estados distintos)", () => {
  test("salvar baixa um .enzitag; abrir restaura dados, experimentos e histórico", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Nome do projeto").fill("Projeto salvo");
    await buildProject(page);
    await page.getByRole("button", { name: "Avançar" }).click(); // análise
    await page.getByLabel("Condição").check();
    await page.getByRole("button", { name: "Calcular resumo" }).click();
    await expect(page.getByTestId("descriptive-table")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("Projeto salvo.enzitag");
    const path = await file.path();
    expect(readFileSync(path).subarray(0, 2).toString()).toBe("PK"); // contêiner ZIP

    // Três estados distintos: arquivo baixado, sem alterações pendentes, recuperação desligada.
    await expect(page.getByTestId("status-file")).toContainText(
      "baixado como «Projeto salvo.enzitag»",
    );
    await expect(page.getByTestId("status-changes")).toHaveAttribute("data-unsaved", "false");
    await expect(page.getByTestId("status-recovery")).toHaveAttribute("data-state", "idle");

    // Editar de novo: volta a haver alterações não salvas.
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await page.getByLabel("Atividade — Obs. 1").fill("99");
    await expect(page.getByTestId("status-changes")).toHaveAttribute("data-unsaved", "true");

    // Abrir o arquivo salvo (a confirmação de descarte é aceita).
    page.once("dialog", (d) => d.accept());
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(path);
    await expect(page.getByLabel("Nome do projeto")).toHaveValue("Projeto salvo");
    await expect(page.getByTestId("status-changes")).toHaveAttribute("data-unsaved", "false");
    // O resultado guardado reaparece sem recalcular e está atual (a edição 99 não estava no arquivo).
    await expect(page.getByTestId("descriptive-table")).toBeVisible();
    await expect(
      page.getByTestId("descriptive-table").getByRole("row", { name: /Condição: Água/ }),
    ).toContainText("11");
    // Histórico: versões e análise guardadas.
    await page.getByTestId("history").locator("summary").click();
    await expect(page.getByTestId("revision").first()).toContainText("atual");
    await expect(page.getByTestId("analysis-record")).toHaveCount(1);
  });

  test("um arquivo inválido mostra o motivo e não altera o projeto aberto", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Nome do projeto").fill("Intacto");
    page.once("dialog", (d) => d.accept());
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(resolve(cases, "project_file/004-not-a-zip.enzitag"));
    await expect(page.getByRole("alert").filter({ hasText: "não é um arquivo ZIP" })).toBeVisible();
    await expect(page.getByLabel("Nome do projeto")).toHaveValue("Intacto");
  });

  test("esquema futuro é recusado com a explicação das versões", async ({ page }) => {
    await page.goto("/");
    page.once("dialog", (d) => d.accept());
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(resolve(cases, "project_file/002-future-schema.enzitag"));
    await expect(page.getByRole("alert")).toContainText("esquema 99");
    await expect(page.getByRole("alert")).toContainText("não foi alterado");
  });

  test("abre o arquivo escrito por Python: dois experimentos, resultado guardado e atual", async ({
    page,
  }) => {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(resolve(cases, "project_file/001-valid.enzitag"));
    await expect(page.getByLabel("Nome do projeto")).toHaveValue(
      "Projeto de referência — açúcar, ß, 日本",
    );
    await expect(page.getByRole("button", { name: "Experimento: Quatro condições" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Experimento: Segundo experimento" }),
    ).toBeVisible();
    // Abre direto nos resultados: tudo satisfeito e o resultado guardado coincide com os dados.
    const table = page.getByTestId("descriptive-table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /Todas as observações/ })).toContainText("27,25");
    await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
    // Trocar de experimento mostra o outro, vazio.
    await page.getByRole("button", { name: "Experimento: Segundo experimento" }).click();
    await expect(page.getByRole("group", { name: "O que você quer fazer?" })).toBeVisible();
  });
});

test.describe("importação", () => {
  async function importFile(page: Page, path: string) {
    await page.goto("/");
    await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Provisório");
    await page.getByRole("button", { name: "Avançar" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…" }).click();
    await (await chooser).setFiles(path);
    await expect(page.getByTestId("import-wizard")).toBeVisible();
  }

  test("CSV em UTF-8 com separador ;, vírgula decimal e ausentes", async ({ page }) => {
    await importFile(page, resolve(fixtures, "dados-ptbr.csv"));
    const preview = page.getByTestId("import-preview");
    await expect(preview).toContainText("Água");
    await expect(preview).toContainText("10,5");
    // Sugestão: Condição = fator, Atividade = resposta; Unidade vira unidade experimental.
    await page.getByLabel("Papel 3").selectOption("unit");
    await page.getByRole("button", { name: "Importar", exact: true }).click();
    await expect(page.getByLabel("Atividade (U/mL) — Obs. 1")).toHaveValue("10,5");
    await expect(page.getByLabel("Atividade (U/mL) — Obs. 4")).toHaveValue(""); // ausente preservado
    await expect(page.getByLabel("Condição — Obs. 3")).toHaveValue("Ácido");
    // A grade mostra a coluna de unidade? Só nas opções avançadas; os dados chegaram à tabela.
    await page.getByTestId("history").locator("summary").click();
    await expect(page.getByTestId("revision").first()).toContainText("importação");
    await expect(page.getByTestId("revision").nth(1)).toContainText("alterações"); // dados anteriores preservados
  });

  test("CSV em Windows-1252 é reconhecido e avisa a troca de codificação", async ({ page }) => {
    await importFile(page, resolve(fixtures, "dados-windows1252.csv"));
    await expect(page.getByText("não era UTF-8 válido")).toBeVisible();
    await expect(page.getByTestId("import-preview")).toContainText("Água");
    await expect(page.getByTestId("import-preview")).toContainText("Ácido");
  });

  test("XLSX pelo motor: valores armazenados, fórmula nunca executada, avisos", async ({
    page,
  }) => {
    await importFile(
      page,
      resolve(cases, "import_xlsx/001-acentos-virgula-ausentes-formula/input.xlsx"),
    );
    const wizard = page.getByTestId("import-wizard");
    await expect(wizard.getByTestId("import-preview")).toContainText("Água");
    await expect(wizard).toContainText(
      "1 célula(s) com fórmula sem valor armazenado foram lidas como vazias",
    );
    await expect(wizard).toContainText("fórmulas nunca são executadas");
    // Troca de planilha pelo seletor.
    await expect(wizard.getByLabel("Planilha")).toHaveValue("Dados");
    await wizard.getByLabel("Planilha").selectOption("Notas");
    await expect(wizard.getByTestId("import-preview")).toContainText("isto não é dado");
  });

  test("identificadores de observação repetidos bloqueiam a importação", async ({ page }) => {
    await importFile(page, resolve(fixtures, "ids-repetidos.csv"));
    await page.getByLabel("Papel 1").selectOption("observation");
    await expect(page.getByRole("alert")).toContainText("repetido nas linhas 2");
    await expect(page.getByRole("button", { name: "Importar", exact: true })).toBeDisabled();
  });
});
