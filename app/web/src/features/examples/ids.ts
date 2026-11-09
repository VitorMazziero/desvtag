// Identificadores dos exemplos distribuídos (prefixo numérico da pasta em `examples/`). O 05, com
// dados reais do grupo (PD-16), não é distribuído.

/** Identificador estável do exemplo = prefixo numérico da pasta. */
export const EXAMPLE_IDS = [
  "01",
  "02",
  "03",
  "04",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
] as const;

export type ExampleId = (typeof EXAMPLE_IDS)[number];
