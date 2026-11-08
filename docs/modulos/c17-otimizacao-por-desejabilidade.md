# C17 — Otimização por desejabilidade (com C06 predição, C16 malha e P01 vínculo da confirmação)

**Estado:** implementado; validado numericamente (nativo e WASM); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/optimization`; `app/crates/optima-project/src/confirmation.rs` |
| Arquivos de entrada | `optimization/mod.rs` (`optimize`, `evaluate_points`, `desirability_grid`) |
| Etapa de criação | ET08 |
| Depende de | C06 (`prediction`, `covariance`), C12/C16 (`surface::model::prepare`, `surface::contour`), C11 (`randomization`: PCG32, Fisher–Yates) |
| Consumido por | E01 (`optimizationRun`, `optimizationEvaluate`, `optimizationGrid`), P01 (`AnalysisResult::Optimization`, `Experiment.origin/confirmation`), U10 |
| Métodos | [desejabilidade](../metodos/desejabilidade.md), [busca e confirmação](../metodos/busca-otimizacao.md) |
| Decisão | [DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md) |

## 1. Responsabilidade

Ajustar o modelo de cada resposta, combinar objetivos por desejabilidade, buscar condições com vários inícios dentro da região experimental (ou de uma extensão explícita), devolver candidatos com previsões, intervalos, compromissos e relatório de convergência, avaliar condições dadas (confirmação) e produzir a malha de desejabilidade. Não acessa disco, rede, idioma ou interface.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `objective.rs` | `Goal`, `ResponseGoal`, limites, `DomainSpec`, `SearchOptions`, pedido; validação |
| `desirability.rs` | Desejabilidade individual e global |
| `constraints.rs` | `Problem`: modelos ajustados, domínio, violações, função minimizada |
| `search.rs` | Hipercubo latino e Nelder–Mead projetado |
| `candidates.rs` | Agrupamento, previsões e incerteza por candidato |
| `optimize.rs` | Orquestração, compromissos, convergência, fatos |
| `evaluate.rs` | Avaliação em condições dadas |
| `grid.rs` | Desejabilidade global sobre dois fatores |
| `optima-project/src/confirmation.rs` | `ExperimentOrigin`, `ConfirmationPlan` |
| `tests/optimization_validation.rs` | Validação contra busca exaustiva independente |

## 3. API pública

`optimization::optimize(&OptimizationRequest)`, `evaluate_points(&EvaluateRequest)`, `desirability_grid(&OptimizationGridRequest)`. Registro: `desirability_optimization` (`implemented` + `numericallyValidated`). Protocolo: `optimizationRun`, `optimizationEvaluate`, `optimizationGrid`.

## 4. Fluxo de dados

U10 (`OptimizationPanel`) → `optimizationRun` (canal cancelável) → `OptimizationResult` guardado como `AnalysisRecord` → candidatos e `optimizationGrid` → `optimizationEvaluate` nas condições arredondadas → ação `addConfirmation` cria o experimento vinculado com as previsões gravadas.

## 5. Erros e limitações

Ver [seção 7 do método](../metodos/busca-otimizacao.md#7-casos-sem-resultado-válido). Busca local sem prova de ótimo global; sem otimização de modelos mistos, de misturas ou não lineares; na interface, modelo completo por resposta; sem interrupção cooperativa no Windows nem progresso incremental.

## 6. Manutenção

- Novo tipo de objetivo: variante em `Goal`, validação, `individual`, testes à mão, caso em `make_optimization_cases.py` **independente do Rust**, campos na interface e textos PT/EN.
- Nova regra de restrição: `Problem::evaluate` (a mesma função serve à busca, aos candidatos e ao gráfico).
- Regenerar referências: `python validation/tools/make_optimization_cases.py`.
- Testes: `cargo test -p optima-core`; `npm test`; `npm run test:e2e`.

## 7. Testes e validação

Testes unitários de desejabilidade, hipercubo latino e Nelder–Mead; `tests/optimization_validation.rs` (6 casos contra busca exaustiva, sondagens contra NumPy, semente, domínio estendido, recusas, malha); paridade WebAssembly; testes do cliente (cancelamento); E2E (exemplo 04, limite inviável, domínio estendido, objetivo inválido, cancelamento, confirmação e reabertura); axe nos três temas.

## ET27 — Conferência da confirmação

`optimization/confirmation.rs` expõe `compare_confirmation`: calcula observado−previsto e classifica missing/below/above/within/noInterval com inclusão dos limites. Solicitações repetidas ou não finitas, limites invertidos e excesso de linhas são recusados; subtração com overflow retorna `Stat` indefinido. Não reestima o modelo nem o intervalo. A operação aditiva `confirmationCompare` mantém protocolo 1. [DT-0029](../decisoes-tecnicas/dt-0029-conferencia-de-confirmacao-no-motor.md); testes de unidade, protocolo JSON e verificação nativa.
