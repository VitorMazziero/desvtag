import assert from "node:assert/strict";
import {mkdirSync,writeFileSync,readFileSync,readdirSync,copyFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";
import {resolve} from "node:path";
import {exportReports} from "./native-advanced-power-check.mjs";
import {memorySnapshot} from "../../../validation/tools/measure_et24.mjs";
export async function runUiTablesCheck(page,exportDir,evidenceDir,pid) {
 const maximum = process.env.NATIVE_UI_TABLES_MAX === "1";
 mkdirSync(evidenceDir,{recursive:true});
 const themes=["soft-light","modern-dark","professional","industrial","organic","clay"];
 for(const language of ["pt-BR","en"])for(const theme of themes) {
  await page.locator("header.app-header select").first().selectOption(language);
  await page.locator("header.app-header select").nth(1).selectOption(theme);
  await page.evaluate(()=>{document.documentElement.style.fontSize="32px";});
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme}/${language} home overflow`);
  await page.screenshot({path:resolve(evidenceDir,`native-home-${theme}-${language}-200.png`),fullPage:true});
 }
 await page.evaluate(()=>{document.documentElement.style.fontSize="16px";localStorage.setItem("optima.showAllSections","1");});
 const start=performance.now();
 const phases=[];
 if(maximum)await page.evaluate(()=>{
  window.__exportBudget={maximumFrameGap:0,afterInput:false,afterInputMaximumFrameGap:0};let previous=performance.now();
  const frame=now=>{window.__exportBudget.maximumFrameGap=Math.max(window.__exportBudget.maximumFrameGap,now-previous);if(window.__exportBudget.afterInput)window.__exportBudget.afterInputMaximumFrameGap=Math.max(window.__exportBudget.afterInputMaximumFrameGap,now-previous);previous=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);
 });
 for(const predictors of maximum?[32]:[2,7,32])for(const language of maximum?["pt-BR"]:["pt-BR","en"]) {
  await page.locator("header.app-header select").first().selectOption(language);
  const menu=page.getByTestId("extras-menu");if(await menu.getAttribute("open")===null)await menu.locator(":scope > summary").click();
  await page.getByTestId("open-power").click();const tool=page.getByTestId("power-dialog");
  await tool.getByTestId("power-design").selectOption("regression");await tool.getByTestId("power-goal").selectOption("powerAt");
  await tool.getByTestId("power-input-sigma").fill("1");await tool.getByTestId("power-input-alpha").fill("0.05");await tool.getByTestId("power-input-n").fill(maximum?"24":"5");
  const rows=Array.from({length:maximum?4096:64},(_,row)=>Array.from({length:predictors},(_,c)=>{
   let bits=row&(c+1),parity=0;while(bits){parity^=bits&1;bits>>>=1;}return (parity?-1:1)*(maximum?1:1.23456789e100);
  }));
  const pasteStart=performance.now();
  await tool.getByTestId("power-predictors").fill(rows.map(row=>row.join("\t")).join("\n"),{timeout:maximum?120000:30000});
  const pasteMilliseconds=performance.now()-pasteStart;
  if(maximum) {
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.evaluate(()=>{window.__exportBudget.afterInput=true;});
  }
  await tool.getByTestId("power-coefficients").fill(Array(predictors).fill(maximum?"0.01":"1e-101").join(";"));
  await tool.getByTestId("power-simulation").setChecked(maximum);
  if(maximum)await tool.getByTestId("power-simulation-replications").fill("1000000");
  const calculationStart=performance.now();
  await tool.getByRole("button",{name:/^(Calcular|Calculate)$/,exact:true}).click();
  await page.getByTestId("power-result").waitFor();
  const measurement={paste:pasteMilliseconds,calculation:performance.now()-calculationStart};
  // Persisted show-all is applied on the next mount when the tool result becomes visible.
  const all=page.getByLabel(/^(Mostrar todas as seções|Show all sections)/);
  if(await all.count())await all.check();
  const matrix=page.getByTestId("power-predictor-matrix");
  assert.equal(await matrix.locator("tbody tr").count(),20);
  Object.assign(measurement,await exportReports(page,exportDir,evidenceDir,`native-matrix-${predictors+1}-${language}`,maximum?120000:30000));
  for(const extension of ["csv","xlsx"]) {
   const digest=file=>createHash("sha256").update(readFileSync(resolve(exportDir,file))).digest("hex");
   const before=new Map(readdirSync(exportDir).map(file=>[file,digest(file)]));
   const started=performance.now();
   await matrix.getByRole("button",{name:new RegExp(`\\(${extension.toUpperCase()}\\)$`)}).click();
   let found;
   for(let attempt=0;attempt<120&&!found;attempt++) {
    found=readdirSync(exportDir).filter(file=>file.endsWith(`.${extension}`)).find(file=>before.get(file)!==digest(file));
    if(!found)await sleep(250);
   }
   assert.ok(found,`Missing native ${extension}`);
   copyFileSync(resolve(exportDir,found),resolve(evidenceDir,`native-matrix-${predictors+1}-${language}.${extension}`));
   measurement[extension]=performance.now()-started;
  }
  if(maximum)measurement.responsiveness=await page.evaluate(()=>window.__exportBudget);
  phases.push(measurement);
  await page.getByTestId("power-summary").screenshot({path:resolve(evidenceDir,`native-summary-${predictors+1}-${language}.png`)});
 }
 writeFileSync(resolve(evidenceDir,"native-tables.json"),JSON.stringify({elapsedMilliseconds:performance.now()-start,inputMethod:"Playwright/CDP fill (not clipboard paste)",columns:maximum?[33]:[3,8,33],rows:maximum?4096:64,languages:maximum?["pt-BR"]:["pt-BR","en"],homeThemes:themes,homeScale:2,phases,memory:maximum?await memorySnapshot([],pid):undefined},null,2));
 console.log(maximum?"OK: native maximum 4096x32/one million studies and all full report/data exports.":"OK: native home six themes/PT-EN at 200%, three table widths and six HTML/PDF/Word sets exported from real calculations.");
}
