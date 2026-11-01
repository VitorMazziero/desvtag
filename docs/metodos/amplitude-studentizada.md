# Distribuição da amplitude studentizada

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | — (distribuição; operação `distributionEvaluate` com `studentizedRange`) |
| Módulos | C04 `distributions/studentized_range`, C03 `numeric/integration` |
| Etapa | [ET05](../planos-execucao/ativos/et05-anova-tukey-letras.md) |
| Decisão | [DT-0010](../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md) |
| Casos de validação | [`validation/cases/studentized_range/`](../../validation/cases/studentized_range/001-grade-scipy-mpmath/README.md) |

## 1. Pergunta

Qual a distribuição de `Q = (máx ȳᵢ − mín ȳᵢ)/s` para `k` médias de normais independentes com `s² = χ²_ν/ν` independente? É a base do valor-p e do intervalo simultâneo do teste de Tukey.

## 2. Pressupostos

Médias independentes com a mesma variância; `ν` graus de liberdade do erro (real positivo; `∞` permitido no núcleo). `k` entre 2 e 1000.

## 3. Entradas e opções

`q`, `k`, `ν`; para o quantil, a cauda `α ∈ [1e-10, 1)`.

## 4. Fórmulas

`P(Q ≤ q) = ∫₀^∞ f_s(s)·W(q·s; k) ds`, com `W(w; k) = k ∫_{−∞}^{∞} φ(z) [Φ(z) − Φ(z − w)]^{k−1} dz` e `f_s` a densidade de `√(χ²_ν/ν)`. Para `ν = ∞`, `P = W(q; k)`. Para `k = 2`, `Q = √2·|T|` com `T ~ t_ν` (usado como verificação exata).

## 5. Algoritmo numérico

Quadratura composta de Gauss–Legendre (nós por Newton nos polinômios de Legendre; `numeric/integration.rs`), como em Copenhaver e Holland (1988), com nós fixados uma vez por `(k, ν)` e reaproveitados para muitos `q`:

- **interna** em `z ∈ [−8,5; 8,5]` (o integrando é limitado por `φ(z)`), 16 painéis × 12 nós; a diferença `Φ(z) − Φ(z − w)` usa a cauda superior quando `z > w/2`, para evitar cancelamento;
- **externa** pela probabilidade de cauda do `χ²_ν`: 16 painéis (décadas de 1e-15 a 1e-3, depois 1e-3…0,5), de ordem 10 a 16, com nós **em `ln(cauda)`** — nessa variável o integrando é analítico; em `u` ele tem uma singularidade em 0 que fazia o erro chegar a 1e-10 com df pequeno e caudas profundas (descoberto na validação e corrigido). Cada painel entra pelas duas caudas do `χ²`.

A cauda superior é `1 − cdf` (erro absoluto ~1e-13). Quantis: Brent no logaritmo da cauda.

## 6. Saídas

`cdf`, `sf`, `quantile_upper`; `StudentizedRange::new(k, ν)` reaproveita os nós (custo medido em Linux, compilação otimizada: `new` < 1 ms; um `sf` ≈ 3–9 ms; 45 pares com `k = 10` ≈ 0,4 s; 325 pares com `k = 26` ≈ 1,1 s).

## 7. Casos sem resultado válido

`k < 2`, `ν ≤ 0` ou `NaN` e `α` fora de `[1e-10, 1)` → `OutOfRange`; pela operação do protocolo, `invalidInput` (parâmetros) ou `undefined(outOfDomain)` (argumento).

## 8. Exemplo

`k = 3`, `ν = 10`, `α = 0,05`: `q_crít = 3,8768` (tabelas usuais: 3,877); `k = 4`, `ν = 20`: `3,958`.

## 9. Interpretação ao usuário

Não aplicável (interna ao Tukey).

## 10. Validação

Grade de 432 pontos com **SciPy 1.18.1** (`studentized_range`): `k ∈ {2, 3, 4, 5, 8, 10, 20, 50}`, `ν ∈ {2, 3, 5, 10, 20, 60, 120, 1000, ∞}` e caudas `0,5, 0,1, 0,05, 0,01, 1e-3, 1e-5`. A referência foi conferida pela própria **definição com mpmath** (integral dupla, 20 dígitos) em 10 pontos: SciPy − mpmath ≤ 1,4e-14; implementação − mpmath ≤ 4,2e-13.

| Verificação | Medido (2026-11-01) | Tolerância |
|---|---|---|
| `cdf` e `sf` contra o SciPy (432 pontos) | erro absoluto máximo 5,05e-13 | 2e-12 |
| Quantil superior contra o SciPy (1/3 dos pontos, α ≥ 1e-3) | erro relativo máximo 5,5e-12 (3,7e-11 em todos) | 1e-9 |
| mpmath (10 pontos) | 4,2e-13 | 2e-12 |
| `k = 2` contra a t de Student (testes unitários) | < 1e-11 | 1e-11 |
| WebAssembly (pontos com ν finito e α ≥ 0,01) | mesmos | 2e-12 |

**Limites.** O erro absoluto da cauda (1e-13) torna o valor-p confiável a ~4 algarismos até p ≈ 1e-9; abaixo disso é indicativo. Windows 11: pendente.

## 11. Referências

- Copenhaver, M. D.; Holland, B. S. (1988). Computation of the distribution of the maximum studentized range statistic with application to multiple significance testing of simple effects. *J. Statist. Comput. Simul.* 30, 1–15.
- Lund, R. E.; Lund, J. R. (1983). Algorithm AS 190: probabilities and upper quantiles for the studentized range. *Applied Statistics* 32, 204–210.
- Tukey, J. W. (1953). *The problem of multiple comparisons*.
