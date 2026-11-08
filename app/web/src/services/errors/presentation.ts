// Textos localizados para erros e diagnósticos do motor.
import type { TFunction } from "i18next";
import type { EngineError, Issue } from "../engine";
import { engineErrorKey, issueKey } from "./codes";

export function issueMessage(t: TFunction, issue: Issue): string {
  const params: Record<string, unknown> = { ...issue.params };
  // `kind` (tratamento/bloco) vem do motor como identificador; o texto é do idioma ativo.
  if (typeof params.kind === "string")
    params.kind = t(`issues.kind.${params.kind}`, { ns: "diagnostics", defaultValue: params.kind });
  return t(issueKey(issue), {
    ns: "diagnostics",
    ...params,
    defaultValue: t("engine.unknown", { ns: "diagnostics" }),
  });
}

/** Mensagens de um erro do motor: a frase do erro e, para `invalidInput`, cada diagnóstico. */
export function engineErrorMessages(t: TFunction, error: EngineError): string[] {
  const head = t(engineErrorKey(error), {
    ns: "diagnostics",
    ...error.params,
    defaultValue: t("engine.unknown", { ns: "diagnostics" }),
  });
  return [head, ...error.issues.map((issue) => issueMessage(t, issue))];
}
