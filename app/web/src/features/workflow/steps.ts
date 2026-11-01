// Cinco etapas do fluxo guiado: Objetivo → Fatores e respostas → Planejamento/dados → Análise → Resultados.
export const STEPS = ["objective", "variables", "data", "analysis", "results"] as const;
export type StepId = (typeof STEPS)[number];
