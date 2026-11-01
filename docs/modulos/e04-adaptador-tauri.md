# E04 — Adaptador Windows (Tauri)

**Estado:** implementado (motor e arquivos); autenticação e atualizador pendentes · **Atualizado em:** 2026-11-01

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

| `src/files.rs` | Gravação segura (`write_atomic`), lista de recentes, leitura com limite; 7 testes |
| `src/commands.rs` | Também `project_open`, `project_open_recent`, `project_recent`, `project_save`, `project_save_copy`, `project_detach` (diálogos nativos; o caminho nunca vem da interface) |

`auth.rs` (Drive, posterior) e `updater.rs` (ET10) entram nas respectivas etapas.

## 3. Verificação

`tests/native-checks.mjs` reúne as verificações (versões, descritiva, leitura do `.enzitag` escrito em Python, arquivo adulterado recusado, XLSX) e dois executores: `native-smoke.mjs` (Linux: `tauri-driver` + WebKitGTK sob Xvfb) e `native-cdp.mjs` (Windows: WebView2 por CDP com Playwright). Os diálogos de arquivo não são automatizáveis; a gravação é testada diretamente (`cargo test`).

## 4. Manutenção

Novo comando: função em `commands.rs`, registro em `generate_handler!` e permissão no arquivo de capabilities quando o Tauri exigir. Testes: `cargo clippy -- -D warnings` e `native-smoke.mjs`.
