# Ajuste não linear de curvas de saturação (Monod, Michaelis–Menten, Haldane e Hill)

**Estado:** implementado; validado contra o SciPy (`curve_fit`) e por recuperação de parâmetros conhecidos · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `nonlinear_saturation_fit` |
| Módulo | C14 `models/nonlinear` |
| Etapa | [ET18](../planos-execucao/ativos/et18-nao-linear-e-potencia.md) |
| Casos de validação | [`validation/cases/nonlinear_saturation_fit`](../../validation/cases/nonlinear_saturation_fit/nonlinear.json) (4 casos); gerador [`make_power_nonlinear_cases.py`](../../validation/tools/make_power_nonlinear_cases.py) |

## 1. Pergunta

Como a velocidade (ou a taxa específica de crescimento) varia com o substrato `S`, e quais são `μmax` (`Vmax`) e `Ks` (`Km`) com a incerteza associada?

## 2. Pressupostos

`y = f(S; θ) + ε` com `ε` independente, de média zero e variância constante; o modelo escolhido descreve a curva na faixa medida. Substrato `S ≥ 0` (`S > 0` no Hill); parâmetros estritamente positivos por padrão.

## 3. Entradas e opções

Vetores `S` e `y` (mais observações que parâmetros); modelo; valores iniciais (opcionais), limites por parâmetro (opcionais) e α. Sem valores iniciais, o motor usa **vários inícios** determinados a partir dos dados.

## 4. Fórmulas

- **Monod / Michaelis–Menten:** `y = a·S/(b + S)` (`a = μmax` ou `Vmax`; `b = Ks` ou `Km`).
- **Haldane (Andrews):** `y = a·S/(b + S + S²/c)` (`c = Ki`, inibição pelo substrato).
- **Hill:** `y = a·Sⁿ/(bⁿ + Sⁿ)` (`b = K`, `n` = coeficiente de Hill).
Resíduos `r = y − f`; `SQR = Σr²`; `σ̂² = SQR/(n − p)`; `Cov(θ̂) ≈ σ̂²(JᵀJ)⁻¹`; `R² = 1 − SQR/SQT` (centrada).

## 5. Algoritmo numérico

**Levenberg–Marquardt** com Jacobiana analítica: `(JᵀJ + μ·diag(JᵀJ))δ = Jᵀr` por Cholesky; `μ` é dividido por 5 após um passo aceito e multiplicado por 5 após um recusado; projeção nos limites; parada quando a redução relativa da `SQR` é < 1e-13 com passo relativo < 1e-9, ou quando nenhum passo reduz a `SQR`; no máximo 500 iterações (**não convergência explícita**). Inícios: grade de `a ∈ {1; 1,5; 3}·máx(y)` e `b` em quatro valores a partir da mediana e do máximo de `S`; vence a menor `SQR` e o resultado informa em quantos inícios ela foi alcançada. **Intervalos de Wald** com `n − p` graus de liberdade; faixa de confiança da curva pelo método delta, `ŷ ± t·√(gᵀ Cov g)`.

## 6. Saídas

Parâmetros (estimativa, erro-padrão, t, valor-p, intervalo, indicação de limite), `SQR`, `σ̂`, `R²`, matriz de correlação, número de condição da Jacobiana com colunas normalizadas, convergência, iterações, inícios, resíduos e curva de 80 pontos com faixa de confiança.

## 7. Casos sem resultado válido

`nonlinear.invalid_dimensions`, `nonlinear.too_few_observations`, `nonlinear.invalid_values`, `nonlinear.hill_needs_positive_substrate`, `nonlinear.invalid_initial`, `nonlinear.invalid_bounds`, `nonlinear.no_fit`. Avisos de **identificabilidade**: `nonlinear.not_converged`, `nonlinear.parameter_at_bound`, `nonlinear.ill_conditioned` (condição > 1e8 ou informação singular), `nonlinear.highly_correlated` (|corr| > 0,99), `nonlinear.imprecise_parameter` (erro-padrão > 10× a estimativa), `nonlinear.few_degrees_of_freedom` e `nonlinear.single_start_best`.

## 8. Exemplo

Dez concentrações de 0,3 a 25 com `y = 3S/(2,5 + S)` e ruído: o ajuste devolve `μmax ≈ 3` e `Ks ≈ 2,5` com intervalos de confiança.

## 9. Interpretação apresentada ao usuário

A tela mostra a tabela de parâmetros com intervalos, `σ`, `R²`, em quantos inícios o melhor ajuste foi encontrado e o gráfico da curva com a faixa. **Avisos explicam em português por que um parâmetro pode não ser identificável** (por exemplo, faixa de substrato muito abaixo de `Ks`, que deixa `μmax` e `Ks` quase colineares). Os intervalos de Wald são aproximados em amostras pequenas.

## 10. Validação

`power_nonlinear_validation.rs::nonlinear_fits_equal_scipy_curve_fit`: em 4 casos (Monod com ruído baixo e alto, Haldane e Hill, `n = 10` cada) os parâmetros coincidem com o `scipy.optimize.curve_fit` (`trf`, limites positivos, tolerâncias 1e-14) a 1e-5 relativo, os erros-padrão (da `pcov`) a 1e-4, e `SQR`, `σ̂` e `R²` a 1e-7. Testes unitários: curvas **sem ruído** recuperam os parâmetros (Monod, Haldane e Hill) e uma faixa de substrato estreita dispara os avisos de identificabilidade. O teste do WebAssembly repete os 4 casos; o E2E ajusta um Monod e confere a tabela e o gráfico.

## 11. Referências

Bates e Watts, *Nonlinear Regression Analysis and Its Applications*; Seber e Wild, *Nonlinear Regression*; Moré (1978) para o Levenberg–Marquardt; Andrews (1968) para a inibição pelo substrato.

## Limitações desta versão

- **Sem intervalos por verossimilhança perfilada** (só Wald) e **sem os conjuntos NIST StRD** (a referência é o SciPy e a recuperação de parâmetros conhecidos).
- Só os três modelos de saturação; sem Hill com limites informados na interface, sem ajuste global de vários experimentos e sem modelos dinâmicos (equações diferenciais).
- O resultado é calculado ao pedir e **não é guardado no projeto**.
