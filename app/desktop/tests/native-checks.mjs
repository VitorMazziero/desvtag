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

  // Modelo linear pelo IPC nativo: NIST Norris contra a referência exata (validation/cases/linear_model).
  const norris = root("validation/cases/linear_model/001-nist-norris");
  const [header, ...lines] = readFileSync(`${norris}/input.csv`, "utf8").trim().split("\n");
  const names = header.split(",");
  const rowsNorris = lines.map((l) => l.split(",").map(Number));
  const exact = JSON.parse(readFileSync(`${norris}/expected.json`, "utf8")).exactOnBinary64Inputs;
  const fit = JSON.parse(
    await invoke(
      JSON.stringify({
        protocolVersion: 1,
        taskId: "native-fit",
        operation: {
          type: "modelFitLinear",
          dataset: {
            factors: [{ id: "x", name: "x", kind: "numeric", unit: null, levels: [] }],
            responses: [{ id: "y", name: "y", unit: null }],
            observations: rowsNorris.map((r, i) => ({
              id: `o${i + 1}`,
              unitId: null,
              factors: [r[names.indexOf("x")]],
              responses: [r[names.indexOf("y")]],
            })),
          },
          spec: {
            responseId: "y",
            intercept: true,
            terms: [{ type: "main", factorId: "x" }],
            coding: "treatment",
            confidenceLevel: 0.95,
          },
        },
      }),
    ),
  );
  const coefficients = fit.outcome?.result?.coefficients;
  for (const [i, c] of coefficients.entries()) {
    const want = Number(exact.coefficients[i].estimate);
    if (Math.abs(c.estimate.value - want) > 1e-9 * Math.abs(want)) throw new Error(`Coeficiente ${i} nativo incorreto`);
  }
  if (Math.abs(fit.outcome.result.anova.f.value / Number(exact.f) - 1) > 1e-9) throw new Error("F nativo incorreto");
  console.log("OK: regressão linear (NIST Norris) calculada pelo motor nativo via IPC do Tauri.");

  // Distribuições pelo IPC nativo: t de Student 0,975 com 10 g.l. = 2,228138851986274 (tabela).
  const quantile = JSON.parse(
    await invoke(
      JSON.stringify({
        protocolVersion: 1,
        taskId: "native-dist",
        operation: { type: "distributionEvaluate", distribution: { type: "studentT", df: 10 }, function: "quantileUpper", values: [0.025] },
      }),
    ),
  );
  if (Math.abs(quantile.outcome?.result?.values?.[0]?.value - 2.228138851986274) > 1e-11) throw new Error("Quantil t nativo incorreto");
  console.log("OK: distribuição t avaliada pelo motor nativo via IPC do Tauri.");

  // Comparação de tratamentos pelo IPC nativo: caso 101 (SciPy/NumPy), ANOVA, Tukey e letras.
  const caseDir = root("validation/cases/one_way_comparison/101-enzimas-quatro-condicoes");
  const cmp = JSON.parse(readFileSync(`${caseDir}/expected.json`, "utf8"));
  const csvLines = readFileSync(`${caseDir}/input.csv`, "utf8").trim().split("\n").slice(1);
  const compared = JSON.parse(
    await invoke(
      JSON.stringify({
        protocolVersion: 1,
        taskId: "native-compare",
        operation: {
          type: "comparisonOneWay",
          dataset: {
            factors: [{ id: "treatment", name: "treatment", kind: "categorical", unit: null, levels: cmp.levels }],
            responses: [{ id: "y", name: "y", unit: null }],
            observations: csvLines.map((line, i) => {
              const cut = line.lastIndexOf(",");
              return { id: `o${i + 1}`, unitId: null, factors: [line.slice(0, cut)], responses: [Number(line.slice(cut + 1))] };
            }),
          },
          responseId: "y",
          factorId: "treatment",
          alpha: 0.05,
        },
      }),
    ),
  );
  const one = compared.outcome?.result;
  if (Math.abs(one.anova.f.value / cmp.anova.f - 1) > 1e-9) throw new Error("F da comparação nativa incorreto");
  if (JSON.stringify(one.letters.letters) !== JSON.stringify(cmp.letters)) throw new Error("Letras nativas incorretas");
  for (const [i, c] of one.tukey.comparisons.entries()) {
    if (Math.abs(c.pAdjusted.value - cmp.tukey.pairs[i].pAdjusted) > 1e-10) throw new Error(`p ajustado do par ${i} incorreto`);
  }
  console.log("OK: ANOVA, Tukey e letras calculados pelo motor nativo via IPC do Tauri.", one.letters.letters.join(","));

  {
    // Planejamento pelo IPC nativo: a ordem aleatória (PCG32 + Fisher–Yates, semente 20261101) deve
    // coincidir com a enumeração independente em Python, e a análise com o NumPy/SciPy.
    const designCases = JSON.parse(readFileSync(root("validation/cases/two_level_design/designs.json"), "utf8")).cases;
    const randomized = designCases.find((c) => c.kind === "full" && c.randomize && c.seed === 20261101);
    const spec = {
      kind: { type: "fullFactorial" },
      factors: Array.from({ length: randomized.k }, (_, i) => ({
        id: `f${i + 1}`,
        name: `F${i + 1}`,
        low: 10 * (i + 1),
        high: 10 * (i + 1) + 8,
        unit: null,
      })),
      replicates: randomized.replicates,
      centerPoints: randomized.centers,
      randomize: true,
      seed: randomized.seed,
    };
    const generated = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-design", operation: { type: "designGenerate", ...spec } })),
    );
    const runs = generated.outcome?.result?.runs;
    if (!runs || runs.length !== randomized.runsList.length) throw new Error("Número de ensaios nativo incorreto");
    for (const [i, r] of runs.entries()) {
      const w = randomized.runsList[i];
      if (r.run !== w.run || r.standardOrder !== w.standardOrder || JSON.stringify(r.coded) !== JSON.stringify(w.coded)) {
        throw new Error(`Ensaio ${i + 1} do planejamento nativo diverge da referência`);
      }
    }
    console.log("OK: planejamento aleatorizado igual à referência independente via IPC do Tauri.", runs.length, "ensaios");

    const dir = root("validation/cases/two_level_design_analysis/001-fatorial-2x3-replicas-centrais");
    const config = JSON.parse(readFileSync(`${dir}/config.json`, "utf8"));
    const want = JSON.parse(readFileSync(`${dir}/expected.json`, "utf8")).reference;
    const lines = readFileSync(`${dir}/input.csv`, "utf8").trim().split("\n");
    const k = config.spec.factors.length;
    const analysed = JSON.parse(
      await invoke(
        JSON.stringify({
          protocolVersion: 1,
          taskId: "native-design-analysis",
          operation: {
            type: "designAnalyze",
            dataset: {
              factors: lines[0].split(",").slice(0, k).map((n, i) => ({ id: `f${i + 1}`, name: n, kind: "numeric", unit: null, levels: [] })),
              responses: [{ id: "y", name: "y", unit: null }],
              observations: lines.slice(1).map((line, r) => {
                const cells = line.split(",").map(Number);
                return { id: `o${r + 1}`, unitId: null, factors: cells.slice(0, k), responses: [cells[k]] };
              }),
            },
            responseId: "y",
            spec: config.spec,
            terms: config.terms.map((t) =>
              t.length === 1
                ? { type: "main", factorId: `f${t.charCodeAt(0) - 64}` }
                : { type: "interaction", factorIds: [...t].map((c) => `f${c.charCodeAt(0) - 64}`) },
            ),
            alpha: config.alpha,
            includeCurvature: config.includeCurvature,
          },
        }),
      ),
    );
    const result = analysed.outcome?.result;
    if (!result) throw new Error(`Análise de planejamento nativa falhou: ${JSON.stringify(analysed.outcome)}`);
    for (const [i, e] of result.effects.entries()) {
      const w = want.coefficients[i + 1];
      if (Math.abs(e.effect.value - w.effect) > 1e-9 * Math.abs(w.effect) + 1e-10) throw new Error(`Efeito ${e.label} nativo incorreto`);
      if (Math.abs(e.pValue.value - w.p) > 1e-9 * Math.abs(w.p) + 1e-12) throw new Error(`p de ${e.label} nativo incorreto`);
    }
    console.log("OK: efeitos e valores-p do planejamento 2³ calculados pelo motor nativo via IPC do Tauri.");
  }

  // Superfície de resposta pelo IPC nativo: matriz do composto central e análise do caso 002 (FCD).
  {
    const surfaceCases = JSON.parse(readFileSync(root("validation/cases/surface_design/designs.json"), "utf8")).cases;
    const ccd = surfaceCases.find((c) => c.kind === "centralComposite" && c.k === 3 && c.axial === "rotatable");
    const ccdSpec = {
      kind: { type: "centralComposite", axial: { type: "rotatable" }, inscribed: false, generators: [] },
      factors: [1, 2, 3].map((i) => ({ id: `f${i}`, name: `F${i}`, low: 10 * i, high: 10 * i + 8, unit: null })),
      replicates: 1,
      centerPoints: 0,
      randomize: false,
      seed: 1,
    };
    const generatedCcd = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-ccd", operation: { type: "designGenerate", ...ccdSpec } })),
    );
    const ccdRuns = generatedCcd.outcome?.result?.runs;
    if (!ccdRuns || ccdRuns.length !== ccd.rows.length) throw new Error("Composto central nativo com número de ensaios incorreto");
    for (const [i, r] of ccdRuns.entries()) {
      if (r.coded.some((v, j) => Math.abs(v - ccd.rows[i][j]) > 1e-12)) throw new Error(`Ensaio ${i + 1} do composto central diverge`);
    }
    if (Math.abs(generatedCcd.outcome.result.axialDistance - ccd.alpha) > 1e-12) throw new Error("α nativo incorreto");

    const dir = root("validation/cases/response_surface/002-fcd-3-fatores");
    const config = JSON.parse(readFileSync(`${dir}/config.json`, "utf8"));
    const want = JSON.parse(readFileSync(`${dir}/expected.json`, "utf8")).reference;
    const csv = readFileSync(`${dir}/input.csv`, "utf8").trim().split("\n");
    const k = config.factors.length;
    const surface = {
      dataset: {
        factors: config.factors.map((f) => ({ id: f.id, name: f.name, kind: "numeric", unit: null, levels: [] })),
        responses: [{ id: "y", name: "y", unit: null }],
        observations: csv.slice(1).map((line, r) => {
          const cells = line.split(",").map(Number);
          return { id: `o${r + 1}`, unitId: null, factors: cells.slice(0, k), responses: [cells[k]] };
        }),
      },
      responseId: "y",
      factors: config.factors.map((f) => ({ ...f, unit: null })),
      terms: config.terms.map((t) => {
        const ids = [...t].map((c) => `f${c.charCodeAt(0) - 64}`);
        return ids.length === 1
          ? { type: "main", factorId: ids[0] }
          : ids[0] === ids[1]
            ? { type: "power", factorId: ids[0], degree: 2 }
            : { type: "interaction", factorIds: ids };
      }),
      alpha: config.alpha,
    };
    const analysed = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-surface", operation: { type: "surfaceAnalyze", ...surface } })),
    );
    const surfaceResult = analysed.outcome?.result;
    if (!surfaceResult) throw new Error(`Análise de superfície nativa falhou: ${JSON.stringify(analysed.outcome)}`);
    for (const [i, row] of [surfaceResult.intercept, ...surfaceResult.terms].entries()) {
      const w = want.coefficients[i];
      if (Math.abs(row.estimate.value - w.coefficient) > 1e-8 * Math.abs(w.coefficient) + 1e-9) throw new Error(`Coeficiente ${row.label} nativo incorreto`);
      if (Math.abs(row.pValue.value - w.p) > 1e-8 * Math.abs(w.p) + 1e-12) throw new Error(`p de ${row.label} nativo incorreto`);
    }
    if (Math.abs(surfaceResult.anova.rSquared.value - want.anova.r2) > 1e-9) throw new Error("R² nativo incorreto");
    if (Math.abs(surfaceResult.lackOfFit.f.value - want.lackOfFit.f) > 1e-8 * want.lackOfFit.f) throw new Error("Falta de ajuste nativa incorreta");
    const axes = config.gridAxes;
    const gridResponse = JSON.parse(
      await invoke(
        JSON.stringify({
          protocolVersion: 1,
          taskId: "native-grid",
          operation: {
            type: "surfaceGrid",
            surface,
            xFactor: `f${axes[0] + 1}`,
            yFactor: `f${axes[1] + 1}`,
            fixed: [],
            stepsX: 5,
            stepsY: 5,
            contourLevels: 6,
          },
        }),
      ),
    );
    const grid = gridResponse.outcome?.result;
    for (const [iy, row] of want.grid.entries()) {
      for (const [ix, cell] of row.entries()) {
        if (Math.abs(grid.z[iy][ix].value - cell.z) > 1e-8 * Math.abs(cell.z) + 1e-9) throw new Error(`Malha [${iy}][${ix}] nativa incorreta`);
        if (grid.extrapolated[iy][ix] !== cell.extrapolated) throw new Error(`Extrapolação [${iy}][${ix}] nativa incorreta`);
      }
    }
    console.log("OK: composto central, ajuste de superfície, falta de ajuste e malha calculados pelo motor nativo via IPC do Tauri.");
  }

  // Otimização por desejabilidade pelo IPC nativo: caso 002 (duas respostas em conflito) contra a
  // busca exaustiva independente, e a mesma semente produzindo os mesmos candidatos.
  {
    const dir = root("validation/cases/desirability_optimization/002-duas-respostas-conflito");
    const config = JSON.parse(readFileSync(`${dir}/config.json`, "utf8"));
    const want = JSON.parse(readFileSync(`${dir}/expected.json`, "utf8")).reference;
    const csv = readFileSync(`${dir}/input.csv`, "utf8").trim().split("\n");
    const k = config.factors.length;
    const term = (t) => {
      const ids = [...t].map((c) => `f${c.charCodeAt(0) - 64}`);
      return ids.length === 1
        ? { type: "main", factorId: ids[0] }
        : ids[0] === ids[1]
          ? { type: "power", factorId: ids[0], degree: 2 }
          : { type: "interaction", factorIds: ids };
    };
    const optimization = {
      dataset: {
        factors: config.factors.map((f) => ({ id: f.id, name: f.name, kind: "numeric", unit: null, levels: [] })),
        responses: config.responses.map((r) => ({ id: r.id, name: r.id.toUpperCase(), unit: null })),
        observations: csv.slice(1).map((line, i) => {
          const cells = line.split(",").map(Number);
          return { id: `o${i + 1}`, unitId: null, factors: cells.slice(0, k), responses: cells.slice(k) };
        }),
      },
      factors: config.factors.map((f) => ({ ...f, unit: null })),
      setup: {
        responses: config.responses.map((r) => ({
          responseId: r.id,
          terms: r.terms.map(term),
          goal: r.goal,
          importance: r.importance,
        })),
        limits: config.responses
          .filter((r) => r.limit.min !== null || r.limit.max !== null)
          .map((r) => ({ responseId: r.id, min: r.limit.min, max: r.limit.max })),
        domain: { type: "region" },
        search: { starts: config.starts, seed: config.seed, maxCandidates: 5, clusterTolerance: 0.05 },
        alpha: config.alpha,
      },
    };
    const call = async (taskId) =>
      JSON.parse(
        await invoke(JSON.stringify({ protocolVersion: 1, taskId, operation: { type: "optimizationRun", ...optimization } })),
      );
    const first = (await call("native-opt-1")).outcome?.result;
    const second = (await call("native-opt-2")).outcome?.result;
    if (!first || first.status !== "found") throw new Error("Otimização nativa não encontrou candidatos");
    const best = first.candidates[0].globalDesirability;
    if (best < want.bestD - 1e-9 || best > want.bestD + 5e-3) throw new Error(`D nativo ${best} fora da referência ${want.bestD}`);
    if (JSON.stringify(first.candidates) !== JSON.stringify(second.candidates)) throw new Error("Mesma semente, candidatos diferentes");
    for (const c of first.candidates) {
      if (c.violation > first.convergence.feasibilityTolerance) throw new Error("Candidato viola restrição");
    }
    console.log("OK: otimização por desejabilidade (busca com semente) calculada pelo motor nativo via IPC do Tauri. D =", best.toFixed(6));
  }
}
