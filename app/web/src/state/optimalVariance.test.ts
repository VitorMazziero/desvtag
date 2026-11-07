// @vitest-environment node
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { expect, it } from "vitest";
import type { ProjectDocument } from "../services/engine";
import { matchesOptimalVariance } from "./optimalVariance";
import { captureCalculationSource } from "./project";
import { createWorkspace, currentExperiment, toDocument, workspaceReducer } from "./workspace";

const NOW = "2026-11-05T04:00:00Z";
function context() {
  const bytes = unzipSync(
    new Uint8Array(
      readFileSync(
        new URL(
          "../../../../validation/cases/et25/b08-variance-fixtures/saturated-d.enzitag",
          import.meta.url,
        ),
      ),
    ),
  )["project.json"];
  if (!bytes) throw new Error("fixture");
  const document = JSON.parse(strFromU8(bytes)) as ProjectDocument;
  return workspaceReducer(createWorkspace("p1", "", "", NOW), {
    type: "loadDocument",
    document,
    fileName: "fixture.enzitag",
    now: NOW,
  });
}

it("adds an independent supplement to the captured experiment and keeps both numerical histories", () => {
  let ws = context();
  const original = currentExperiment(ws),
    design = original.optimalDesigns[0],
    profile = original.optimalVariances[0];
  if (!design || !profile) throw new Error("fixture records");
  const source = captureCalculationSource(ws, original, NOW);
  ws = workspaceReducer(ws, { type: "addExperiment", name: "Other", now: NOW });
  ws = workspaceReducer(ws, {
    type: "storeOptimalVariance",
    source,
    designId: design.id,
    result: profile.result,
    now: NOW,
  });
  const saved = ws.experiments.find((e) => e.id === original.id);
  expect(currentExperiment(ws).name).toBe("Other");
  expect(currentExperiment(ws).optimalVariances).toEqual([]);
  expect(saved?.optimalDesigns).toEqual(original.optimalDesigns);
  expect(saved?.optimalVariances).toHaveLength(2);
  expect(saved?.optimalVariances[0]).toEqual(profile);
  expect(saved?.optimalVariances[1]?.revisionId).toBe(design.revisionId);
  const ids = [...(saved?.optimalDesigns ?? []), ...(saved?.optimalVariances ?? [])].map(
    (record) => record.id,
  );
  expect(new Set(ids).size).toBe(ids.length);
  const document = toDocument(ws, NOW, "0.4.0-dev");
  expect(document.experiments[0]?.optimalVariances).toHaveLength(2);
});

it("refuses a late profile after reopening the same project identity and a profile for another design", () => {
  let ws = context();
  const original = currentExperiment(ws),
    design = original.optimalDesigns[0],
    profile = original.optimalVariances[0];
  if (!design || !profile) throw new Error("fixture records");
  const source = captureCalculationSource(ws, original, NOW);
  const other = structuredClone(profile.result);
  other.request.runsReal[0]?.fill(0);
  expect(matchesOptimalVariance(design.result, other)).toBe(false);
  expect(
    workspaceReducer(ws, {
      type: "storeOptimalVariance",
      source,
      designId: design.id,
      result: other,
      now: NOW,
    }),
  ).toBe(ws);
  ws = workspaceReducer(ws, {
    type: "loadDocument",
    document: toDocument(ws, NOW, "0.4.0-dev"),
    fileName: "again.enzitag",
    now: NOW,
  });
  expect(
    workspaceReducer(ws, {
      type: "storeOptimalVariance",
      source,
      designId: design.id,
      result: profile.result,
      now: NOW,
    }),
  ).toBe(ws);
});

it("recognizes structurally equal inputs independently of JSON property order", () => {
  const state = currentExperiment(context()),
    design = state.optimalDesigns[0],
    profile = state.optimalVariances[0];
  if (!design || !profile) throw new Error("fixture records");
  const reordered = structuredClone(profile.result);
  reordered.request.spec = Object.fromEntries(
    Object.entries(reordered.request.spec).reverse(),
  ) as typeof reordered.request.spec;
  expect(matchesOptimalVariance(design.result, reordered)).toBe(true);
});
