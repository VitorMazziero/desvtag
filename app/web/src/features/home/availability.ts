// Disponibilidade de cada caminho, derivada do REGISTRO DE MÉTODOS do motor (não fixa no
// código): quando uma etapa futura registrar o método, o aviso desaparece sozinho.
import type { Capabilities } from "../../services/engine";
import type { EntryPath } from "../../state/project";

/** Métodos que cada caminho precisa; ids reservados para as etapas indicadas. */
export const REQUIRED_METHODS: Record<EntryPath, string[]> = {
  plan: ["plackett_burman_design"], // ET06
  analyze: ["descriptive_summary"],
  compare: ["tukey_hsd"], // ET05
};

export function missingMethods(path: EntryPath, capabilities: Capabilities | null): string[] {
  const available = new Set(capabilities?.methods.map((m) => m.id) ?? []);
  return REQUIRED_METHODS[path].filter((id) => !available.has(id));
}
