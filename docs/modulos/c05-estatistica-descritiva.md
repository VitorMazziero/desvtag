# C05 — Estatística descritiva (com C01, C02, C03 e C18 iniciais)

**Estado:** implementado; validado numericamente (nativo e WASM); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/{descriptive,domain,validation,numeric,interpretation}` |
| Arquivo de entrada | `descriptive/mod.rs` (`summarize`) |
| Etapa de criação | ET02 |
| Depende de | C01, C02, C03, C18 e C19 (`registry`, `provenance`) |
| Consumido por | E01 (`dispatch.rs`, operação `descriptiveSummarize`) |
| Método | [Estatística descritiva](../metodos/estatistica-descritiva.md) |

## 1. Responsabilidade

Resumir uma resposta, no todo e por grupo, com estados indefinidos explícitos. Não acessa disco, rede, idioma ou interface. Não infere independência.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `descriptive/mod.rs` | `DescriptiveRequest`, `DescriptiveResult`, `summarize` (valida e orquestra) |
| `descriptive/summary.rs` | `Summary`, `Stat`, `UndefinedReason`; algoritmo de média e variância |
| `descriptive/grouped.rs` | Formação, ordenação e resumo dos grupos; contagem de excluídos |
| `domain/dataset.rs` | `Dataset`, `Factor`, `Response`, `Observation`, `FactorValue` |
| `validation/dataset.rs` | Diagnósticos estruturais codificados (`dataset.*`) |
| `numeric/summation.rs` | Soma compensada de Neumaier |
| `interpretation/{facts,rules}.rs` | Fatos por chave (`descriptive.*`), sem texto |
| `tests/descriptive_validation.rs` | Validação contra os casos NIST |

## 3. API pública

`optima_core::descriptive::summarize(&DescriptiveRequest) -> Result<DescriptiveResult, CoreError>`. Erro: `CoreError::InvalidInput(Vec<Issue>)`. Pelo protocolo: `descriptiveSummarize` → `OperationResult::DescriptiveSummarize` ou erro `invalidInput` com `issues`.

## 4. Fluxo de dados

Interface (U04 grade → `buildDataset`) → protocolo JSON → E01 → `summarize` → resultado → U08 (tabela e interpretação).

## 5. Erros e limitações

Ver a seção 7 da [especificação](../metodos/estatistica-descritiva.md). Limites: `n` até `u32::MAX`; sem quantis nem mediana (entram quando houver consumidor); a unidade experimental ainda não altera o cálculo.

## 6. Manutenção

- Novo resumo estatístico: campo em `Summary`, cálculo em `summary.rs`, caso em `validation/cases/descriptive_summary/` (regerar com `validation/tools/make_descriptive_cases.py`), regenerar tipos (`npm run gen:contracts`), coluna em `DescriptiveTable.tsx`, textos PT/EN.
- Novo fato interpretável: regra em `interpretation/rules.rs` e chaves em `results.json` nos dois idiomas.
- Testes: `cargo test -p optima-core`; `npm test` (paridade WASM); `npm run test:e2e`.

## 7. Testes e validação

48 testes unitários em `optima-core` (incluindo estouro, ausentes, constante e deslocamento grande), 2 de validação NIST nativos, 9 casos NIST no WASM, E2E do fluxo.
