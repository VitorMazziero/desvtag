# Teste de Dunnett (vários tratamentos contra um controle)

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `multiple_comparison_procedures` (procedimento `dunnett`) |
| Módulos | C04 `distributions/dunnett`, C09b `comparisons/procedures` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`procedures.json`](../../validation/cases/multiple_comparison_procedures/procedures.json) (caso `dunnett-desbalanceado`: controle de 8 observações e tratamentos de tamanhos diferentes) |

## 1. Pergunta

Algum tratamento difere de um **controle** predeterminado? A família é de `k − 1` comparações (cada tratamento contra o controle), com probabilidade de ao menos uma falsa detecção ≤ α. Por ter menos comparações que Tukey, é mais potente para esse objetivo.

## 2. Pressupostos

Os da [ANOVA de um fator](anova-um-fator.md#2-pressupostos-e-estruturas-compatíveis): variância comum, independência, normalidade aproximada. O **controle é escolhido antes de ver os dados**; escolhê-lo depois invalida o controle de erro. Tamanhos desiguais são aceitos (resultado exato).

## 3. Entradas e opções

Grupos, nível de controle, `α`, teste bilateral (única opção na v0.2).

## 4. Fórmulas

`Tᵢ = (ȳᵢ − ȳ₀)/(s·√(1/nᵢ + 1/n₀))`, com `s² = QME` e `ν = N − k`. As `Tᵢ` têm correlação `ρᵢⱼ = λᵢλⱼ` com `λᵢ = √(nᵢ/(nᵢ + n₀))`. O valor-p ajustado é `P(max|Tᵢ| > |tᵢ|)` e o intervalo simultâneo é `d ± c·EP` com `c` o quantil superior α da distribuição de `max|T|`.

## 5. Algoritmo numérico

Condicionando em `S = s/σ ~ χ_ν/√ν` e no fator comum `Z₀`: `P(max|T| ≤ c) = E_S ∫ φ(z) ∏ᵢ [Φ((cS − λᵢz)/rᵢ) − Φ((−cS − λᵢz)/rᵢ)] dz`, `rᵢ = √(1 − λᵢ²)`. A integral em `S` usa os nós em cauda da amplitude studentizada; a de `z`, Gauss–Legendre composta. Exato (sem simulação) também para tamanhos desiguais. O quantil crítico sai por Brent.

## 6. Saídas

As do [procedimento de comparação múltipla](procedimentos-comparacao-multipla.md#6-saídas), com `control` (índice do controle) e pares apenas tratamento × controle; sem letras (a família não compara os tratamentos entre si).

## 7. Casos sem resultado válido

Erros de entrada localizados: `comparison.unknown_control` (nível de controle inexistente) e `comparison.no_error_degrees_of_freedom` (sem graus de liberdade do erro).

## 8. Exemplo

Exemplo do teste de interface: controle (6 réplicas), T1 (5) e T2 (4); T1, com média ≈ 12,5 contra ≈ 10,15 do controle, aparece como «diferença detectada» e T2, próximo ao controle, como «diferença não detectada».

## 9. Interpretação apresentada ao usuário

«Cada tratamento foi comparado só com o controle (`controle`); isso não diz nada sobre diferenças entre tratamentos.»

## 10. Validação

`scipy.stats.dunnett` (quase Monte Carlo, ≈ 1e-3) como conferência grosseira e uma **integração dupla própria** da distribuição de `max|T|` (`scipy.integrate.dblquad`, ≈ 1e-9) como referência exata. Tolerâncias registradas no teste `procedures_validation.rs`: valor-p ajustado 2e-7 (absoluto) e limites do intervalo 2e-6 em relação à integração dupla (~1e-9); diferença, erro-padrão e estatística 1e-10 relativo. Caso único: `dunnett-desbalanceado`; os testes unitários da distribuição conferem, entre outros, que com uma só comparação o resultado reduz-se ao *t* bilateral exato (`one_comparison_reduces_to_the_two_sided_t`).

## 11. Referências

- Dunnett, C. W. (1955). A multiple comparison procedure for comparing several treatments with a control. *Journal of the American Statistical Association* 50, 1096–1121.
- Dunnett, C. W. (1964). New tables for multiple comparisons with a control. *Biometrics* 20, 482–491.
