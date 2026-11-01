# DT-0005 — Contrato, serialização e geração de tipos TypeScript

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET01-T08, ET01-T11 |
| Pendências relacionadas | PD-01 |
| Substitui / substituída por | — |

## Contexto

Interface e motor precisam de um contrato único, versionado, com a mesma semântica no Worker WASM e no comando Tauri. Os tipos TypeScript não devem ser escritos à mão, e dados vindos do motor não podem ser aceitos apenas porque o TypeScript os declara.

## Decisão

1. **Fonte dos contratos:** tipos Rust em `optima-core`, `optima-project` e `optima-engine`, com `serde` (`camelCase`; enums etiquetados por `type` ou `status`).
2. **Transporte:** texto JSON nos dois ambientes. O ponto de entrada comum é `optima_engine::handle_json`; `optima-wasm` e o comando Tauri só o chamam.
3. **Versão do protocolo:** inteiro `PROTOCOL_VERSION`, enviado em toda solicitação e resposta e verificada **antes** de interpretar a operação; divergência gera `unsupportedProtocolVersion` com `expected` e `received`. É independente da versão do aplicativo e da versão de esquema do projeto.
4. **Erros:** códigos estáveis (`ErrorCode`) e parâmetros; a mensagem é resolvida pela interface (U17).
5. **Tipos TypeScript:** gerados com `ts-rs` 12 (`#[ts(export)]`); `scripts/gen-contracts.mjs` reúne os arquivos em `contracts.generated.ts`, acrescenta `PROTOCOL_VERSION` e `PROJECT_SCHEMA_VERSION` lidos do Rust e, com `--check`, falha se o arquivo versionado estiver desatualizado (CI).
6. **Validação em execução:** `parseResponse` confere a forma da resposta e o `taskId`; respostas de tarefas substituídas no mesmo canal são descartadas (`StaleResponseError`).
7. **Identificadores:** `StableId` (texto ASCII sem espaços, até 64 bytes), validado também na desserialização.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| `serde-wasm-bindgen` / objetos JS | Dois formatos diferentes entre WASM e Tauri; o texto JSON garante a mesma serialização e mesmo teste para ambos |
| `specta` ou `tsify` | Ambos servem; `ts-rs` gera arquivos por tipo sem acoplar ao `wasm-bindgen` e exporta enums com dados e campos opcionais como verificado nos testes |
| Tipos TypeScript escritos à mão | Divergência silenciosa entre Rust e interface |
| Protocolo com versão semântica | Um inteiro basta: qualquer mudança incompatível o incrementa |

## Evidências

- Testes do protocolo em `app/crates/optima-engine/tests/protocol_tests.rs` (versão incompatível, JSON malformado, operação desconhecida, round-trip).
- Enum com dados (`Outcome`, `OperationResult`) e `Option` (`taskId: string | null`) presentes no arquivo gerado.

## Consequências

- Novas operações acrescentam variantes a `Operation` e `OperationResult`, sem mudar `PROTOCOL_VERSION` se forem compatíveis para clientes existentes.
- Valores científicos usarão `f64` e nunca serão serializados como `NaN`/infinito (regra do roteiro); a representação de estados indefinidos será especificada com o primeiro método (ET02).
