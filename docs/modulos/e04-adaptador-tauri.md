# E04 — Adaptador Windows (Tauri)

**Estado:** implementado (comando do motor); arquivos, autenticação e atualizador pendentes · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pacote/pasta | `app/desktop/src-tauri` (workspace Cargo próprio, [DT-0004](../decisoes-tecnicas/dt-0004-pacote-tauri-workspace-proprio.md)) |
| Arquivo de entrada | `src/lib.rs` (`run`), `src/main.rs` |
| Etapa de criação | ET01 |
| Depende de | E01 |
| Consumido por | U12 (`tauriClient.ts`) |

## 1. Responsabilidade

Janela do aplicativo e transporte nativo do protocolo. O cálculo roda em thread de trabalho, fora da thread da interface.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib.rs` | Configura o Tauri e registra os comandos |
| `src/commands.rs` | `engine_request(request_json) -> String` |
| `src/jobs.rs` | `run_blocking`: executa trabalho em `spawn_blocking` |
| `tauri.conf.json` | Janela, CSP restritiva, instalador NSIS por usuário |
| `capabilities/default.json` | Sem permissões adicionais |
| `icons/` | Gerados de `docs/imagens/logo.png` |

`files.rs` (ET03), `auth.rs` (Drive, posterior) e `updater.rs` (ET10) entram nas respectivas etapas.

## 3. Verificação

`app/desktop/tests/native-smoke.mjs` abre o executável via `tauri-driver` e confere que a interface obtém `engine.info` do motor nativo. Executado em Linux (WebKitGTK sob Xvfb). Não substitui a verificação no Windows (WebView2), ainda pendente.

## 4. Manutenção

Novo comando: função em `commands.rs`, registro em `generate_handler!` e permissão no arquivo de capabilities quando o Tauri exigir. Testes: `cargo clippy -- -D warnings` e `native-smoke.mjs`.
