# Funções especiais

**Estado:** implementado; validado numericamente (nativo e WebAssembly) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | — (funções internas, sem operação própria; avaliadas via `distributionEvaluate`) |
| Módulos | C03 `numeric/{special_functions,root_finding}` |
| Etapa | [ET04](../planos-execucao/ativos/et04-fundamentos-numericos-modelos.md) |
| Casos de validação | [`validation/cases/distributions/`](../../validation/cases/distributions/001-normal/README.md) |

## 1. Pergunta

Como calcular `ln Γ`, as funções gama e beta incompletas regularizadas e `erfc` com **precisão relativa**, inclusive em caudas de até 1e-300 e parâmetros muito grandes, de modo idêntico em Rust nativo e WebAssembly?

## 2. Pressupostos

Argumentos finitos; parâmetros de forma positivos. Fora do domínio devolve `NaN` internamente; as camadas acima (C04, `distributionEvaluate`) convertem em estado explícito `outOfDomain`.

## 3. Entradas e opções

Sem opções. Critério de parada fixo `2ε` e limite de iterações (séries e frações contínuas); falta de convergência é falha, não valor aproximado silencioso.

## 4. Fórmulas

- `ln Γ(x)`: Lanczos (g = 7, nove coeficientes, Godfrey) para `x < 15`, com `ln Γ(x) = ln Γ(x+1) − ln x` abaixo de 0,5; Stirling `(x−½)ln x − x + ½ ln 2π + Σ B₂ₖ/(2k(2k−1)x^(2k−1))` até `x⁻¹⁵` (erro < 1e-19) para `x ≥ 15`.
- `ln B(a, b) = ln Γ(a) + ln Γ(b) − ln Γ(a+b)` **sem cancelamento**: para argumentos ≥ 15, usa-se a correção de Stirling (como `lbeta` do R).
- Gama incompleta regularizada `P(a, x)`, `Q(a, x) = 1 − P`: série de `P` para `x < a+1`; fração contínua de `Q` (Lentz modificado) caso contrário. O prefator `xᵃ e⁻ˣ / Γ(a+1)` usa o método de Loader (`stirlerr`, `bd0`) para `a` grande.
- Beta incompleta regularizada `Iₓ(a, b)`: fração contínua de Lentz, com a simetria `Iₓ(a,b) = 1 − I₁₋ₓ(b,a)` escolhida para que a **cauda pequena** seja sempre calculada diretamente. O chamador passa `x` e `y = 1−x` separados.
- `erfc(z) = Q(½, z²)` para `z ≥ 0`; na cauda (`z² ≥ 1,5`) o quadrado `z²` é obtido **exato** (`hi + lo`, por `mul_add`), pois seu erro seria amplificado por `exp(−z²)`.
- Busca de raiz: Brent (1973), com tolerância relativa; limite de 500 iterações.

## 5. Algoritmo numérico

Ver fórmulas. Escolhas guiadas por medição: o critério de parada `1e-16` (abaixo de ε) nunca é satisfeito por ruído de arredondamento; `2ε` converge. A forma de F e t por beta incompleta evita `1 − p`. O erro de arredondamento de `ln Γ` com argumentos grandes motivou a correção de Stirling nas diferenças.

## 6. Saídas

Pares `(cauda inferior, cauda superior)` com `P + Q = 1`, calculando a menor diretamente.

## 7. Casos sem resultado válido

`NaN` interno para parâmetros ≤ 0 ou argumentos fora do domínio; `NoConvergence` nas buscas de raiz.

## 8. Exemplo

Testes unitários usam formas fechadas: `Γ(10) = 9!`, `Γ(½) = √π`, `Q(1, x) = e⁻ˣ`, `P(½, 1) = erf(1)`, `Iₓ(1,1) = x`, `Iₓ(2,1) = x²`, `Iₓ(1,2) = 1 − (1−x)²`, a simetria `Iₓ(a,b) + I₁₋ₓ(b,a) = 1`, `erfc(5) = 1,5374597944280349e-12`; além dos pontos do mpmath.

## 9. Interpretação ao usuário

Não aplicável (função interna).

## 10. Validação

Pontos de referência do mpmath 1.4.1 (60 dígitos) em [`validation/cases/distributions/`](../../validation/cases/distributions/001-normal/README.md), gerados por `validation/tools/make_distribution_cases.py`. Erros medidos e tolerâncias em [distribuicoes](distribuicoes.md#10-validação).

## 11. Referências

- Lanczos, C. (1964). A precision approximation of the gamma function. *SIAM J. Numer. Anal.* B1, 86–96.
- Press, W. H. et al. *Numerical Recipes*, §6.1–6.4.
- Loader, C. (2000). *Fast and accurate computation of binomial probabilities* (`stirlerr`, `bd0`).
- Brent, R. P. (1973). *Algorithms for Minimization without Derivatives*, cap. 4.
- Abramowitz, M.; Stegun, I. *Handbook of Mathematical Functions*, 6.5, 26.5, 7.1.
