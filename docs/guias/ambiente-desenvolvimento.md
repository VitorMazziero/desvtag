# Guia do ambiente de desenvolvimento

**Estado:** vigente · **Atualizado em:** 2026-11-01

Comandos **executados com sucesso** em Linux (Ubuntu 24.04, Rust 1.97.0, Node 22.23.4) e no **Windows 10 Pro 22H2** (Rust 1.97.0, Node 22.23.4); a seção [Windows](#windows) registra a execução e o que não foi verificado (Windows 11).

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Git | recente | — |
| Rust via `rustup` | 1.97.0 | `rust-toolchain.toml` instala a versão e o alvo `wasm32-unknown-unknown` automaticamente na primeira execução |
| Node.js | 22 (`.nvmrc`) na v0.1; **26 a partir da v0.2** ([DT-0015](../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)) | inclui o npm. Todas as evidências da v0.1 foram obtidas no Node 22; o Node 26 ainda não foi verificado com o projeto. Com mais de um Node instalado, use um gerenciador de versões que leia o `.nvmrc` (por exemplo fnm ou nvm-windows) para que o terminal use o 22 |
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

`E2E_BROWSERS=chrome` e `E2E_BROWSERS=msedge` usam o Google Chrome e o Microsoft Edge instalados no sistema (rodados no Windows 10; não cobertos no Linux).

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

Verificação nativa, em `app/desktop/`. Confere `engine.info`, a estatística descritiva, a leitura do `.enzitag` escrito em Python, a recusa de arquivo adulterado e a leitura de XLSX pelo IPC, além do cálculo dos métodos e da exportação de XLSX pelo motor. No Linux (compilar antes com `cargo build --features tauri/custom-protocol` em `src-tauri/`, para embutir a interface) usa WebDriver sob Xvfb:

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

Executado em 2026-11-01 no **Windows 10 Pro 22H2 (build 19045, 64 bits)** da máquina de desenvolvimento (Windows 11 não verificado, decisão do usuário):

| Ferramenta | Como foi obtida |
|---|---|
| Ferramentas de compilação C++ (MSVC) | Visual Studio Community 2026 com a carga de trabalho de C++ |
| WebView2 | Já presente (156.0.4314.58) |
| Rust 1.97.0 | `rustup-init` oficial (`rust-toolchain.toml` instala o alvo `wasm32-unknown-unknown`) |
| Node 22 | `node-v22.23.4-win-x64.zip` de nodejs.org (a versão do `.nvmrc`); o `winget install OpenJS.NodeJS.LTS` instala o Node 26, que o projeto ainda não usa ([DT-0015](../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)) |
| `wasm-bindgen-cli` 0.2.130 | `cargo install wasm-bindgen-cli --version 0.2.130 --locked` |

Com isso, os comandos das seções anteriores funcionaram sem alteração. Para o aplicativo nativo (em `app/desktop`, depois do `npm ci` em `app/web`), o instalador de teste **sem** a chave do atualizador pode ser gerado com:

```powershell
$env:TAURI_CONFIG='{"bundle":{"createUpdaterArtifacts":false}}'; npm --prefix ../web exec -- tauri build
```

O instalador de release (com `.sig` para o atualizador) exige `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` no ambiente e é gerado pelo fluxo `release.yml`.

Dica: as pastas `target/` (Rust) e `node_modules/` ocupam gigabytes; se o repositório estiver em uma pasta sincronizada (OneDrive), exclua-as da sincronização (ou defina `CARGO_TARGET_DIR` fora dela).

Diferenças encontradas ao rodar no Windows (já corrigidas no repositório): testes que montavam caminhos de arquivo com `URL.pathname` e um filtro de casos de validação que usava `/` em vez do separador do sistema.
