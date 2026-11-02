# Potência, tamanho de amostra e precisão

**Estado:** implementado; validado contra o SciPy · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `power_analysis` |
| Módulos | C15 `power/{anova,t_test}`; C04 `distributions/noncentral` |
| Etapa | [ET18](../planos-execucao/ativos/et18-nao-linear-e-potencia.md) |
| Casos de validação | [`validation/cases/power_analysis`](../../validation/cases/power_analysis/power.json) (100 pontos de F não central, 120 de t não central e 9 casos de potência); gerador [`make_power_nonlinear_cases.py`](../../validation/tools/make_power_nonlinear_cases.py) |

## 1. Pergunta

Com quantas unidades se detecta uma diferença esperada com a probabilidade desejada (potência)? Que potência uma amostra tem? Quantas unidades dão um intervalo de confiança com a semiamplitude desejada?

## 2. Pressupostos

Erros normais, independentes, de variância constante `σ²` (suposta pelo usuário); efeito esperado conhecido (suposição do usuário); duas amostras com variâncias iguais e `n` por grupo. **A potência vale para o `σ` e o efeito informados**: um `σ` real maior reduz a potência.

## 3. Entradas e opções

Desenho (ANOVA de um fator com as médias esperadas, t de uma amostra, t pareado ou t de duas amostras); `σ`; `α`; bilateral ou unilateral (testes t); objetivo: **potência para um `n`**, **menor `n` para uma potência-alvo** ou **menor `n` para uma semiamplitude do intervalo** (testes t).

## 4. Fórmulas

- **ANOVA:** `λ = n·Σ(μᵢ − μ̄)²/σ²`, `gl₁ = k − 1`, `gl₂ = k(n − 1)`, potência `= P(F′(gl₁, gl₂, λ) > F₁₋α)`.
- **t de uma amostra e pareado:** `δ = d·√n/σ`, `gl = n − 1`.
- **t de duas amostras:** `δ = d·√(n/2)/σ`, `gl = 2n − 2`.
- Bilateral: `P(T′ > t₁₋α/₂) + P(T′ < −t₁₋α/₂)`; unilateral: `P(T′ > t₁₋α)` (efeito tomado em módulo).
- **Precisão:** menor `n` com `t₁₋α/₂(gl)·σ·√(c/n) ≤ h`, `c = 1` (uma amostra, pareado) ou `2` (duas amostras).

## 5. Algoritmo numérico

`F′` não central: `P(F′ > x) = Σⱼ Pois(j; λ/2)·(1 − I_u(gl₁/2 + j, gl₂/2))`, `u = gl₁x/(gl₁x + gl₂)`, soma compensada até `λ/2 + 14√(λ/2) + 60` termos. `T′` não central: algoritmo AS 243 de Lenth (1989); para `t < 0`, `P(T′ ≤ t; δ) = 1 − P(T′ ≤ −t; −δ)`. **Tamanho de amostra:** a potência cresce com `n`; busca por dobramento até atingir a meta e bisseção inteira entre o último `n` que falha e o primeiro que atinge (até 100 000). A curva de potência mostra 40 valores de `n`.

## 6. Saídas

`n` (por grupo na ANOVA e em duas amostras; unidades ou pares nos demais), total de observações, potência, não centralidade, graus de liberdade, valor crítico, semiamplitude do intervalo (testes t) e curva de potência.

## 7. Casos sem resultado válido

`power.invalid_sigma`, `power.invalid_alpha`, `power.invalid_means`, `power.no_effect` (efeito nulo), `power.invalid_difference`, `power.invalid_n`, `power.invalid_target`, `power.invalid_half_width`, `power.precision_needs_t` e `power.unreachable` (meta não atingida até 100 000). Aviso `power.small_n`.

## 8. Exemplo

Diferença esperada 1, `σ = 1,5`, `α = 0,05` bilateral, duas amostras, potência 0,8: **37 por grupo (74 no total)**, potência 0,8076 (igual ao SciPy).

## 9. Interpretação apresentada ao usuário

A calculadora fica na tela inicial, antes dos ensaios, e diz que o resultado depende do `σ` e do efeito supostos e que convém uma margem. Mostra a não centralidade, os graus de liberdade, o valor crítico e uma curva de potência em texto.

## 10. Validação

`power_nonlinear_validation.rs`: **100 pontos de `F′`** (cauda superior) e **120 pontos de `T′`** (função de distribuição) coincidem com o `scipy.stats.ncf` e o `scipy.stats.nct` com erro absoluto máximo < 1e-10; **9 casos** de potência, tamanho de amostra e precisão (ANOVA com 3 e 4 grupos, t de uma amostra, pareado unilateral, duas amostras, precisão) coincidem com a varredura inteira do SciPy (`n` idêntico; potência, não centralidade e valor crítico a 1e-9). O teste do WebAssembly repete os casos e o E2E confere `n = 37`.

**Descoberta:** `scipy.stats.ncf.sf` devolve valores **negativos** com não centralidade exatamente 0 (SciPy 1.18.1); nesse ponto a referência é a F central (`scipy.stats.f.sf`).

## 11. Referências

Cohen, *Statistical Power Analysis for the Behavioral Sciences*; Lenth, R. V. (1989), «Algorithm AS 243: cumulative distribution function of the non-central t distribution», *Applied Statistics* 38; Montgomery, *Design and Analysis of Experiments*, cap. 3.

## Limitações desta versão

- Sem potência por **simulação** (a incerteza de Monte Carlo não é necessária enquanto as fórmulas forem exatas), sem regressão, contrastes nem efeitos de planejamentos de dois níveis, sem desenhos desbalanceados e sem correção para comparações múltiplas.
- O resultado é calculado ao pedir e **não é guardado no projeto**.
