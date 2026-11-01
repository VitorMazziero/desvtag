# C03 e C04 — Fundamentos numéricos e distribuições

**Estado:** implementado; validado numericamente (nativo e WASM); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/{numeric,distributions}` |
| Arquivos de entrada | `numeric/mod.rs`, `distributions/mod.rs` |
| Etapa de criação | ET02 (`summation`), ET04 (demais) |
| Depende de | — (C03); C03 (C04) |
| Consumido por | C05, C06–C08 e, a partir da ET05, C07 (ANOVA), C09 (Tukey), C17 |
| Métodos | [Fundamentos numéricos](../metodos/fundamentos-numericos.md), [Funções especiais](../metodos/funcoes-especiais.md), [Distribuições](../metodos/distribuicoes.md) |
| Decisão | [DT-0009](../decisoes-tecnicas/dt-0009-fundamentos-numericos-modelos-lineares.md) |

## 1. Responsabilidade

C03: soma compensada, matriz, QR com pivoteamento e posto, valores singulares (número de condição), funções especiais e busca de raízes. C04: `cdf`, cauda superior e quantis de Normal, t, qui-quadrado e F, e a avaliação em lote por contrato. Não acessam disco, rede, idioma ou interface.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `numeric/summation.rs` | Soma de Neumaier |
| `numeric/matrix.rs` | Matriz densa e produtos |
| `numeric/qr.rs` | QR de Householder com pivoteamento, posto, `Qᵀy`, `Qz`, `(RᵀR)⁻¹` |
| `numeric/svd.rs` | Valores singulares por Jacobi e número de condição |
| `numeric/special_functions.rs` | `ln Γ`, `ln B`, gama e beta incompletas, `erfc` |
| `numeric/root_finding.rs` | Brent |
| `distributions/{normal,student_t,chi_square,f}.rs` | Funções de cada distribuição |
| `distributions/quantile.rs` | Inversão de caudas por Brent no logaritmo |
| `distributions/evaluate.rs` | `DistributionRequest`/`Result` e `evaluate` |
| `tests/distributions_validation.rs` | Pontos mpmath |

Não criados (nenhum consumidor até a ET05): `cholesky`, `integration`, `random`, `studentized_range`, `noncentral`, `multivariate_t`.

## 3. API pública

`QrDecomposition::new(&Matrix, tol)`, `singular_values`, `condition_number`, `brent`, `special_functions::*`, `normal::{cdf, sf, quantile, quantile_upper}` e análogas; `distributions::evaluate(&DistributionRequest) -> Result<DistributionResult, CoreError>`. Pelo protocolo: `distributionEvaluate`.

## 4. Fluxo de dados

Métodos de C06–C09 → C04/C03. A interface só alcança `evaluate` pela operação `distributionEvaluate` (hoje usada na verificação WASM).

## 5. Erros e limitações

Funções internas devolvem `NaN` fora do domínio; `evaluate` converte em `undefined(outOfDomain)`. Quantis: cauda mínima `1e-300`. t com g.l. ≥ 1e5: erro até 2e-11 em `sf`. Ver tabelas de erro medido em [distribuições](../metodos/distribuicoes.md#10-validação).

## 6. Manutenção

- Nova distribuição: arquivo em `distributions/`, variante em `Distribution`, pontos mpmath em `validation/tools/make_distribution_cases.py`, bloco em `distributions_validation.rs` **e** em `numeric.parity.test.ts`.
- Alterar critérios de parada ou tolerâncias exige regenerar a tabela de erros medidos na especificação.
- Testes: `cargo test -p optima-core`; `npm test` (paridade WASM).

## 7. Testes e validação

Testes unitários de cada rotina (formas fechadas, ortogonalidade de `Q`, posto independente da escala, SVD, Brent), 531 pontos de referência do mpmath nativos e no WebAssembly.
