// Compare recorded engine runs; exact results are required for preparation/buffer reuse.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [before, after, output] = process.argv.slice(2);
if (!before || !after || !output) throw new Error("Usage: node compare_et24_measurements.mjs <before> <after> <output.json>");
const read = (folder) => JSON.parse(readFileSync(resolve(folder, "measurements.json"), "utf8"));
function index(report) {
  const cases = new Map(report.cases.map((item) => [item.name, item]));
  if (!cases.size || cases.size !== report.cases.length) throw new Error("Missing or duplicate cases");
  return cases;
}
const previous = index(read(before));
const current = index(read(after));
const compared = [];
for (const [name, old] of previous) {
  const next = current.get(name);
  if (!next) throw new Error(`Missing repeated case: ${name}`);
  if (old.requestHash !== next.requestHash) throw new Error(`Different inputs: ${next.name}`);
  if (old.resultHash !== next.resultHash) throw new Error(`Different complete result: ${next.name}; investigate before accepting a speed comparison`);
  compared.push({
    name: next.name, exactResultPreserved: true,
    beforeMedian: old.medianMilliseconds, afterMedian: next.medianMilliseconds,
    beforeP95: old.p95Milliseconds, afterP95: next.p95Milliseconds,
    medianRatioAfterBefore: next.medianMilliseconds / old.medianMilliseconds,
    privateBytesBefore: old.memory.privateBytes, privateBytesAfter: next.memory.privateBytes,
  });
}
writeFileSync(output, JSON.stringify({
  before: resolve(before), after: resolve(after),
  interpretation: "Empirical transport timings; small differences can be noise, not a demonstrated optimization. Process memory is a snapshot, not allocation accounting.",
  cases: compared,
}, null, 2));
console.log(`${compared.length} cases have identical complete results; timing/memory comparison saved.`);
