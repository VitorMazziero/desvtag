// ET23: actual IPC, from-scratch UI, immutable records, recovery and report exports.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
const root = (p) => resolve(import.meta.dirname, "../../..", p);
const close = (got, want, rel = 0.003) => {
  if (Math.abs(got - want) > 1e-7 + rel * Math.abs(want))
    throw new Error(`Native repeated mismatch: ${got} != ${want}`);
};
export async function runRepeatedCheck(page, exportDir, evidenceDir) {
  mkdirSync(evidenceDir, { recursive: true });
  const call = async (operation) => {
    const json = await page.evaluate(
      (requestJson) => window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson }),
      JSON.stringify({ protocolVersion: 1, taskId: "et23-native", operation }),
    );
    const response = JSON.parse(json);
    if (response.outcome.status !== "ok") throw new Error(json);
    return response.outcome.result;
  };
  const info = await call({ type: "engineInfo" });
  if (info.capabilities.methods.find((method) => method.id === "linear_mixed_model")?.version !== 2)
    throw new Error("Native method registry is not v2");
  const covariance = JSON.parse(
    readFileSync(root("validation/cases/repeated_covariance/reml.json"), "utf8"),
  );
  const factorial = JSON.parse(
    readFileSync(root("validation/cases/repeated_covariance/factorial.json"), "utf8"),
  );
  const request = (c) =>
    c.request ?? {
      dataset: {
        factors: [],
        responses: [{ id: "y", name: "Response", unit: null }],
        observations: c.rows.map((row, i) => ({
          id: `o${i + 1}`,
          unitId: row.unit,
          factors: [],
          responses: [row.y],
        })),
      },
      spec: {
        responseId: "y",
        intercept: true,
        terms: [],
        coding: "treatment",
        confidenceLevel: 0.95,
      },
      advanced: {
        covariance: c.structure === "cs" ? "compoundSymmetry" : c.structure,
        times: c.times,
        timeLabels: [],
        timeEffect: "categorical",
        marginalFactors: [],
        marginalTime: true,
        adjustment: "bonferroni",
        references: [],
      },
    };
  for (const c of [...covariance.cases, ...factorial.cases]) {
    const result = await call({ type: "modelMixed", ...request(c) });
    if (result.provenance.methodVersion !== 2) throw new Error("Wrong native method version");
    close(result.advanced.remlLogLikelihood, -c.expected.nll, 1e-9);
    result.coefficients.forEach((value, i) => close(value.estimate, c.expected.beta[i], 1e-5));
    result.advanced.fixedCovariance.forEach((value, index) => {
      if (Math.abs(value - c.expected.fixedCovariance[index]) > 3e-5)
        throw new Error("Native fixed-effect covariance differs from dense reference");
    });
    const tests = c.expected.termTests ?? [c.expected.termTest];
    if (result.advanced.termTests.length !== tests.length)
      throw new Error("Native joint-test count");
    result.advanced.termTests.forEach((value, index) => {
      close(value.fValue.value, tests[index].f, 3e-5);
      close(value.denominatorDf.value, tests[index].denominatorDf ?? tests[index].df);
      close(value.pValue.value, tests[index].pValue);
    });
    if (result.advanced.marginalMeans.length !== c.expected.means.length)
      throw new Error("Native EMM count");
    result.advanced.marginalMeans.forEach((value, i) => {
      close(value.inference.estimate, c.expected.means[i].estimate, 1e-5);
      close(value.inference.df.value, c.expected.means[i].df);
    });
    result.advanced.comparisons.forEach((value, i) =>
      close(value.adjustedPValue.value, c.expected.comparisons[i].adjustedPValue),
    );
  }
  const directory = root("validation/cases/project_file/repeated_advanced");
  for (const file of readdirSync(directory).filter((file) => file.endsWith(".enzitag"))) {
    const bytes = readFileSync(resolve(directory, file));
    const decoded = await call({ type: "projectDecode", bytesBase64: bytes.toString("base64") });
    const expected = JSON.parse(
      readFileSync(resolve(directory, file.replace(".enzitag", ".json")), "utf8"),
    );
    if (JSON.stringify(decoded.document) !== JSON.stringify(expected))
      throw new Error("Native advanced archive fields changed");
    const encoded = await call({ type: "projectEncode", document: decoded.document });
    if (encoded.sha256 !== createHash("sha256").update(bytes).digest("hex"))
      throw new Error("Native advanced archive bytes changed");
  }
  console.log("OK: ET23 seven independent native references and advanced archive exact SHA-256.");
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  await page.keyboard.press("Escape");
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.evaluate(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.reload();
  if (
    await page
      .getByTestId("recovery-banner")
      .isVisible()
      .catch(() => false)
  )
    await page
      .getByTestId("recovery-banner")
      .getByRole("button", { name: "Descartar", exact: true })
      .click();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Resposta");
  await page.getByTestId("variables-blocks-next").click();
  const advanced = page.locator("details.advanced").filter({
    has: page.getByRole("checkbox", {
      name: "Mostrar a coluna de unidade experimental",
      exact: true,
      includeHidden: true,
    }),
  });
  await advanced.locator(":scope > summary").click();
  await page
    .getByRole("checkbox", { name: "Mostrar a coluna de unidade experimental", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Mostrar a coluna de tempo / ocasião", exact: true })
    .check();
  await page.getByRole("button", { name: "Adicionar linha", exact: true }).click();
  const source = covariance.cases.find((c) => c.name === "ar1_positive");
  const values = source.rows.map((row) => `${row.unit}\t${row.y}\t${row.time}`).join("\n");
  await page
    .getByRole("textbox", { name: "Unidade experimental — Obs. 1", exact: true })
    .evaluate((element, values) => {
      const data = new DataTransfer();
      data.setData("text/plain", values);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      element.dispatchEvent(event);
    }, values);
  await page.getByTestId("data-blocks-next").click();
  await page
    .getByRole("combobox", { name: "Estrutura das observações", exact: true })
    .selectOption("repeated");
  await page.getByTestId("repeated-method").selectOption("mixed");
  await page
    .getByRole("checkbox", { name: "Usar inferência e covariâncias avançadas", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Informar tempo / ocasião e gerar perfis", exact: true })
    .check();
  await page.getByTestId("mixed-time-effect").selectOption("categorical");
  await page
    .getByRole("checkbox", { name: "Comparar ocasiões do tempo categórico", exact: true })
    .check();
  for (const structure of ["compoundSymmetry", "ar1", "unstructured"]) {
    if (structure !== "compoundSymmetry") await page.locator(".steps .step").nth(3).click();
    await page.getByTestId("mixed-covariance").selectOption(structure);
    await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
    await page.getByTestId("mixed-advanced-summary").waitFor();
    await page
      .getByTestId("mixed-profile-chart")
      .screenshot({ path: resolve(evidenceDir, `native-${structure}-profiles.png`) });
  }
  const original = await page
    .getByTestId("mixed-profile-chart")
    .locator(".chart-canvas")
    .getAttribute("data-export-svg");
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt++) {
    ready = await page.evaluate(async () => {
      const db = await new Promise((ok, fail) => {
        const q = indexedDB.open("enzitag-optima", 1);
        q.onsuccess = () => ok(q.result);
        q.onerror = fail;
      });
      try {
        const value = await new Promise((ok, fail) => {
          const q = db.transaction("recovery").objectStore("recovery").get("workspace");
          q.onsuccess = () => ok(q.result);
          q.onerror = fail;
        });
        return value?.workspace?.experiments?.some(
          (e) => e.mixedModelResult?.records?.length === 3,
        );
      } finally {
        db.close();
      }
    });
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error("Native repeated recovery not saved");
  await page.reload();
  await page
    .getByTestId("recovery-banner")
    .getByRole("button", { name: "Restaurar", exact: true })
    .click();
  await page.getByTestId("mixed-profile-chart").waitFor();
  if (
    original !==
    (await page
      .getByTestId("mixed-profile-chart")
      .locator(".chart-canvas")
      .getAttribute("data-export-svg"))
  )
    throw new Error("Native profile changed on recovery");
  for (const language of ["pt-BR", "en"])
    for (const theme of [
      "soft-light",
      "modern-dark",
      "professional",
      "industrial",
      "organic",
      "clay",
    ]) {
      await page.locator("header.app-header select").first().selectOption(language);
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      await page
        .getByTestId("mixed-profile-chart")
        .screenshot({ path: resolve(evidenceDir, `native-un-${theme}-${language}.png`) });
    }
  for (const [button, extension] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    const before = new Map(
      readdirSync(exportDir)
        .filter((f) => f.endsWith(`-relatorio.${extension}`))
        .map((name) => [
          name,
          createHash("sha256")
            .update(readFileSync(resolve(exportDir, name)))
            .digest("hex"),
        ]),
    );
    await page.getByTestId(button).click();
    let file;
    for (let attempt = 0; attempt < 120 && !file; attempt++) {
      file = readdirSync(exportDir)
        .filter((f) => f.endsWith(`-relatorio.${extension}`))
        .find(
          (name) =>
            before.get(name) !==
            createHash("sha256")
              .update(readFileSync(resolve(exportDir, name)))
              .digest("hex"),
        );
      if (!file) await sleep(250);
    }
    if (!file) throw new Error(`Native repeated ${extension} export missing`);
    copyFileSync(
      resolve(exportDir, file),
      resolve(evidenceDir, `native-un-recovered.${extension}`),
    );
  }
  console.log(
    "OK: ET23 native CS, AR1 and UN calculated from scratch, three records recovered unchanged, six themes/PT/EN and HTML/PDF/Word.",
  );
}
