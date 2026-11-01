// Fornece um único cliente do motor e as informações de `engine.info` à interface.
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { EngineError, EngineInfo } from "./contracts.generated";
import type { EngineClient } from "./EngineClient";
import { StaleResponseError } from "./EngineClient";

export type EngineInfoState =
  | { phase: "loading" }
  | { phase: "ready"; info: EngineInfo }
  | { phase: "error"; error: EngineError | null };

interface EngineContextValue {
  client: EngineClient;
  info: EngineInfoState;
}

const EngineContext = createContext<EngineContextValue | null>(null);

interface Props {
  /** Fábrica do cliente; injetável para testes. */
  createClient: () => EngineClient;
  children: ReactNode;
}

export function EngineProvider({ createClient, children }: Props) {
  const [value, setValue] = useState<EngineContextValue | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let client: EngineClient;
    try {
      client = createClient();
    } catch {
      setFailed(true);
      return;
    }
    const current = client;
    setValue({ client: current, info: { phase: "loading" } });
    current
      .request({ type: "engineInfo" }, { channel: "engine-info" })
      .then((response) => {
        if (!active) return;
        const info: EngineInfoState =
          response.outcome.status === "ok" && response.outcome.result.type === "engineInfo"
            ? { phase: "ready", info: response.outcome.result }
            : {
                phase: "error",
                error: response.outcome.status === "error" ? response.outcome.error : null,
              };
        setValue({ client: current, info });
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof StaleResponseError)) {
          setValue({ client: current, info: { phase: "error", error: null } });
        }
      });
    return () => {
      active = false;
      current.dispose();
    };
  }, [createClient]);

  if (failed) {
    return <EngineUnavailable />;
  }
  if (!value) return null;
  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

function EngineUnavailable() {
  // Sem cliente não há como localizar via contexto de i18n de forma garantida; o texto
  // é resolvido pelo componente que renderiza esta mensagem (ver App).
  return <p role="alert" data-testid="engine-unavailable" />;
}

export function useEngine(): EngineContextValue {
  const value = useContext(EngineContext);
  if (!value) throw new Error("useEngine must be used inside <EngineProvider>");
  return value;
}
