// Identificadores e instantes gerados pela interface (o núcleo não lê relógio nem sorteia ids).

/** Identificador de projeto: `p-` + UUID (apenas caracteres aceitos por `StableId`). */
export function newProjectId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  return `p-${uuid}`;
}

/** Instante atual em RFC 3339 (UTC). */
export function nowIso(): string {
  return new Date().toISOString();
}
