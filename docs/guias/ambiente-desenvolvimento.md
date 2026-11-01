# Guia do ambiente de desenvolvimento

**Estado:** vigente · **Atualizado em:** 2026-11-01

Comandos **executados com sucesso** em Linux (Ubuntu 24.04, Rust 1.97.0, Node 22.23.4) durante a ET01. A execução em um clone limpo no Windows 11 ainda não foi registrada (tarefa ET01-T22): os comandos abaixo são os mesmos, mas a seção [Windows](#windows) lista o que falta verificar.

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Git | recente | — |
| Rust via `rustup` | 1.97.0 | `rust-toolchain.toml` instala a versão e o alvo `wasm32-unknown-unknown` automaticamente na primeira execução |
| Node.js | 22 (`.nvmrc`) | inclui o npm |
| `wasm-bindgen-cli` | 0.2.130 | mesma versão da crate: `cargo install wasm-bindgen-cli --version 0.2.130 --locked` |
| Linux, para o Tauri | — | `libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev librsvg2-dev patchelf build-essential pkg-config libssl-dev` |
| Linux, verificação nativa | — | `webkit2gtk-driver xvfb` e `cargo install tauri-driver --locked` |

## Verificações do motor (Rust)

Em `app/`:

```bash
cargo fmt --all --check
```

```bash
cargo clippy --workspace --all-targets -- -D warnings
```

```bash
cargo test --workspace
```

## Interface (navegador)

Em `app/web/`:

```bash
npm ci
```

```bash
npm run check:contracts
```

`npm run gen:contracts` regenera `src/services/engine/contracts.generated.ts` (nunca editar à mão).

```bash
npm run lint
npm run build:wasm
npm run typecheck
npm test
```

```bash
npm run build
```

`npm run dev` compila o WASM e abre o servidor de desenvolvimento do Vite. `npm run preview` serve o build em `http://127.0.0.1:4173`.

### Testes E2E (motor WASM real)

```bash
npx playwright install chromium firefox
```

```bash
E2E_BROWSERS=chromium,firefox npm run test:e2e
```

`E2E_BROWSERS=msedge` usa o Microsoft Edge instalado (não coberto no Linux).

## Aplicativo desktop (Tauri)

Em `app/desktop/src-tauri/`, depois de `npm run build` em `app/web/`:

```bash
cargo clippy -- -D warnings
```

```bash
cargo build --features tauri/custom-protocol
```

Verificação nativa (WebDriver), em `app/desktop/`; em Linux usa Xvfb:

```bash
xvfb-run -a node tests/native-smoke.mjs src-tauri/target/debug/optima-desktop
```

Instalador Windows (NSIS), em `app/desktop/`, executado em Windows:

```bash
npm --prefix ../web exec -- tauri build
```

## Documentação e versões

Na raiz:

```bash
node scripts/check-docs-links.mjs
node scripts/check-versions.mjs
```

## Windows

Pendente de registro (ET01-T22): inventário das ferramentas do Windows 11 (Git, `rustup`, Node, ferramentas de compilação C++ da Microsoft, WebView2), execução destes comandos em um clone limpo e abertura do aplicativo. O job `desktop-windows` da CI (em `main`, etiquetas e disparo manual) compila o instalador NSIS, mas não substitui a execução do aplicativo.
