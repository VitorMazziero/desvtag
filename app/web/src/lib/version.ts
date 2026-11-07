// Versão do aplicativo gravada nos arquivos e nas exportações; confere com o pacote (scripts/check-versions.mjs).
declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.4.0-dev";

declare const __BUILD_COMMIT__: string;
export const BUILD_COMMIT = typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : "unknown";
