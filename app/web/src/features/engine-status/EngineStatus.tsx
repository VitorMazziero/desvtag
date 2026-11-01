// Tela provisória da ET01: mostra a resposta tipada de `engine.info`.
// Será substituída pelo fluxo guiado na ET02.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type EngineClient,
  type EngineError,
  type EngineInfo,
  StaleResponseError,
} from "../../services/engine";

type State =
  | { phase: "loading" }
  | { phase: "ready"; info: EngineInfo; kind: EngineClient["kind"] }
  | { phase: "error"; error: EngineError | null };

interface Props {
  /** Fábrica do cliente; injetável para testes. */
  createClient: () => EngineClient;
}

export function EngineStatus({ createClient }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    let client: EngineClient | undefined;
    try {
      client = createClient();
      const current = client;
      current
        .request({ type: "engineInfo" }, { channel: "engine-info" })
        .then((response) => {
          if (!active) return;
          if (response.outcome.status === "ok" && response.outcome.result.type === "engineInfo") {
            const { type: _type, ...info } = response.outcome.result;
            setState({ phase: "ready", info, kind: current.kind });
          } else if (response.outcome.status === "error") {
            setState({ phase: "error", error: response.outcome.error });
          }
        })
        .catch((error: unknown) => {
          if (active && !(error instanceof StaleResponseError)) {
            setState({ phase: "error", error: null });
          }
        });
    } catch {
      setState({ phase: "error", error: null });
    }
    return () => {
      active = false;
      client?.dispose();
    };
  }, [createClient]);

  return (
    <section className="panel" aria-labelledby="engine-title">
      <h2 id="engine-title">{t("engine.title")}</h2>
      <p className="muted">{t("engine.provisional")}</p>
      <div aria-live="polite">
        {state.phase === "loading" && <p>{t("engine.loading")}</p>}
        {state.phase === "error" && (
          <p role="alert" className="error">
            {state.error
              ? t(`errors.${state.error.code}`, state.error.params)
              : t("errors.engineUnavailable")}
          </p>
        )}
        {state.phase === "ready" && (
          <dl className="facts">
            <dt>{t("engine.environment")}</dt>
            <dd data-testid="engine-environment">{t(`engine.environmentValue.${state.kind}`)}</dd>
            <dt>{t("engine.engineVersion")}</dt>
            <dd data-testid="engine-version">{state.info.engineVersion}</dd>
            <dt>{t("engine.protocolVersion")}</dt>
            <dd data-testid="engine-protocol">{state.info.protocolVersion}</dd>
            <dt>{t("engine.schemaVersion")}</dt>
            <dd data-testid="engine-schema">{state.info.projectSchemaVersion}</dd>
            <dt>{t("engine.methods")}</dt>
            <dd data-testid="engine-methods">
              {state.info.capabilities.methods.length === 0
                ? t("engine.methodsNone")
                : t("engine.methodsCount", { count: state.info.capabilities.methods.length })}
            </dd>
          </dl>
        )}
      </div>
    </section>
  );
}
