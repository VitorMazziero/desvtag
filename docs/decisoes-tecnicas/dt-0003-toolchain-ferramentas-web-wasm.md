# DT-0003 — Toolchain, ferramentas web e build WebAssembly

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET01-T02, ET01-T03 |
| Pendências relacionadas | PD-01 (parcial: base técnica) |
| Substitui / substituída por | Linha "Node.js" substituída a partir da v0.2 pela [DT-0015](dt-0015-migracao-node-26-na-v0-2.md); as demais linhas continuam vigentes |

## Contexto

A ET01 precisa de um ambiente reproduzível para Rust, WebAssembly e interface, com versões fixadas e que funcione no Windows 11, no Linux da CI e no navegador. As ferramentas foram avaliadas em 2026-11-01 consultando os registros oficiais (crates.io e npm) e executando cada uma neste repositório.

## Decisão

| Item | Escolha | Fixação |
|---|---|---|
| Rust | 1.97.0 estável, edição 2024, resolver 3, alvo `wasm32-unknown-unknown` | `rust-toolchain.toml` |
| Node.js | 22 (LTS; testado com 22.23.4) na v0.1.x; **26 a partir da v0.2** ([DT-0015](dt-0015-migracao-node-26-na-v0-2.md)) | `.nvmrc` e `engines` do `package.json` |
| Gerenciador JS | npm, com `package-lock.json` | `npm ci` na CI |
| Bundler e servidor | Vite 8.3.5 com `@vitejs/plugin-react` | versões exatas no `package.json` |
| Linguagem da interface | TypeScript 7.0.2, `strict` e `noUncheckedIndexedAccess` | idem |
| Testes unitários e de componente | Vitest 5.0.5, jsdom, Testing Library | idem |
| E2E | Playwright 1.64.1 (Chromium e Firefox; Edge com `E2E_BROWSERS=msedge`) | idem |
| Lint e formatação | Biome 2.6.4 (ferramenta única, recomendada) | idem |
| Build WASM | `cargo build --target wasm32-unknown-unknown` + `wasm-bindgen` CLI **na mesma versão** da crate (0.2.130) | `=0.2.130` no Cargo; `scripts/build-wasm.mjs` recusa versões diferentes |
| Estrutura JS | Um único pacote em `app/web`; a CLI do Tauri é dependência de desenvolvimento dele e roda de `app/desktop` com `npm --prefix ../web exec -- tauri …` | — |

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| `wasm-pack` | Está mantido (0.15.1, publicado em 2026-10-30, repositório na organização `wasm-bindgen`), mas acrescenta uma camada sobre o `wasm-bindgen`. Chamar o CLI diretamente expõe o mesmo resultado com um passo a menos e versões verificadas pelo script. Pode ser adotado depois sem mudar o contrato |
| pnpm | Disponível no ambiente de desenvolvimento, porém npm vem com o Node e basta para um único pacote |
| ESLint + Prettier | Duas ferramentas e mais dependências; o Biome cobre lint, formatação e organização de imports com uma configuração |
| Workspace JS em `app/` | Só há um pacote JS; um workspace acrescentaria indireção sem benefício |
| Rust em canal `stable` sem fixação | Resultados e avisos de lint mudam sem aviso; a fixação mantém clones e CI idênticos |

## Critérios e evidências

- `cargo fmt --check`, `cargo clippy -D warnings` e `cargo test` executados no workspace (ver [registro da ET01](../planos-execucao/concluidos/et01-fundacao-tecnica.md)).
- Build WASM release de `optima-wasm`: 149 569 bytes (`optima_wasm_bg.wasm`).
- E2E no Chromium e no Firefox carregando o WASM real em um Worker.
- Situação de manutenção (crates.io, 2026-11-01): `wasm-bindgen` 0.2.130 e `wasm-pack` 0.15.1 (2026-10-30); `tauri` 2.12.5 e `tauri-cli` 2.12.4 (2026-10-21). O Tauri 3 existe apenas como pré-lançamento (`3.0.0-alpha`) e não foi adotado.

## Consequências

- Atualizar `wasm-bindgen` exige atualizar o CLI e a variável `WASM_BINDGEN_VERSION` da CI no mesmo commit.
- Atualizar a versão do Rust é uma decisão registrada (altera `rust-toolchain.toml` e `rust-version`).
- O inventário de dependências fica em [dependências](../arquitetura/dependencias.md).
