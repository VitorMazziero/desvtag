# Médias marginais (mínimos quadrados) e contrastes

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `factorial_anova` (parte do mesmo método) |
| Módulo | C08b `models/factorial_anova` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`factorial.json`](../../validation/cases/factorial_anova/factorial.json) (médias marginais, comparações Tukey–Kramer, Holm e contrastes nos seis casos) |

## 1. Pergunta

Em um experimento desbalanceado ou em blocos, qual é a **média esperada de cada nível** (ou combinação de níveis) depois de ajustar os demais fatores, e quais níveis diferem? E uma hipótese específica, como «a média dos níveis tratados é igual à do controle», é compatível com os dados?

## 2. Pressupostos

Os da [ANOVA multifatorial](anova-multifatorial.md#2-pressupostos). As comparações usam a variância residual do modelo completo; contrastes são decididos **antes** de ver os dados; com vários contrastes, o valor-p ajustado usa Bonferroni sobre os contrastes pedidos.

## 3. Entradas e opções

Conjunto de fatores de cada tabela de médias, ajuste das comparações (`tukey`, `bonferroni`, `holm` ou `none`) e, para contrastes, nome, fatores e **um coeficiente por célula** (na ordem das células da tabela); para comparar grupos de níveis, os coeficientes devem somar zero, o que o aplicativo mostra mas não impõe.

## 4. Fórmulas

**Média marginal** de uma célula `c` (níveis de um subconjunto de fatores): média das predições do modelo sobre **todas** as combinações dos demais fatores, com pesos iguais, `μ̂_c = L β̂`, erro-padrão `√(QMR · L (XᵀX)⁻¹ Lᵀ)`, IC com a `t` do resíduo. **Diferença entre células** `d = μ̂_a − μ̂_b` com erro-padrão pelo mesmo `L`; `t = d/EP`. Ajustes: **Tukey–Kramer** (`q = √2·|t|` na amplitude studentizada), Bonferroni, Holm. **Contraste:** `Σ cᵢ μ̂ᵢ`, erro-padrão `√(QMR · lᵀ(XᵀX)⁻¹l)`, teste `t` bilateral com os `gl` do resíduo, IC de nível `1 − α` e valor-p ajustado por Bonferroni entre os contrastes.

## 5. Algoritmo numérico

`(XᵀX)⁻¹` por fatoração de Cholesky quando o modelo tem posto completo; letras de comparação pelo mesmo algoritmo de [letras](letras-comparacao.md) a partir dos pares sem diferença detectada.

## 6. Saídas

Por tabela: `factors`, `adjustment`, `cells[]` (níveis, estimativa, erro-padrão, IC), `pairs[]` (diferença, erro-padrão, `t`, `gl`, valor-p, valor-p ajustado) e `letters` (quando há veredito em todos os pares). Contrastes: estimativa, erro-padrão, `t`, valor-p, valor-p ajustado, IC.

## 7. Casos sem resultado válido

Célula sem observações → `anova.cells_not_estimable`; fator desconhecido → `anova.marginal_unknown_factor`; sem fatores → `anova.marginal_no_factors`; contraste com número de coeficientes diferente do de níveis → `anova.contrast_length`.

## 8. Exemplo

Com blocos e dados desbalanceados, a média marginal do tratamento **não** é a média simples das observações: cada tratamento é avaliado como se aparecesse em todos os blocos com o mesmo peso; é por isso que as letras podem diferir das obtidas com Tukey sobre as médias brutas.

## 9. Interpretação apresentada ao usuário

Legenda da tabela com o ajuste usado; letras «em comum = diferença não detectada»; contrastes com frase própria («estimativa, IC e valor-p ajustado»).

## 10. Validação

Médias marginais por definição (média das predições sobre os demais fatores) com a covariância dos coeficientes do `statsmodels`; contrastes por `t_test`; Tukey–Kramer por `scipy.stats.studentized_range`; Holm por `multipletests`. Tolerâncias do teste: estimativas e erros-padrão 1e-9 relativo; valores-p 1e-6 relativo (1e-12 absoluto).

## 11. Referências

- Searle, S. R.; Speed, F. M.; Milliken, G. A. (1980). Population marginal means in the linear model. *The American Statistician* 34, 216–221.
- Kramer, C. Y. (1956). Extension of multiple range tests to group means with unequal numbers of replications. *Biometrics* 12, 307–310.
