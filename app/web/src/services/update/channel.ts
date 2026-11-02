// Canal de atualização (ET20): preferência do dispositivo. Enquanto o aplicativo é da série 0.x só
// existe o canal experimental; o estável passa a existir com a versão 1.0.0.
export type UpdateChannel = "experimental" | "stable";

const KEY = "optima.updateChannel";

/** Canal usado quando o usuário ainda não escolheu: o estável só existe a partir da 1.0.0. */
export function defaultChannel(appVersion: string): UpdateChannel {
  return /^0\./.test(appVersion) ? "experimental" : "stable";
}

export function loadChannel(appVersion: string): UpdateChannel {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "experimental" || stored === "stable") return stored;
  } catch {
    // sem armazenamento: vale o padrão
  }
  return defaultChannel(appVersion);
}

export function saveChannel(channel: UpdateChannel): void {
  try {
    localStorage.setItem(KEY, channel);
  } catch {
    // a escolha vale só para esta sessão
  }
}
