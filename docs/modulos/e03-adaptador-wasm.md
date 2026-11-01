# E03 — Adaptador WebAssembly

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pacote/pasta | `app/crates/optima-wasm` |
| Arquivo de entrada | `src/lib.rs` |
| Etapa de criação | ET01 |
| Depende de | E01 (`optima-engine`) |
| Consumido por | U12 (`workers/engine.worker.ts`) |

## 1. Responsabilidade

Expõe `handleRequest(texto) -> texto` ao JavaScript e nada mais. Não tem fórmulas nem regras próprias.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib.rs` | Função exportada por `wasm-bindgen` que chama `optima_engine::handle_json` |

`conversion.rs` e `errors.rs`, previstos no mapa, não foram criados: o transporte em texto dispensa conversão e panics em WASM encerram a instância (o Worker converte a falha em erro de transporte). Entram se uma necessidade real surgir.

## 3. Build

`npm run build:wasm` (em `app/web`) compila para `wasm32-unknown-unknown` e executa `wasm-bindgen --target web`, gravando em `app/web/src/services/engine/wasm/` (ignorado pelo Git). O script recusa `wasm-bindgen-cli` de versão diferente da crate ([DT-0003](../decisoes-tecnicas/dt-0003-toolchain-ferramentas-web-wasm.md)).

## 4. Manutenção

Mudou a API do motor: nada a alterar aqui enquanto `handle_json` mantiver a assinatura. Verificação: E2E `app/web/tests/e2e/engine-info.spec.ts`, que usa o WASM real em Chromium e Firefox.
