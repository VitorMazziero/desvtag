// Planilha de coleta (ET13): o assistente preenche só as respostas do experimento atual.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../i18n";
import { createEngineClient } from "../../services/engine/EngineClient";
import { EngineProvider } from "../../services/engine/EngineContext";
import { ProjectProvider, useProject } from "../../state/ProjectContext";
import { createWorkspace, workspaceReducer } from "../../state/workspace";
import { ImportWizard } from "./ImportWizard";

const T0 = "2026-11-02T10:00:00.000Z";
const bytes = (s: string) => new TextEncoder().encode(s);

function Probe() {
  const e = useProject();
  return (
    <pre data-testid="probe">
      {JSON.stringify({
        rows: e.rows.map((r) => ({ f: r.factors, r: r.responses })),
        factors: e.factors.map((f) => f.name),
        revisions: e.revisions.map((r) => r.reason),
      })}
    </pre>
  );
}

// Experimento com dois fatores numéricos, uma resposta e quatro ensaios planejados (sem respostas).
function seeded() {
  let ws = createWorkspace("p1", "Projeto", "Experimento 1", T0);
  for (const action of [
    { type: "addFactor" as const },
    { type: "addFactor" as const },
    { type: "addResponse" as const },
  ])
    ws = workspaceReducer(ws, action);
  ws = workspaceReducer(ws, {
    type: "updateFactor",
    id: "f1",
    patch: { name: "Temperatura", kind: "numeric" },
  });
  ws = workspaceReducer(ws, {
    type: "updateFactor",
    id: "f2",
    patch: { name: "pH", kind: "numeric" },
  });
  ws = workspaceReducer(ws, {
    type: "updateResponse",
    id: "r1",
    patch: { name: "Atividade", unit: "U/mL" },
  });
  const rows = [
    ["20", "5"],
    ["30", "5"],
    ["20", "7"],
    ["30", "7"],
  ].map((f, i) => ({ id: `o${i + 1}`, unitId: "", factors: f, responses: [""] }));
  return workspaceReducer(ws, {
    type: "setRows",
    rows,
    counters: { ...ws.experiments[0]?.counters, row: 4 } as never,
  });
}

function renderWizard(csv: string, onClose = () => {}) {
  const client = () =>
    createEngineClient("wasm", async (json) => {
      const { taskId } = JSON.parse(json) as { taskId: string };
      return JSON.stringify({ protocolVersion: 1, taskId, outcome: { status: "ok", result: {} } });
    });
  return render(
    <I18nextProvider i18n={createI18n("pt-BR")}>
      <EngineProvider createClient={client}>
        <ProjectProvider initial={seeded()}>
          <ImportWizard file={{ name: "matriz.csv", bytes: bytes(csv) }} onClose={onClose} />
          <Probe />
        </ProjectProvider>
      </EngineProvider>
    </I18nextProvider>,
  );
}

const state = () => JSON.parse(screen.getByTestId("probe").textContent ?? "{}");

describe("ImportWizard: preencher as respostas do planejamento", () => {
  it("lê a matriz exportada (com metadados), grava só as respostas e mantém os ensaios", async () => {
    const user = userEvent.setup();
    let closed = false;
    renderWizard(
      [
        "# app: EnziTAG Optima",
        "# seed: 7",
        "",
        "run;Temperatura;pH;Atividade (U/mL)",
        "1;30;7;13,2",
        "2;20;5;10,5",
        "3;30;5;12",
        "4;20;7;",
      ].join("\r\n"),
      () => {
        closed = true;
      },
    );
    expect(await screen.findByTestId("fill-responses")).toBeInTheDocument();
    expect(screen.getByTestId("fill-summary")).toHaveTextContent("3 valor(es)");
    expect(screen.getByTestId("fill-summary")).toHaveTextContent("1 célula(s) em branco");
    await user.click(screen.getByRole("button", { name: "Preencher respostas" }));
    await waitFor(() => expect(closed).toBe(true));
    const s = state();
    expect(s.factors).toEqual(["Temperatura", "pH"]);
    expect(s.rows).toEqual([
      { f: ["20", "5"], r: ["10,5"] },
      { f: ["30", "5"], r: ["12"] },
      { f: ["20", "7"], r: [""] },
      { f: ["30", "7"], r: ["13,2"] },
    ]);
    expect(s.revisions).toContain("import");
  });

  it("avisa das linhas sem ensaio correspondente e das células que não são números", async () => {
    renderWizard("Temperatura;pH;Atividade\n99;5;10\n20;5;abc\n");
    expect(await screen.findByTestId("fill-unmatched")).toHaveTextContent("Linhas: 1");
    expect(screen.getByTestId("fill-invalid")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Preencher respostas" })).toBeDisabled();
  });

  it("permite escolher substituir todos os dados em vez de preencher", async () => {
    const user = userEvent.setup();
    renderWizard("Temperatura;pH;Atividade\n20;5;10\n");
    await screen.findByTestId("fill-responses");
    await user.click(screen.getByLabelText(/Substituir todos os dados/));
    expect(screen.getByRole("button", { name: "Importar" })).toBeInTheDocument();
    expect(screen.getByTestId("import-preview")).toBeInTheDocument();
  });

  it("arquivo sem os fatores do experimento segue o caminho de dados novos", async () => {
    renderWizard("grupo;y\nA;1\n");
    expect(await screen.findByTestId("import-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("fill-responses")).not.toBeInTheDocument();
  });
});
