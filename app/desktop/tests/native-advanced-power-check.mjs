// ET24: production WebView2, native IPC references, real UI and immutable recovery.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
const root = (p) => resolve(import.meta.dirname, "../../..", p);
const json = (p) => JSON.parse(readFileSync(root(p), "utf8"));
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance * (1 + Math.abs(expected)), `${actual} != ${expected}`);
const themes = ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"];
async function openTool(page, kind) {
  const menu=page.getByTestId("extras-menu");
  if ((await menu.getAttribute("open")) === null) await menu.locator(":scope > summary").click();
  await page.getByTestId(`open-${kind}`).click();
  return page.getByTestId(`${kind}-dialog`);
}
export async function exportReports(page, exportDir, evidenceDir, name, timeoutMilliseconds = 30000) {
  const timings = {};
  for (const [id, extension] of [["report-button", "html"], ["report-pdf-button", "pdf"], ["report-docx-button", "docx"]]) {
    const digest = (file) => createHash("sha256").update(readFileSync(resolve(exportDir,file))).digest("hex");
    const before=new Map(readdirSync(exportDir).map(file=>[file,digest(file)]));
    const started = performance.now();
    await page.getByTestId(id).click();
    let found;
    for(let attempt=0;attempt<Math.ceil(timeoutMilliseconds / 250)&&!found;attempt++) {
      found=readdirSync(exportDir).filter(f=>f.endsWith(`-relatorio.${extension}`)).find(f=>before.get(f)!==digest(f));
      if(!found) await sleep(250);
    }
    assert.ok(found,`Missing native ${name} ${extension}`);
    copyFileSync(resolve(exportDir,found),resolve(evidenceDir,`${name}.${extension}`));
    timings[extension] = performance.now() - started;
  }
  return timings;
}
async function captureThemes(page,evidenceDir,name,id) {
  for(const language of ["pt-BR","en"]) for(const theme of themes) {
    await page.locator("header.app-header select").first().selectOption(language);
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    await page.getByTestId(id).screenshot({path:resolve(evidenceDir,`${name}-${theme}-${language}.png`)});
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
}
export async function runAdvancedPowerCheck(page, exportDir, evidenceDir) {
  mkdirSync(evidenceDir,{recursive:true});
  const call=async(operation)=>{
    const value=await page.evaluate(requestJson=>window.__TAURI_INTERNALS__.invoke("engine_request",{requestJson}),JSON.stringify({protocolVersion:1,taskId:"et24-native",operation}));
    const response=JSON.parse(value);assert.equal(response.outcome.status,"ok",value);return response.outcome.result;
  };
  const registry=await call({type:"engineInfo"});
  for(const method of ["power_analysis","nonlinear_saturation_fit"])
    assert.equal(registry.capabilities.methods.find(m=>m.id===method)?.version,2);
  const profiles=json("validation/cases/nonlinear_profile/profile.json").cases;
  for(const source of profiles) {
    const result=await call({type:"modelNonlinear",...source.request});
    close(result.sse,source.expected.sse);
    result.profiles.forEach((p,i)=>{
      assert.equal(p.lowerStatus,"crossing");assert.equal(p.upperStatus,"crossing");
      close(p.lower.value,source.expected.intervals[i][0],0.003);
      close(p.upper.value,source.expected.intervals[i][1],0.003);
    });
  }
  const parity="validation/cases/power_advanced/native_parity";
  for(const file of readdirSync(root(parity))) {
    const source=json(`${parity}/${file}`);const result=await call({type:"powerAnalyze",...source.request});
    close(result.power.value,source.result.power.value,1e-10);
    assert.equal(result.n,source.result.n);assert.equal(result.total,source.result.total);
    assert.deepEqual(result.simulation,source.result.simulation);
  }
  for(const family of ["nonlinear_profile","power_advanced"]) {
    const directory=root(`validation/cases/project_file/${family}`);
    for(const file of readdirSync(directory).filter(f=>f.endsWith(".enzitag"))) {
      const bytes=readFileSync(resolve(directory,file));
      const decoded=await call({type:"projectDecode",bytesBase64:bytes.toString("base64")});
      assert.deepEqual(decoded.document,JSON.parse(readFileSync(resolve(directory,file.replace(".enzitag",".json")),"utf8")));
      const encoded=await call({type:"projectEncode",document:decoded.document});
      assert.equal(encoded.sha256,createHash("sha256").update(bytes).digest("hex"));
    }
  }
  console.log("OK: ET24 four independent profiles, ten power/simulation parity cases and exact native project archive hashes.");
  page.removeAllListeners("dialog");page.on("dialog",dialog=>dialog.accept().catch(()=>{}));
  await page.keyboard.press("Escape");
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.evaluate(()=>localStorage.setItem("optima.showAllSections","1"));await page.reload();
  if(await page.getByTestId("recovery-banner").isVisible().catch(()=>false))
    await page.getByTestId("recovery-banner").getByRole("button",{name:"Descartar",exact:true}).click();
  await page.getByRole("button",{name:"Novo projeto",exact:true}).click();
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  await page.getByRole("button",{name:"Adicionar fator",exact:true}).click();
  await page.getByLabel("Nome",{exact:true}).first().fill("Substrato");
  await page.getByLabel("Tipo",{exact:true}).first().selectOption("numeric");
  await page.getByRole("button",{name:"Adicionar resposta",exact:true}).click();
  await page.getByLabel("Nome",{exact:true}).nth(1).fill("Velocidade");
  await page.getByRole("button",{name:"Avançar",exact:true}).click();
  await page.getByRole("button",{name:"Adicionar linha",exact:true}).click();
  const profile = process.env.NATIVE_INTEGRITY === "1" ? {
    request: { model: "monod", x: [0.1,0.5,1,2,4,8], y: [0.1,0.5,1,2,4,8].map(x=>10*x/(2+x)), initial: [10,2], alpha: 0.05, profile: true }
  } : profiles.find(c=>c.request.model==="hill");
  const values=profile.request.x.map((x,i)=>`${x}\t${profile.request.y[i]}`).join("\n");
  await page.getByLabel("Substrato — Obs. 1",{exact:true}).evaluate((el,text)=>{
    const data=new DataTransfer();data.setData("text/plain",text);const event=new Event("paste",{bubbles:true,cancelable:true});
    Object.defineProperty(event,"clipboardData",{value:data});el.dispatchEvent(event);
  },values);
  let tool=await openTool(page,"saturation");
  await tool.getByTestId("saturation-model").selectOption(profile.request.model);
  await tool.getByRole("checkbox",{name:"Informar valores iniciais",exact:true}).check();
  for(let i=0;i<profile.request.initial.length;i++) await tool.getByTestId(`nonlinear-initial-${i}`).fill(String(profile.request.initial[i]));
  await tool.getByTestId("nonlinear-profile").check();
  await tool.getByTestId("nonlinear-options").scrollIntoViewIfNeeded();
  await tool.getByTestId("nonlinear-options").screenshot({path:resolve(evidenceDir,"native-hill-options.png")});
  await tool.getByRole("button",{name:"Ajustar curva",exact:true}).click();
  await page.getByTestId("likelihood-profiles").waitFor();
  if(process.env.NATIVE_INTEGRITY === "1") {
    await page.getByTestId("saturation-warning").filter({hasText:"Os valores ajustados foram preservados"}).waitFor();
    assert.equal(await page.getByTestId("likelihood-profile-a").count(),0);
    await page.getByTestId("likelihood-profile-unavailable-a").waitFor();
    const exact = await call({type:"modelNonlinear", ...profile.request});
    assert.equal(exact.sse,0);assert.deepEqual(exact.correlation,[]);
    for(const p of exact.parameters) for(const key of ["stdError","tValue","pValue","ciLower","ciUpper"]) assert.equal(p[key].status,"undefined");
    const doc=json("validation/cases/project_file/nonlinear_profile/nonlinear_likelihood_profiles_and_raw_options_round_trip_without_refit.json");
    const record=doc.experiments[0].nonlinearResult.records.at(-1);
    delete exact.type;record.input.request=profile.request;record.result=exact;
    const encoded=await call({type:"projectEncode",document:doc});
    const reopened=await call({type:"projectDecode",bytesBase64:encoded.bytesBase64});
    assert.deepEqual(reopened.document.experiments[0].nonlinearResult.records.at(-1).result,exact);
    for(const scale of [1e-160,1e160]) {
      const power=await call({type:"powerAnalyze",design:{type:"contrast",means:[0,scale],weights:[-1,1],allocation:[1,1]},sigma:scale,alpha:.05,twoSided:true,goal:{type:"powerAt",n:10},simulation:null});
      close(power.power.value,0.5620066465862328,1e-10);
    }
    await page.getByTestId("saturation-result").screenshot({path:resolve(evidenceDir,"native-exact-result.png")});
    console.log("OK: AU-B02 exact-fit UI/native IPC/archive round trip and AU-B04 extreme response units.");
  }
  await captureThemes(page,evidenceDir,process.env.NATIVE_INTEGRITY === "1" ? "native-exact" : "native-hill",process.env.NATIVE_INTEGRITY === "1" ? "saturation-result" : "likelihood-profile-a");
  await exportReports(page,exportDir,evidenceDir,process.env.NATIVE_INTEGRITY === "1" ? "native-exact" : "native-hill");
  const originals=[];
  for(const name of ["regression_correlated","contrast_unequal","factorial_interaction"]) {
    const source=json(`${parity}/${name}.json`);const request=source.request, design=request.design;
    tool=await openTool(page,"power");
    await tool.getByTestId("power-design").selectOption(design.type);
    await tool.getByTestId("power-goal").selectOption(request.goal.type);
    await tool.getByTestId("power-input-sigma").fill(String(request.sigma));
    await tool.getByTestId("power-input-alpha").fill(String(request.alpha));
    await tool.getByTestId("power-input-n").fill(String(request.goal.n));
    if(design.type==="regression") {
      await tool.getByTestId("power-predictors").fill(design.predictors.map(r=>r.join("\t")).join("\n"));
      await tool.getByTestId("power-coefficients").fill(design.coefficients.join(";"));
    } else if(design.type==="contrast") {
      await tool.getByTestId("power-input-means").fill(design.means.join(";"));
      await tool.getByTestId("power-weights").fill(design.weights.join(";"));
      await tool.getByTestId("power-allocation").fill(design.allocation.join(";"));
    } else {
      await tool.getByTestId("power-factorCount").fill(String(design.factors));
      await tool.getByTestId("power-terms").fill(design.terms.map(t=>t.map(f=>f+1).join("*")).join(";"));
      await tool.getByTestId("power-effects").fill(design.effects.join(";"));
      await tool.getByTestId("power-targetTerm").selectOption(String(design.target));
    }
    if(design.type!=="regression") await tool.getByRole("checkbox",{name:"Teste bilateral",exact:true}).setChecked(request.twoSided);
    await tool.getByTestId("power-simulation").check();
    await tool.getByTestId("power-simulation-seed").fill(String(request.simulation.seed));
    await tool.getByTestId("power-simulation-replications").fill(String(request.simulation.replications));
    await tool.getByTestId("power-advanced-options").scrollIntoViewIfNeeded();
    await tool.getByTestId("power-advanced-options").screenshot({path:resolve(evidenceDir,`native-${name}-options.png`)});
    await tool.getByRole("button",{name:"Calcular",exact:true}).click();
    await page.getByTestId("power-simulation-result").waitFor();
    originals.push(await page.getByTestId("power-chart").locator(".chart-canvas").getAttribute("data-export-svg"));
    await captureThemes(page,evidenceDir,`native-${name}`,"power-chart");
    await exportReports(page,exportDir,evidenceDir,`native-${name}`);
  }
  let ready=false;
  for(let attempt=0;attempt<120&&!ready;attempt++) {
    ready=await page.evaluate(async()=>{
      const db=await new Promise((ok,fail)=>{const q=indexedDB.open("enzitag-optima",1);q.onsuccess=()=>ok(q.result);q.onerror=fail;});
      try {const value=await new Promise((ok,fail)=>{const q=db.transaction("recovery").objectStore("recovery").get("workspace");q.onsuccess=()=>ok(q.result);q.onerror=fail;});
        return value?.workspace?.experiments?.some(e=>e.powerResult?.records?.length===3&&e.nonlinearResult?.records?.length===1);
      } finally {db.close();}
    });
    if(!ready) await sleep(100);
  }
  assert.ok(ready,"ET24 native autosave missing");
  await page.reload();await page.getByTestId("recovery-banner").getByRole("button",{name:"Restaurar",exact:true}).click();
  await page.getByTestId("power-chart").waitFor();
  const select=page.getByTestId("result-record");const ids=await select.locator("option").evaluateAll(nodes=>nodes.map(n=>n.value));
  assert.equal(ids.length,3);
  for(let i=0;i<ids.length;i++) {
    await select.selectOption(ids[i]);
    assert.equal(await page.getByTestId("power-chart").locator(".chart-canvas").getAttribute("data-export-svg"),originals[originals.length-1-i]);
  }
  await page.getByTestId("result-family").selectOption("nonlinear");await page.getByTestId("likelihood-profiles").waitFor();
  await page.getByTestId("likelihood-profiles").screenshot({path:resolve(evidenceDir,"native-hill-recovered.png")});
  console.log(`OK: ET24 native ${process.env.NATIVE_INTEGRITY === "1" ? "exact Monod fit without empty profile graphs" : "Hill profile"} and three advanced power designs from scratch; four immutable records recovered, six themes/PT/EN and HTML/PDF/Word.`);
}
