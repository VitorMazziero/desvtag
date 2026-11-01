# C06, C07 e C08 — Modelos lineares, ANOVA da regressão, intervalos e diagnósticos

**Estado:** implementado; validado numericamente (nativo e WASM); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/{models,inference,diagnostics}` |
| Arquivos de entrada | `models/mod.rs` (`fit_model`), `inference/mod.rs`, `diagnostics/mod.rs` |
| Etapa de criação | ET04 |
| Depende de | C01, C02, C03, C04, C19 |
| Consumido por | E01 (`modelFitLinear`); a partir da ET05, ANOVA, efeitos, superfícies e otimização |
| Método | [Regressão linear](../metodos/regressao-linear.md) |
| Decisão | [DT-0009](../decisoes-tecnicas/dt-0009-fundamentos-numericos-modelos-lineares.md) |

## 1. Responsabilidade

Montar a matriz do modelo a partir de um conjunto de dados, ajustar por QR, calcular erros-padrão, ANOVA da regressão, intervalos, predição estimável e diagnósticos por observação, com estados explícitos para posto deficiente, modelo saturado, resposta constante e mau condicionamento.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `models/terms.rs` | `ModelSpec`, `TermSpec`, `CategoricalCoding` |
| `models/design_matrix.rs` | Matriz do modelo, casos completos, codificação, interações e potências |
| `models/linear.rs` | `fit_matrix`, `fit_model`, `LinearFit`, `LinearModel` |
| `models/covariance.rs` | `(XᵀX)⁻¹` por coluna e forma quadrática com verificação de estimabilidade |
| `models/prediction.rs` | Predição e intervalos |
| `inference/regression_anova.rs` | Partição das somas de quadrados, R², F |
| `inference/intervals.rs` | Valores críticos t, valor-p bilateral, intervalos |
| `diagnostics/residuals.rs` | Padronizado e studentizado externo |
| `diagnostics/influence.rs` | Alavancagem e distância de Cook |
| `tests/linear_model_validation.rs` | NIST StRD e construtor contra referências independentes |
| `tests/linear_model_edge_cases.rs` | Casos de borda, escala, ordem das linhas, ida e volta |

Fora desta etapa (planejado no mapa): `estimability` como arquivo próprio e `marginal_means` (a estimabilidade vive em `covariance.rs`), `one_way_anova`, `factorial_anova` (ET05+), `assumptions`, `adequacy` (ET05–ET07).

## 3. API pública

`models::fit_model(&LinearModelRequest) -> Result<LinearFit, CoreError>`; `fit_model_with_predictions` (mantém `LinearModel` para `prediction::predict_row`/`predict_rows`); `fit_matrix(x, y, labels, intercept, confidence)` para matrizes prontas. Protocolo: `modelFitLinear` → `OperationResult::ModelFitLinear` (`LinearFit` em caixa) ou erro `invalidInput` com `issues`.

## 4. Fluxo de dados

U07 (ET05+) monta `ModelSpec` → protocolo JSON → E01 → `fit_model` → `LinearFit` → U08. Métodos de comparação e otimização usam diretamente `LinearModel` em Rust.

## 5. Erros e limitações

Ver [seção 7 da especificação](../metodos/regressao-linear.md#7-casos-sem-resultado-válido). Limites: resposta única; erros independentes e homocedásticos; sem pesos, blocos ou efeitos aleatórios (versões posteriores); matrizes densas (adequadas a centenas de linhas e dezenas de colunas — o custo do SVD de Jacobi para o número de condição é O(n·p²) por varredura).

## 6. Manutenção

- Novo tipo de termo: variante em `TermSpec`, colunas em `design_matrix.rs`, caso em `make_model_cases.py` (referência em Python **independente**), `buildRequest.ts` na interface.
- Nova estatística de saída: campo em `LinearFit` (regenerar `contracts.generated.ts`), referência no caso e verificação nos testes nativo e WASM.
- Testes: `cargo test -p optima-core`; `npm test`.

## 7. Testes e validação

101 testes unitários do núcleo, 3 de validação NIST/construtor (11 + 6 casos), 11 de borda; paridade WASM (18 testes) no Node; operação do protocolo com 2 testes. Medidas: [especificação](../metodos/regressao-linear.md#10-validação).
