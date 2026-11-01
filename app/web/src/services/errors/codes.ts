// Códigos de erro e diagnóstico (U19). As chaves de tradução derivam dos códigos
// do motor; a interface nunca exibe o código cru ao usuário.
import type { EngineError, Issue } from "../engine";

/** `dataset.undeclared_level` → `issues.dataset.undeclared_level` (namespace `diagnostics`). */
export function issueKey(issue: Issue): string {
  return `issues.${issue.code}`;
}

/** `invalidInput` → `engine.invalidInput`. */
export function engineErrorKey(error: EngineError): string {
  return `engine.${error.code}`;
}
