import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../i18n";
import { type EngineResponse, PROTOCOL_VERSION } from "../../services/engine";
import { createEngineClient } from "../../services/engine/EngineClient";
import { EngineProvider } from "../../services/engine/EngineContext";
import { EngineStatus } from "./EngineStatus";

function clientReplying(build: (taskId: string) => EngineResponse) {
  return () =>
    createEngineClient("wasm", async (json) => {
      const { taskId } = JSON.parse(json) as { taskId: string };
      return JSON.stringify(build(taskId));
    });
}

const info = (taskId: string): EngineResponse => ({
  protocolVersion: PROTOCOL_VERSION,
  taskId,
  outcome: {
    status: "ok",
    result: {
      type: "engineInfo",
      engineVersion: "0.1.0",
      protocolVersion: PROTOCOL_VERSION,
      projectSchemaVersion: 1,
      capabilities: {
        methods: [
          {
            id: "descriptive_summary",
            version: 1,
            implementation: "implemented",
            validation: "numericallyValidated",
          },
        ],
      },
    },
  },
});

function renderIn(
  language: "pt-BR" | "en",
  createClient: () => ReturnType<typeof createEngineClient>,
) {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <EngineProvider createClient={createClient}>
        <EngineStatus />
      </EngineProvider>
    </I18nextProvider>,
  );
}

describe("EngineStatus", () => {
  it("shows the engine info in Portuguese", async () => {
    renderIn("pt-BR", clientReplying(info));
    expect(await screen.findByTestId("engine-version")).toHaveTextContent("0.1.0");
    expect(screen.getByTestId("engine-methods")).toHaveTextContent("descriptive_summary v1");
    expect(screen.getByTestId("engine-environment")).toHaveTextContent("Navegador");
  });

  it("shows the engine info in English", async () => {
    renderIn("en", clientReplying(info));
    expect(await screen.findByTestId("engine-environment")).toHaveTextContent("Browser");
  });

  it("presents a coded engine error with its parameters", async () => {
    renderIn(
      "pt-BR",
      clientReplying((taskId) => ({
        protocolVersion: PROTOCOL_VERSION,
        taskId,
        outcome: {
          status: "error",
          error: {
            code: "unsupportedProtocolVersion",
            params: { expected: "1", received: "9" },
            issues: [],
          },
        },
      })),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("espera 1");
  });

  it("presents a transport failure as engine unavailable", async () => {
    renderIn("en", () =>
      createEngineClient("tauri", async () => {
        throw new Error("boom");
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not communicate");
  });
});
