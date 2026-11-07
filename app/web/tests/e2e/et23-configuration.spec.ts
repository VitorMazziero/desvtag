import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { startObjective } from "./startObjective";

test.use({ locale: "pt-BR", acceptDownloads: true });
test("T02/T04/T05: categorical time source, interaction, covariate reference and Holm", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  const source = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../../../../validation/cases/repeated_covariance/factorial.json", import.meta.url),
      ),
      "utf8",
    ),
  ).cases[1];
  await page.goto("/");
  await startObjective(page, "analyze");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…", exact: true }).click();
  const csv =
    "unit_id;Group;Occasion;Covariate;Response\n" +
    source.request.dataset.observations
      .map((o: { unitId: string; factors: (string | number)[]; responses: number[] }) =>
        [o.unitId, ...o.factors, o.responses[0]].join(";"),
      )
      .join("\n");
  await (await chooser).setFiles({
    name: "factorial-repeated.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await page.getByTestId("data-blocks-next").click();
  await page
    .getByRole("combobox", { name: "Estrutura das observações", exact: true })
    .selectOption("repeated");
  await page.getByTestId("repeated-method").selectOption("mixed");
  await page
    .getByRole("checkbox", { name: "Usar inferência e covariâncias avançadas", exact: true })
    .check();
  await page.getByTestId("mixed-covariance").selectOption("ar1");
  await page.getByTestId("mixed-time-source").selectOption("f2");
  await page.getByTestId("mixed-occasion-order").fill("Before; During; After");
  const options = page.getByTestId("mixed-options");
  await options.getByRole("checkbox", { name: "Group × Occasion", exact: true }).check();
  await options.getByRole("checkbox", { name: "Group", exact: true }).check();
  await options.getByRole("textbox", { name: /^Referência de Covariate/ }).fill("2,25");
  await options
    .getByRole("combobox", { name: "Ajuste por família de comparações", exact: true })
    .selectOption("holm");
  await expect(page.getByTestId("mixed-existing-time-effect")).toContainText(
    "Occasion já está selecionado",
  );
  await options.screenshot({ path: info.outputPath("T02-T05-factorial-configuration.png") });
  await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
  await expect(page.getByTestId("mixed-advanced-summary")).toBeVisible();
  await expect(page.getByTestId("mixed-advanced-summary")).toContainText(
    "Group + Occasion + Covariate + Group × Occasion",
  );
  await expect(page.getByTestId("mixed-advanced-summary")).not.toContainText(
    "Não incluir como efeito fixo",
  );
  await expect(page.getByTestId("mixed-term-tests").locator("tbody tr")).toHaveCount(4);
  await expect(page.getByTestId("mixed-marginal-means").locator("tbody tr")).toHaveCount(3);
  await expect(page.getByTestId("mixed-marginal-comparisons").locator("tbody tr")).toHaveCount(3);
  await expect(page.getByTestId("mixed-profile-chart").locator("svg")).toContainText(
    "0 = Before; 1 = During; 2 = After",
  );
  const rawValues = await page
    .getByTestId("mixed-marginal-means")
    .locator("tbody tr td:nth-child(3) [data-full-value]")
    .evaluateAll((elements) => elements.map((e) => Number(e.getAttribute("data-full-value"))));
  expect(rawValues).toHaveLength(3);
  rawValues.forEach((value, i) => {
    expect(value).toBeCloseTo(source.expected.means[i].estimate, 4);
  });
  for (const format of ["CSV", "XLSX"]) {
    const event = page.waitForEvent("download");
    await page
      .getByTestId("mixed-marginal-comparisons")
      .getByRole("button", { name: `Diferenças de médias marginais (${format})`, exact: true })
      .click();
    await (await event).saveAs(info.outputPath(`T05-comparisons.${format.toLowerCase()}`));
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByTestId("mixed-profile-chart")
    .screenshot({ path: info.outputPath("T06-ordered-time-profiles.png") });
  const thread = page.getByTestId("comments-table-mixed-term-tests");
  await thread.locator(":scope > summary").click();
  await thread
    .getByLabel("Novo comentário", { exact: true })
    .fill("Conferir a hipótese conjunta com interação.");
  await thread.getByRole("button", { name: "Comentar", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Incluir os comentários do experimento no fim dos relatórios",
      exact: true,
    })
    .check();
  const report = page.waitForEvent("download");
  await page.getByTestId("report-button").click();
  const reportPath = info.outputPath("T07-factorial-comments.html");
  await (await report).saveAs(reportPath);
  const html = readFileSync(reportPath, "utf8");
  expect(html).toContain("Tabela «Testes conjuntos dos efeitos fixos»");
  expect(html).not.toContain("repeated/mixed-term-tests");
  // Removing an explicit fixed effect removes its dependent options, rather than sending hidden terms.
  await page.locator(".steps .step").nth(3).click();
  const fixed = page.getByRole("group", { name: "Efeitos fixos", exact: true });
  await fixed.getByRole("checkbox", { name: "Group", exact: true }).uncheck();
  await expect(
    options.getByRole("checkbox", { name: "Group × Occasion", exact: true }),
  ).toHaveCount(0);
  await expect(options.getByRole("checkbox", { name: "Group", exact: true })).toHaveCount(0);
});
