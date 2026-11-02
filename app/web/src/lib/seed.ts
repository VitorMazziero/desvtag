// Sementes de aleatorização no navegador: inteiros seguros do JavaScript (≤ 2^53 − 1), porque os
// contratos levam a semente como número JSON. O motor aceita qualquer `u64`, mas valores maiores não
// sobrevivem à viagem pelo JavaScript sem perder dígitos; por isso a interface não os produz.

export const MAX_SEED = Number.MAX_SAFE_INTEGER;

/** Semente aleatória de 32 bits (sempre segura). */
export function randomSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? 1;
}

/** Texto ou número digitado → semente inteira entre 0 e `MAX_SEED` (vazio ou inválido → 0). */
export function clampSeed(value: string | number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_SEED);
}
