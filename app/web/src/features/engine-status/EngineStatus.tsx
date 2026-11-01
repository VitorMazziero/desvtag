// Informações do motor em uso (versões e ambiente): serve ao suporte e à verificação de
// que navegador e Windows usam o mesmo contrato. Dados vêm do `EngineProvider`.
import { useTranslation } from "react-i18next";
import { useEngine } from "../../services/engine/EngineContext";
import { engineErrorMessages } from "../../services/errors/presentation";

export function EngineStatus() {
  const { t } = useTranslation();
  const { client, info } = useEngine();
  return (
    <details className="panel engine-status">
      <summary>{t("engine.title")}</summary>
      <div aria-live="polite">
        {info.phase === "loading" && <p>{t("engine.loading")}</p>}
        {info.phase === "error" && (
          <div role="alert" className="error">
            {info.error ? (
              engineErrorMessages(t, info.error).map((m) => <p key={m}>{m}</p>)
            ) : (
              <p>{t("engine.unavailable", { ns: "diagnostics" })}</p>
            )}
          </div>
        )}
        {info.phase === "ready" && (
          <dl className="facts">
            <dt>{t("engine.environment")}</dt>
            <dd data-testid="engine-environment">{t(`engine.environmentValue.${client.kind}`)}</dd>
            <dt>{t("engine.engineVersion")}</dt>
            <dd data-testid="engine-version">{info.info.engineVersion}</dd>
            <dt>{t("engine.protocolVersion")}</dt>
            <dd data-testid="engine-protocol">{info.info.protocolVersion}</dd>
            <dt>{t("engine.schemaVersion")}</dt>
            <dd data-testid="engine-schema">{info.info.projectSchemaVersion}</dd>
            <dt>{t("engine.methods")}</dt>
            <dd data-testid="engine-methods">
              {info.info.capabilities.methods.length === 0
                ? t("engine.methodsNone")
                : info.info.capabilities.methods.map((m) => `${m.id} v${m.version}`).join(", ")}
            </dd>
          </dl>
        )}
      </div>
    </details>
  );
}
