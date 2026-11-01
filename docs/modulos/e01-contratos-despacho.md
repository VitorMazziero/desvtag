# E01 — Contratos e despacho do motor

**Estado:** implementado (operação `engineInfo`; nenhum método científico) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pacote/pasta | `app/crates/optima-engine` |
| Arquivo de entrada | `src/lib.rs` |
| Etapa de criação | ET01 |
| Depende de | `optima-core` (C19, C01), `optima-project` (versão de esquema) |
| Consumido por | E03 (WASM), E04 (Tauri) |

## 1. Responsabilidade

Define o protocolo entre a interface e o motor e o despacho das operações. **Não** contém fórmulas, acesso a arquivos, idioma ou tema. A semântica é única para o navegador e o Windows ([DT-0005](../decisoes-tecnicas/dt-0005-contrato-serializacao-tipos.md)).

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/request.rs` | `EngineRequest`, `Operation`, `PROTOCOL_VERSION` |
| `src/response.rs` | `EngineResponse`, `Outcome`, `OperationResult`, `EngineError`, `ErrorCode`, `EngineInfo` |
| `src/dispatch.rs` | `handle_json` (texto→texto) e `handle_request` (tipado) |
| `src/capabilities.rs` | Monta `EngineInfo` com versões e capacidades |
| `tests/protocol_tests.rs` | Comportamento público do protocolo |

## 3. API pública

- `handle_json(&str) -> String`: entrada única dos adaptadores.
- `handle_request(&EngineRequest) -> EngineResponse`.
- Operações: `engineInfo` (versões e capacidades), `descriptiveSummarize` (resumo descritivo), `projectEncode`/`projectDecode` (arquivo `.enzitag` em base64) e `importXlsx` (grade de texto de uma planilha).
- Erros: `invalidRequest`, `unsupportedProtocolVersion` (`expected`, `received`), `invalidInput`, `invalidProject` e `invalidImport` (os três últimos com `issues` codificados).

## 4. Fluxo de dados

Interface (U12) → texto JSON → `handle_json` → resposta JSON com o mesmo `taskId` → U12 valida a forma e descarta respostas obsoletas.

## 5. Erros e limitações

A versão do protocolo é verificada antes da operação: um cliente de outra versão recebe `unsupportedProtocolVersion` mesmo com operação desconhecida. JSON ilegível devolve `taskId: null`. Cancelamento, progresso e tarefas longas (E02) entram na ET08.

## 6. Exemplo

```json
{"protocolVersion":1,"taskId":"t-1","operation":{"type":"engineInfo"}}
```

## 7. Manutenção

- Nova operação: variante em `Operation` e `OperationResult`, ramo em `dispatch.rs`, teste em `tests/protocol_tests.rs`, regenerar tipos (`npm run gen:contracts`) e atualizar esta ficha.
- Mudança incompatível: incrementar `PROTOCOL_VERSION`.
- Testes: `cargo test -p optima-engine`.

## 8. Testes e validação

Seis testes de integração do protocolo. Sem método científico: nada a validar numericamente.
