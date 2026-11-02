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
  if (version !== "0.3.0" || protocol !== "1") throw new Error("Versões inesperadas do motor");
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

  // Exportação XLSX pelo IPC nativo: o arquivo é um zip, os números permanecem números e o texto que
  // parece fórmula permanece texto (ida e volta pelo leitor do próprio motor).
  {
    const workbook = {
      sheets: [
        { name: "Dados", rows: [["grupo", "valor"], ["=cmd|' /C calc'!A0", 1.5], ["Água", null]] },
        { name: "Proveniência", rows: [["chave", "valor"], ["app", "EnziTAG Optima"]] },
      ],
    };
    const exported = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-export-xlsx", operation: { type: "exportXlsx", ...workbook } })),
    );
    const base64 = exported.outcome?.result?.bytesBase64;
    if (typeof base64 !== "string") throw new Error("exportXlsx nativo sem arquivo");
    const bytes = Buffer.from(base64, "base64");
    if (bytes.subarray(0, 2).toString("latin1") !== "PK") throw new Error("XLSX nativo não é um zip");
    const back = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-export-xlsx-back", operation: { type: "importXlsx", bytesBase64: base64, sheet: "Dados" } })),
    );
    const got = back.outcome?.result?.rows;
    if (got?.[1]?.[0] !== "=cmd|' /C calc'!A0" || got?.[1]?.[1] !== "1.5" || got?.[2]?.[0] !== "Água")
      throw new Error(`XLSX nativo: ida e volta incorreta ${JSON.stringify(got)}`);
    console.log("OK: XLSX exportado pelo motor nativo via IPC do Tauri e relido (texto de fórmula preservado como texto).");
  }

  // DIC aleatorizado pelo IPC nativo: ordem de execução idêntica à da reimplementação independente
  // em Python (mesmos casos do teste nativo em Rust e do WebAssembly).
  {
    const reference = JSON.parse(readFileSync(root("validation/cases/completely_randomized_design/crd.json"), "utf8"));
    for (const [index, c] of reference.cases.entries()) {
      const reply = JSON.parse(
        await invoke(
          JSON.stringify({
            protocolVersion: 1,
            taskId: `native-crd-${index}`,
            operation: { type: "designCrdGenerate", factorId: "f1", factorName: "Fator", levels: c.levels, replicates: c.replicates, randomize: c.randomize, seed: c.seed },
          }),
        ),
      );
      const runs = reply.outcome?.result?.runs;
      if (reply.outcome?.status !== "ok" || runs?.length !== c.runs.length) throw new Error(`DIC nativo ${index}: ${JSON.stringify(reply.outcome)}`);
      runs.forEach((r, i) => {
        const w = c.runs[i];
        if (r.standardOrder !== w.standardOrder || r.levelIndex !== w.levelIndex || r.level !== w.level || r.replicate !== w.replicate)
          throw new Error(`DIC nativo ${index}: ensaio ${i + 1} difere da referência independente`);
      });
    }
    console.log(`OK: DIC aleatorizado (${reference.cases.length} casos) idêntico à implementação independente no motor nativo via IPC do Tauri.`);
  }

  // Projeto com DIC e personalização por figura: codificar e reler pelo motor nativo preserva os campos.
  {
    const document = structuredClone(decoded.outcome.result.document);
    const experiment = document.experiments[0];
    experiment.crd = { factorId: "f1", factorName: "Condição", levels: ["A", "B"], replicates: 3, randomize: true, seed: 42 };
    experiment.figureStyles = { "means-chart": { title: "Atividade (U/mL)", showLetters: false, fontScale: 1.2 } };
    const encoded = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-project-encode", operation: { type: "projectEncode", document } })),
    );
    if (encoded.outcome?.status !== "ok") throw new Error(`projectEncode nativo: ${JSON.stringify(encoded.outcome)}`);
    const again = JSON.parse(
      await invoke(JSON.stringify({ protocolVersion: 1, taskId: "native-project-decode-2", operation: { type: "projectDecode", bytesBase64: encoded.outcome.result.bytesBase64 } })),
    );
    const back = again.outcome?.result?.document?.experiments?.[0];
    if (JSON.stringify(back?.crd) !== JSON.stringify(experiment.crd) || JSON.stringify(back?.figureStyles) !== JSON.stringify(experiment.figureStyles))
      throw new Error(`Projeto nativo perdeu o DIC ou a personalização: ${JSON.stringify(back?.crd)} ${JSON.stringify(back?.figureStyles)}`);
    // Mesmo documento codificado no WebAssembly (project.parity.test.ts): arquivo idêntico, byte a byte.
    if (encoded.outcome.result.sha256 !== "c9bcb6ac08ec7e35606072e16996d985a3df4f16d29e1e5cce00ba1d3ff57113")
      throw new Error(`SHA-256 do projeto nativo (${encoded.outcome.result.sha256}) difere do codificado no WebAssembly`);
    console.log("OK: projeto com DIC e personalização por figura codificado e relido pelo motor nativo; bytes idênticos aos do WebAssembly.");
  }

  // v0.2 pelo IPC nativo: procedimentos de comparação múltipla, ANOVA multifatorial com blocos e DBC,
  // contra as mesmas referências independentes dos testes em Rust e do WebAssembly.
  {
    const near = (got, want, rel, abs, what) => {
      if (!(Math.abs(got - want) <= abs + rel * Math.abs(want))) throw new Error(`${what}: ${got} ≠ ${want}`);
    };
    const call = async (taskId, operation) => {
      const reply = JSON.parse(await invoke(JSON.stringify({ protocolVersion: 1, taskId, operation })));
      if (reply.outcome?.status !== "ok") throw new Error(`${taskId}: ${JSON.stringify(reply.outcome).slice(0, 300)}`);
      return reply.outcome.result;
    };
    const procedures = JSON.parse(readFileSync(root("validation/cases/multiple_comparison_procedures/procedures.json"), "utf8")).cases;
    for (const c of procedures) {
      const observations = [];
      for (const level of c.levels) for (const y of c.groups[level] ?? []) observations.push({ id: `o${observations.length + 1}`, unitId: null, factors: [level], responses: [y] });
      const result = await call(`native-procedure-${c.id}`, {
        type: "comparisonProcedure",
        dataset: { factors: [{ id: "g", name: "g", kind: "categorical", unit: null, levels: c.levels }], responses: [{ id: "y", name: "y", unit: null }], observations },
        responseId: "y",
        factorId: "g",
        alpha: c.alpha,
        procedure: c.procedure,
      });
      near(result.globalTest.statistic.value, c.expected.global.statistic, 1e-9, 0, `${c.id} estatística global`);
      if (result.pairs.length !== c.expected.pairs.length) throw new Error(`${c.id}: número de pares`);
      result.pairs.forEach((p, i) => {
        const w = c.expected.pairs[i];
        near(p.pAdjusted.value, w.p_adjusted ?? w.p, 1e-6, c.id.startsWith("dunnett") ? 2e-7 : 1e-8, `${c.id} p ajustado do par ${i}`);
      });
    }
    console.log(`OK: ${procedures.length} procedimentos de comparação múltipla (Games–Howell, Bonferroni, Holm, Dunnett, Kruskal–Wallis/Dunn) iguais às referências independentes no motor nativo.`);

    const factorial = JSON.parse(readFileSync(root("validation/cases/factorial_anova/factorial.json"), "utf8")).cases;
    for (const c of factorial) {
      const names = ["A", "B", "Bloco"];
      const result = await call(`native-factorial-${c.id}`, {
        type: "anovaFactorial",
        dataset: {
          factors: names.map((n) => ({ id: n, name: n, kind: "categorical", unit: null, levels: c.levels[n] })),
          responses: [{ id: "y", name: "y", unit: null }],
          observations: c.rows.map((r, i) => ({ id: `o${i + 1}`, unitId: null, factors: names.map((n) => r[n]), responses: [r.y] })),
        },
        responseId: "y",
        factorIds: ["A", "B"],
        blockId: c.with_block ? "Bloco" : null,
        interactionOrder: 2,
        ssType: c.ss_type,
        alpha: c.alpha,
        marginals: [],
        contrasts: [],
      });
      result.terms.forEach((t, i) => {
        const w = c.expected.terms[i];
        if (t.term !== w.term) throw new Error(`${c.id}: termo ${t.term} ≠ ${w.term}`);
        near(t.sumSquares.value, w.ss, 1e-9, 1e-10, `${c.id} SQ de ${w.term}`);
        near(t.pValue.value, w.p, 1e-6, 1e-12, `${c.id} p de ${w.term}`);
      });
    }
    console.log(`OK: ANOVA multifatorial com blocos (${factorial.length} casos, tipos I, II e III) igual ao statsmodels no motor nativo.`);

    // A semente do contrato JSON é um inteiro seguro (≤ 2^53 − 1): o caso com semente maior só vale no Rust.
    const rcbd = JSON.parse(readFileSync(root("validation/cases/randomized_block_design/rcbd.json"), "utf8")).cases.filter((c) =>
      Number.isSafeInteger(c.seed),
    );
    for (const [index, c] of rcbd.entries()) {
      const result = await call(`native-rcbd-${index}`, {
        type: "designRcbdGenerate",
        factorId: "f1",
        factorName: "Tratamento",
        levels: c.levels,
        blockName: "Bloco",
        blocks: c.blocks,
        randomize: c.randomize,
        seed: c.seed,
      });
      const got = result.runs.map((r) => [r.blockIndex, r.levelIndex]);
      const want = c.runs.map((r) => [r.blockIndex, r.levelIndex]);
      if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`DBC nativo ${index}: ordem difere da referência independente`);
    }
    console.log(`OK: DBC aleatorizado (${rcbd.length} casos com semente representável em JavaScript) idêntico à implementação independente no motor nativo.`);
  }

  // v0.3 pelo IPC nativo: níveis mistos, planejamento ótimo, comparação pareada, potência, ajuste não
  // linear e seleção de modelos de dois níveis, contra as mesmas referências independentes dos testes
  // em Rust e do WebAssembly.
  {
    const call = async (taskId, operation) => {
      const reply = JSON.parse(await invoke(JSON.stringify({ protocolVersion: 1, taskId, operation })));
      if (reply.outcome?.status !== "ok") throw new Error(`${taskId}: ${JSON.stringify(reply.outcome).slice(0, 300)}`);
      return reply.outcome.result;
    };
    const cases = (name) => JSON.parse(readFileSync(root(`validation/cases/${name}`), "utf8"));
    const val = (stat) => (stat?.status === "defined" ? stat.value : Number.NaN);
    const near = (got, want, rel, abs, what) => {
      if (!(Math.abs(got - want) <= abs + rel * Math.abs(want))) throw new Error(`${what}: ${got} ≠ ${want}`);
    };

    const mixed = cases("mixed_levels_design/mixed.json").cases.filter((c) => Number.isSafeInteger(c.seed));
    for (const [index, c] of mixed.entries()) {
      const result = await call(`native-mixed-${index}`, {
        type: "designMixedGenerate",
        factors: c.factors.map((f, i) => ({ id: `f${i + 1}`, name: f.name, levels: f.levels })),
        replicates: c.replicates,
        randomize: c.randomize,
        seed: c.seed,
      });
      const got = JSON.stringify(result.runs.map((r) => [r.standardOrder, r.levelIndices, r.replicate]));
      const want = JSON.stringify(c.runs.map((r) => [r.standardOrder, r.levelIndices, r.replicate]));
      if (got !== want) throw new Error(`Níveis mistos nativo ${index}: matriz difere da referência independente`);
    }
    console.log(`OK: níveis mistos (${mixed.length} casos) idênticos à implementação independente no motor nativo.`);

    const factors = [1, 2, 3].map((i) => ({ id: `f${i}`, name: `X${i}`, low: 10, high: 30 }));
    const known = await call("native-optimal-known", {
      type: "designOptimalGenerate",
      factors,
      model: "interactions",
      criterion: "d",
      runs: 8,
      levels: 3,
      constraints: [],
      fixedRuns: [],
      starts: 12,
      randomize: false,
      seed: 7,
    });
    near(known.metrics.logDet, 7 * Math.log(8), 1e-9, 1e-9, "D-ótimo conhecido (2³)");
    for (const [index, c] of cases("optimal_design/optimal.json").exhaustiveCases.entries()) {
      const got = await call(`native-optimal-${index}`, {
        type: "designOptimalGenerate",
        ...c.spec,
        factors: c.spec.factors.map((f, i) => ({ id: `f${i + 1}`, ...f })),
      });
      const value = c.spec.criterion === "d" ? got.metrics.logDet : -got.metrics.iAverage / c.spec.runs;
      near(value, c.expected.best, 1e-9, 1e-9, `ótimo exaustivo ${index}`);
    }
    console.log("OK: planejamento D e I-ótimo iguais ao ótimo conhecido e à busca exaustiva no motor nativo.");

    for (const [index, c] of cases("paired_comparison/paired.json").cases.entries()) {
      const got = await call(`native-paired-${index}`, { type: "comparisonPaired", first: c.first, second: c.second, alpha: 0.05 });
      near(val(got.tTest.t), c.expected.t, 1e-9, 1e-9, `t pareado ${index}`);
      near(val(got.tTest.pValue), c.expected.p, 0, 1e-9, `p pareado ${index}`);
      if (got.wilcoxon.method !== c.expected.wilcoxon.method) throw new Error(`Wilcoxon ${index}: método difere`);
      near(val(got.wilcoxon.pValue), c.expected.wilcoxon.p, 0, 1e-9, `p de Wilcoxon ${index}`);
    }
    console.log("OK: t pareado e Wilcoxon iguais ao SciPy no motor nativo.");

    for (const [index, c] of cases("power_analysis/power.json").cases.entries()) {
      const got = await call(`native-power-${index}`, {
        type: "powerAnalyze",
        design: c.design,
        sigma: c.sigma,
        alpha: c.alpha,
        twoSided: c.twoSided,
        goal: c.goal,
      });
      if (got.n !== c.expected.n) throw new Error(`Potência ${index}: n ${got.n} ≠ ${c.expected.n}`);
      near(val(got.power), c.expected.power, 0, 1e-9, `potência ${index}`);
    }
    for (const [index, c] of cases("nonlinear_saturation_fit/nonlinear.json").cases.entries()) {
      const got = await call(`native-nonlinear-${index}`, {
        type: "modelNonlinear",
        x: c.x,
        y: c.y,
        model: c.model,
        initial: null,
        lower: null,
        upper: null,
        alpha: 0.05,
      });
      if (!got.converged) throw new Error(`Ajuste não linear ${index} não convergiu`);
      for (const [i, p] of got.parameters.entries()) near(p.estimate, c.expected.estimates[i], 1e-5, 1e-8, `parâmetro ${i} do caso ${index}`);
    }
    console.log("OK: potência (F e t não centrais) e ajuste não linear iguais ao SciPy no motor nativo.");

    for (const [index, c] of cases("two_level_model_selection/selection.json").cases.entries()) {
      const k = c.k;
      const designFactors = Array.from({ length: k }, (_, i) => ({ id: `f${i + 1}`, name: `x${i + 1}`, low: c.low[i], high: c.high[i], unit: null }));
      const got = await call(`native-selection-${index}`, {
        type: "designSelectModel",
        dataset: {
          factors: designFactors.map((f) => ({ id: f.id, name: f.name, kind: "numeric", unit: null, levels: [] })),
          responses: [{ id: "y", name: "y", unit: null }],
          observations: c.real.map((row, i) => ({ id: `o${i + 1}`, unitId: null, factors: row, responses: [c.y[i]] })),
        },
        responseId: "y",
        spec: { kind: { type: "fullFactorial" }, factors: designFactors, replicates: 1, centerPoints: 0, randomize: false, seed: 1 },
        terms: [],
        alpha: c.alpha,
        includeCurvature: c.curvature,
      });
      if (got.steps.length !== c.steps.length) throw new Error(`Seleção ${index}: passos ${got.steps.length} ≠ ${c.steps.length}`);
      for (const [i, step] of got.steps.entries()) near(val(step.metrics.aic), c.steps[i].metrics.aic, 1e-10, 1e-8, `AIC ${index}.${i}`);
      if (got.stoppedBecause !== c.stopped) throw new Error(`Seleção ${index}: parada ${got.stoppedBecause} ≠ ${c.stopped}`);
    }
    console.log("OK: seleção de modelos de dois níveis igual ao statsmodels no motor nativo.");
  }

  // Reabertura cruzada: os projetos de exemplo foram escritos pelo motor WebAssembly (navegador) e
  // são lidos aqui pelo motor nativo (Windows), com resultados guardados e sem avisos.
  {
    const { readdirSync, existsSync } = await import("node:fs");
    const folders = readdirSync(root("examples"), { withFileTypes: true }).filter((e) => e.isDirectory());
    let opened = 0;
    for (const folder of folders) {
      const file = root(`examples/${folder.name}/projeto.enzitag`);
      if (!existsSync(file)) continue;
      const reply = JSON.parse(await invoke(decode(`native-example-${folder.name}`, readFileSync(file))));
      const doc = reply.outcome?.result?.document;
      if (reply.outcome?.status !== "ok" || !doc?.experiments?.length)
        throw new Error(`Exemplo ${folder.name} não abriu no motor nativo: ${JSON.stringify(reply.outcome).slice(0, 300)}`);
      if (reply.outcome.result.migratedFrom !== null) throw new Error(`Exemplo ${folder.name}: migração inesperada`);
      // Os exemplos 01 a 06 trazem análises guardadas (reabrir não recalcula); a partir do 07 as análises
      // são calculadas ao pedir (limitação da v0.3), então basta abrir sem migração nem avisos.
      const legacy = Number(folder.name.slice(0, 2)) <= 6;
      if (legacy && !doc.experiments.some((e) => e.analyses?.length > 0)) throw new Error(`Exemplo ${folder.name}: sem análise guardada`);
      opened += 1;
    }
    if (opened < 4) throw new Error(`Esperava abrir os 4 exemplos, abriu ${opened}`);
    console.log(`OK: ${opened} projetos de exemplo (escritos pelo WebAssembly) reabertos pelo motor nativo; os de 01 a 06 com análises guardadas.`);
  }
}
