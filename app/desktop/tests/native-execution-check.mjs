import assert from "node:assert/strict";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
const root=p=>resolve(import.meta.dirname,"../../..",p);
const fixture=JSON.parse(readFileSync(root("validation/cases/power_advanced/native_parity/contrast_unequal.json"),"utf8"));
async function tool(page) {
 const menu=page.getByTestId("extras-menu");
 if(await menu.getAttribute("open")===null)await menu.locator(":scope > summary").click();
 await page.getByTestId("open-power").click();return page.getByTestId("power-dialog");
}
export async function runExecutionCheck(page,evidenceDir) {
 mkdirSync(evidenceDir,{recursive:true});
 const direct=async operation=>page.evaluate(async operation=>{
  const json=JSON.stringify({protocolVersion:1,taskId:"native-execution",operation});
  try{return {status:"ok",reply:JSON.parse(await window.__TAURI_INTERNALS__.invoke("engine_request",{requestJson:json}))};}
  catch(error){return {status:"rejected",message:String(error)};}
 },operation);
 const request={type:"powerAnalyze",...fixture.request,simulation:{seed:42,replications:1000000}};
 const start=performance.now();
 const concurrent=await Promise.all([direct(request),direct(request),direct(request),direct(request),direct({type:"engineInfo"})]);
 const accepted=concurrent.slice(0,4).filter(r=>r.status==="ok");
 assert.equal(accepted.length,1,JSON.stringify(concurrent));
 assert.equal(accepted[0].reply.outcome.status,"ok");
 assert.equal(accepted[0].reply.outcome.result.simulation.replications,1000000);
 for(const r of concurrent.slice(0,4).filter(r=>r.status!=="ok"))assert.match(r.message,/execution busy/);
 assert.equal(concurrent[4].reply.outcome.status,"ok");
 await page.locator("header.app-header select").first().selectOption("pt-BR");
 let modal=await tool(page);
 const r=fixture.request;
 await modal.getByTestId("power-design").selectOption("contrast");
 await modal.getByTestId("power-goal").selectOption("powerAt");
 await modal.getByTestId("power-input-means").fill(r.design.means.join(";"));
 await modal.getByTestId("power-weights").fill(r.design.weights.join(";"));
 await modal.getByTestId("power-allocation").fill(r.design.allocation.join(";"));
 await modal.getByTestId("power-input-sigma").fill(String(r.sigma));
 await modal.getByTestId("power-input-n").fill(String(r.goal.n));
 await modal.getByRole("button",{name:"Calcular",exact:true}).click();
 await page.getByTestId("power-result").waitFor();

 modal=await tool(page);
 await modal.getByTestId("power-design").selectOption("regression");
 const predictors=Array.from({length:64},(_,row)=>Array.from({length:32},(_,column)=>{
  let bits=row&(column+1),parity=0;while(bits){parity^=bits&1;bits>>>=1;}return parity?-1:1;
 }));
 await modal.getByTestId("power-predictors").fill(predictors.map(row=>row.join("\t")).join("\n"));
 await modal.getByTestId("power-coefficients").fill(Array(32).fill("0.01").join(";"));
 await modal.getByTestId("power-simulation").check();
 await modal.getByTestId("power-simulation-replications").fill("1000000");
 for(let i=0;i<9;i++) {
  await modal.getByRole("button",{name:"Calcular",exact:true}).evaluate(button=>{
   window.cancelObserved=false;
   const observer=new MutationObserver(()=>{
    const cancel=document.querySelector('[data-testid="power-cancel"]');
    if(cancel){observer.disconnect();window.busyExplanation=document.querySelector('[role="status"]')?.textContent;cancel.click();window.cancelObserved=true;}
   });
   observer.observe(document.body,{subtree:true,childList:true});button.click();
  });
  await page.waitForFunction(()=>window.cancelObserved);
  assert.equal(await modal.getByTestId("power-cancel").count(),0);
 }
 await page.keyboard.press("Escape");
 assert.equal(await page.getByTestId("result-record").count(),0,"cancelled request added a record");
 modal=await tool(page);

 await modal.getByTestId("power-simulation-replications").fill("1000");
 await modal.getByRole("button",{name:"Calcular",exact:true}).click();
 await page.getByTestId("power-simulation-result").waitFor();
 assert.equal(await page.getByTestId("result-record").locator("option").count(),2);
 const explanation=await page.evaluate(()=>window.busyExplanation);
 assert.match(explanation,/cálculo já iniciado termina/);
 await page.getByTestId("power-result").screenshot({path:resolve(evidenceDir,"native-recovered.png")});
 writeFileSync(resolve(evidenceDir,"native-execution.json"),JSON.stringify({elapsedMilliseconds:performance.now()-start,independentService:true,directAccepted:accepted.length,directBusy:3,cancelledAttempts:9,globalScientificLimit:1,busyExplanation:explanation},null,2));
 console.log("OK: native global limit and independent service, nine cancelled UI attempts, one real native scientific slot, original record preserved and next calculation completed.");
}
