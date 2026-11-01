# U12 — Cliente do motor (interface)

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/services/engine`, `app/web/src/workers` |
| Arquivo de entrada | `services/engine/index.ts` |
| Etapa de criação | ET01 |
| Depende de | E01 (contratos gerados), E03 ou E04 |
| Consumido por | Funcionalidades da interface |

## 1. Responsabilidade

Um contrato único (`EngineClient`) para chamar o motor, independentemente do ambiente. A interface nunca calcula estatística.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `contracts.generated.ts` | Tipos gerados do Rust (nunca editar) |
| `EngineClient.ts` | Contrato, `createEngineClient`, validação da resposta, descarte de respostas obsoletas |
| `wasmClient.ts` e `workers/engine.worker.ts` | Navegador: Worker dedicado com o WASM |
| `tauriClient.ts` | Windows: `invoke("engine_request")` |
| `index.ts` | API pública e escolha do cliente (`isTauri`) |

## 3. API pública

`createDefaultEngineClient()`; `client.request(operation, { channel })` devolve `EngineResponse` ou rejeita com `StaleResponseError` (substituída por solicitação mais nova do mesmo canal) ou `ProtocolError` (resposta fora do protocolo ou `taskId` diferente). `client.dispose()` encerra o Worker.

## 4. Erros e limitações

Erros do motor chegam como resposta `status: "error"` com código; falhas de transporte rejeitam a promessa. A tradução das mensagens pertence à interface (`i18n`). Cancelamento de cálculo longo entra na ET08.

## 5. Manutenção

Novo método do motor: regenerar tipos e usar `client.request`. Testes: `npm test` (transporte simulado), `npm run test:e2e` (WASM real) e `native-smoke.mjs` (Tauri).
