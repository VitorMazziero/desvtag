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

## Validação numérica (referências independentes)

Os casos em `validation/cases/` são executados pelos testes: nativo em `cargo test -p optima-core` (`descriptive_validation`) e WebAssembly em `npm test` em `app/web` (`descriptive.parity.test.ts`, que exige `npm run build:wasm` antes). Para regenerar os casos (Python 3.13; `make_project_case.py` e `make_import_cases.py` dispensam os dados do NIST):

```bash
python3 -m venv .venv
.venv/bin/pip install -r validation/tools/requirements.txt
.venv/bin/python validation/tools/make_descriptive_cases.py <pasta-com-os-.dat-do-NIST>
.venv/bin/python validation/tools/make_project_case.py
.venv/bin/python validation/tools/make_import_cases.py
```

## Aplicativo desktop (Tauri)

Em `app/desktop/src-tauri/`, depois de `npm run build` em `app/web/`:

```bash
cargo clippy -- -D warnings
```

```bash
cargo build --features tauri/custom-protocol
```

Verificação nativa, em `app/desktop/`. Confere `engine.info`, a estatística descritiva, a leitura do `.enzitag` escrito em Python, a recusa de arquivo adulterado e a leitura de XLSX pelo IPC. No Linux usa WebDriver sob Xvfb:

```bash
xvfb-run -a node tests/native-smoke.mjs src-tauri/target/debug/optima-desktop
```

No Windows, a mesma verificação usa o WebView2 por CDP (exige `npm ci` em `app/web`):

```bash
node tests/native-cdp.mjs src-tauri/target/release/optima-desktop.exe
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
