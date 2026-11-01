import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../i18n";
import { createEngineClient } from "../../services/engine/EngineClient";
import { EngineProvider } from "../../services/engine/EngineContext";
import { ProjectProvider, useProject } from "../../state/ProjectContext";
import { ImportWizard } from "./ImportWizard";

const bytes = (s: string) => new TextEncoder().encode(s);

function Probe() {
  const e = useProject();
  return (
    <pre data-testid="probe">
      {JSON.stringify({
        rows: e.rows,
        factors: e.factors.map((f) => f.name),
        revisions: e.revisions.map((r) => r.reason),
      })}
    </pre>
  );
}

function renderWizard(file: { name: string; bytes: Uint8Array }, onClose = () => {}) {
  const client = () =>
    createEngineClient("wasm", async (json) => {
      const { taskId } = JSON.parse(json) as { taskId: string };
      return JSON.stringify({
        protocolVersion: 1,
        taskId,
        outcome: {
          status: "ok",
          result: {
            type: "engineInfo",
            engineVersion: "0.1.0",
            protocolVersion: 1,
            projectSchemaVersion: 1,
            capabilities: { methods: [] },
          },
        },
      });
    });
  return render(
    <I18nextProvider i18n={createI18n("pt-BR")}>
      <EngineProvider createClient={client}>
        <ProjectProvider>
          <ImportWizard file={file} onClose={onClose} />
          <Probe />
        </ProjectProvider>
      </EngineProvider>
    </I18nextProvider>,
  );
}

describe("ImportWizard (CSV)", () => {
  it("shows the preview, suggests roles and imports the typed text", async () => {
    const user = userEvent.setup();
    let closed = false;
    renderWizard({ name: "d.csv", bytes: bytes("Condição;Atividade\nÁgua;10,5\nÁcido;\n") }, () => {
      closed = true;
    });
    const preview = await screen.findByTestId("import-preview");
    expect(preview).toHaveTextContent("Água");
    expect(preview).toHaveTextContent("10,5");
    expect(screen.getByLabelText("Papel 1")).toHaveValue("factor");
    expect(screen.getByLabelText("Papel 2")).toHaveValue("response");

    await user.click(screen.getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(closed).toBe(true));
    const state = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(state.factors).toEqual(["Condição"]);
    expect(state.rows.map((r: { responses: string[] }) => r.responses[0])).toEqual(["10,5", ""]);
    expect(state.revisions).toContain("import");
  });

  it("lets the user change a column role and keeps the typed names", async () => {
    const user = userEvent.setup();
    renderWizard({ name: "d.csv", bytes: bytes("g;y;u\nA;1;U1\nA;2;U1\n") });
    await screen.findByTestId("import-preview");
    await user.selectOptions(screen.getByLabelText("Papel 3"), "unit");
    await user.clear(screen.getByLabelText("Nome 2"));
    await user.type(screen.getByLabelText("Nome 2"), "Atividade");
    await user.click(screen.getByRole("button", { name: "Importar" }));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("probe").textContent ?? "{}").rows).toHaveLength(2),
    );
    const state = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(state.rows.map((r: { unitId: string }) => r.unitId)).toEqual(["U1", "U1"]);
    expect(new Set(state.rows.map((r: { id: string }) => r.id)).size).toBe(2); // medidas repetidas ≠ mesma observação
  });

  it("blocks the import and explains when observation ids repeat", async () => {
    const user = userEvent.setup();
    renderWizard({ name: "d.csv", bytes: bytes("id;y\na;1\na;2\n") });
    await screen.findByTestId("import-preview");
    await user.selectOptions(screen.getByLabelText("Papel 1"), "observation");
    expect(await screen.findByRole("alert")).toHaveTextContent("repetido nas linhas 2");
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
  });

  it("reads Windows-1252 files and says so", async () => {
    renderWizard({
      name: "w.csv",
      bytes: new Uint8Array([0xc1, 0x67, 0x75, 0x61, 0x3b, 0x31, 0x0a]),
    }); // "Água;1"
    expect(await screen.findByText(/não era UTF-8 válido/)).toBeInTheDocument();
    expect(
      within(await screen.findByTestId("import-preview")).getByText("Água"),
    ).toBeInTheDocument();
  });
});
