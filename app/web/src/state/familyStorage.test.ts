// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "../services/engine";
import { createWorkspace, currentExperiment, toDocument, workspaceReducer } from "./workspace";

const directory = fileURLToPath(
  new URL("../../../../validation/cases/project_file/families/", import.meta.url),
);
const now = "2026-11-03T11:00:00Z";
const fields = [
  "mixtureResult",
  "mixedModelResult",
  "nonlinearResult",
  "powerResult",
  "activeFamily",
] as const;

describe("saved analysis-family state", () => {
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
    it(`preserves ${file} through load and save, including dirty selections and old revisions`, () => {
      const document = JSON.parse(readFileSync(`${directory}/${file}`, "utf8")) as ProjectDocument;
      const loaded = workspaceReducer(createWorkspace("empty", "", "", now), {
        type: "loadDocument",
        document,
        fileName: file,
        now,
      });
      const saved = toDocument(loaded, now, "0.4.0-dev");
      for (const field of fields)
        expect(saved.experiments[0]?.[field]).toEqual(document.experiments[0]?.[field]);
      expect(saved.experiments[0]?.revisions).toEqual(document.experiments[0]?.revisions);
      expect(saved.experiments[0]?.comments).toEqual(document.experiments[0]?.comments);
      expect(currentExperiment(loaded).activeFamily).toBe(
        document.experiments[0]?.activeFamily ?? "legacy",
      );
    });
  }
  it("keeps all family fields absent in an untouched legacy project", () => {
    const saved = toDocument(createWorkspace("p1", "", "", now), now, "0.4.0-dev");
    for (const field of fields) expect(saved.experiments[0]).not.toHaveProperty(field);
  });
});
