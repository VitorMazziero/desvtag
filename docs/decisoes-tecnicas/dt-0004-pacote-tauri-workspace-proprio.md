# DT-0004 — Pacote Tauri em workspace próprio e transporte nativo

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET01-T17 |
| Pendências relacionadas | PD-01 |
| Substitui / substituída por | — |

## Contexto

O pacote do aplicativo Windows (`app/desktop/src-tauri`) depende de bibliotecas do sistema (WebView2 no Windows; WebKitGTK no Linux). Se fizesse parte do workspace `app/`, `cargo build --workspace` e `cargo test --workspace` falhariam em ambientes sem essas bibliotecas, inclusive no job Rust da CI e em máquinas de quem só quer trabalhar no motor.

## Decisão

1. `app/desktop/src-tauri` é um workspace Cargo independente (`[workspace]` vazio no seu `Cargo.toml`, com seu `Cargo.lock`) e está em `exclude` do workspace `app/`.
2. Consome `optima-engine` por caminho relativo; os arquivos `commands.rs` e `jobs.rs` apenas transportam texto JSON, como o adaptador WASM.
3. O comando `engine_request` é `async` e executa o motor em `spawn_blocking`, fora da thread da interface.
4. A janela principal recebe permissões mínimas (`capabilities/default.json` sem permissões de plugins) e uma CSP restritiva; nenhum acesso a arquivos ou rede é concedido na ET01.
5. O instalador-alvo é NSIS por usuário (`installMode: currentUser`).
6. O ícone é gerado a partir de `docs/imagens/logo.png` (`tauri icon --fit contain`), sem edição do logo.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Pacote Tauri dentro do workspace `app/` | Quebra builds sem WebView; acopla o motor às dependências do sistema |
| Comando síncrono | Bloquearia a thread principal durante cálculos longos |
| Serialização estruturada em vez de texto JSON | Duas serializações para o mesmo contrato; o texto JSON é idêntico ao do WASM (ver [DT-0005](dt-0005-contrato-serializacao-tipos.md)) |

## Consequências

- A CI compila o Tauri em um job separado (Linux em todo PR; Windows em `main`, etiquetas e disparo manual).
- `scripts/check-versions.mjs` garante que a versão do pacote Tauri coincide com a do workspace.
- Verificação do aplicativo nativo: `app/desktop/tests/native-smoke.mjs` (WebDriver via `tauri-driver`).
