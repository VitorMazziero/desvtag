import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { expect, it } from "vitest";
import { createI18n } from "../../i18n";
import type { ProjectDocument } from "../../services/engine";
import { initialProject } from "../../state/project";
import { commentTargetLabel } from "./targetLabels";

it("names scientific review targets in both UI/report languages without exposing internal keys", () => {
  for (const language of ["pt-BR", "en"] as const) {
    const t = createI18n(language).t;
    const table = commentTargetLabel(
      t,
      initialProject,
      { kind: "table", key: "repeated/mixed-term-tests" },
      language,
    );
    expect(table).toContain(
      language === "pt-BR" ? "Testes conjuntos dos efeitos fixos" : "Joint tests of fixed effects",
    );
    expect(table).not.toContain("repeated/");
    expect(
      commentTargetLabel(
        t,
        initialProject,
        { kind: "figure", key: "mixed-profile-chart" },
        language,
      ),
    ).toContain(
      language === "pt-BR" ? "Perfis por unidade e ocasião" : "Profiles by unit and occasion",
    );
  }
});
it("keeps a legacy analysis target on its historical variable names", () => {
  const bytes = unzipSync(
    new Uint8Array(
      readFileSync(
        resolve(__dirname, "../../../../../examples/01-enzimas-quatro-condicoes/projeto.enzitag"),
      ),
    ),
  )["project.json"];
  if (!bytes) throw new Error("Missing reference archive");
  const doc = JSON.parse(strFromU8(bytes)) as ProjectDocument;
  const experiment = doc.experiments[0];
  if (!experiment) throw new Error("Missing experiment");
  const record = experiment.analyses[0];
  if (!record) throw new Error("Missing analysis");
  const data = experiment.revisions.find((r) => r.id === record.revisionId)?.data;
  if (!data) throw new Error("Missing revision");
  const state = {
    ...initialProject,
    analyses: experiment.analyses,
    revisions: experiment.revisions,
    factors: data.factors.map((f) => ({ ...f, name: "Changed factor" })),
    responses: data.responses.map((r) => ({ ...r, name: "Changed response" })),
  };
  const label = commentTargetLabel(
    createI18n("pt-BR").t,
    state,
    { kind: "analysis", analysisId: record.id },
    "pt-BR",
  );
  expect(label).toContain(data.responses[0]?.name);
  expect(label).not.toContain("Changed");
});
