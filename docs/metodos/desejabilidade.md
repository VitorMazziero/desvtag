# Desejabilidade (Derringer e Suich)

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `desirability_optimization` |
| Módulos | C17 `optimization/{objective,desirability,constraints}` |
| Etapa | [ET08](../planos-execucao/concluidos/et08-otimizacao.md) |
| Casos de validação | [`validation/cases/desirability_optimization/001…006`](../../validation/cases/desirability_optimization/001-um-resposta-maximizar/README.md) |
| Decisão | [DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md) |

## 1. Pergunta

Como combinar objetivos de várias respostas (maximizar, minimizar, atingir alvo, ficar em faixa) em um único número, respeitando limites obrigatórios, para comparar condições experimentais?

## 2. Pressupostos

As respostas são previstas por modelos de segunda ordem ajustados aos dados da própria região ([superfície de resposta](superficie-resposta.md)). A desejabilidade mede a aceitabilidade da **previsão**, não do valor que será de fato observado: a incerteza do modelo é mostrada à parte (intervalos de predição).

## 3. Entradas e opções

Por resposta: objetivo com seus limites e expoente(s), importância (`0 < w ≤ 100`, padrão 1) e, opcionalmente, **limite obrigatório** (valor previsto mínimo e/ou máximo). **Preferências** (objetivo e importância) e **restrições** (limites obrigatórios) são distintas: um limite obrigatório violado elimina o ponto, qualquer que seja a desejabilidade das demais respostas.

## 4. Fórmulas

Individual, `d ∈ [0, 1]`, sobre o valor previsto `y`:

- **Maximizar** `(L, T, s)`: `0` se `y ≤ L`; `((y − L)/(T − L))^s` se `L < y < T`; `1` se `y ≥ T`.
- **Minimizar** `(T, U, s)`: `1` se `y ≤ T`; `((U − y)/(U − T))^s` se `T < y < U`; `0` se `y ≥ U`.
- **Alvo** `(L, T, U, s₁, s₂)`: `((y − L)/(T − L))^s₁` em `[L, T]`; `((U − y)/(U − T))^s₂` em `[T, U]`; `0` fora de `[L, U]`.
- **Faixa** `(L, U)`: `1` se `L ≤ y ≤ U`, `0` fora.

O expoente `s` vale 1 (linear), maior que 1 (exige chegar mais perto do alvo) ou menor que 1 (aceita valores intermediários); `0 < s ≤ 100`. Valores não finitos têm `d = 0`.

**Global:** `D = (Π dᵢ^wᵢ)^(1/Σwᵢ)` (média geométrica ponderada). Qualquer `dᵢ = 0` dá `D = 0` (**desejabilidade zero**): a condição não é aceitável para aquela resposta e nenhuma outra compensa.

## 5. Algoritmo numérico

Quando a diferença entre limites finitos transborda, o motor divide os três valores por dois antes de calcular a razão. Isso preserva a posição relativa no intervalo. A revisão aparece na proveniência como versão 3 da otimização por desejabilidade e versão 5 da análise de mistura. Os valores já gravados conservam a proveniência original.

Cálculo direto em ponto flutuante (potência e logaritmo). A busca do ótimo está em [busca e otimização](busca-otimizacao.md).

## 6. Saídas

Por candidato: desejabilidade individual de cada resposta, global, e a perda em relação ao melhor que cada resposta alcançaria sozinha (compromisso).

A busca arquiva um ajuste por resposta na ordem dos objetivos. A malha usa os coeficientes arquivados e a geometria dos ensaios usados por cada modelo para reproduzir a predição, as restrições e a marcação de extrapolação. Abrir o resultado com esses ajustes permite desenhar a malha sem ajustar novamente as respostas. Nos projetos anteriores, os candidatos continuam disponíveis e a reconstrução da figura exige uma ação explícita com os dados e a configuração do resultado original.

## 7. Casos sem resultado válido

Limites fora de ordem (`L < T < U`), expoente fora de `(0, 100]`, importância inválida ou resposta repetida: recusa com `optimization.invalid_goal`, `invalid_importance`, `duplicate_response`. Se a desejabilidade global é zero em todos os pontos viáveis, o resultado é `OnlyZeroDesirability` (fato `optimization.zero_desirability`), nunca um "ótimo".

## 8. Exemplo

Maximizar `L = 0`, `T = 10`, `s = 1`: `y = 5` → `d = 0,5`; com `s = 2` → `0,25`. Duas respostas `d = (0,25; 1)` com pesos iguais → `D = 0,5`; `d = (0,8; 0,2)` com pesos 3 e 1 → `D = (0,8³ · 0,2)^(1/4) ≈ 0,566`.

## 9. Interpretação apresentada ao usuário

A desejabilidade global é um índice de compromisso, não uma probabilidade. A tela mostra `d` por resposta, as perdas em relação ao melhor individual e os intervalos de predição.

## 10. Validação

Testes unitários com valores calculados à mão (todos os tipos de objetivo, pesos, zero, não finitos) e os seis casos de referência: o motor reproduz, nos pontos de sondagem, as desejabilidades individual e global do código Python independente com tolerância 1e-9. Windows 11: pendente.

## 11. Referências

- Derringer, G.; Suich, R. (1980). Simultaneous optimization of several response variables. *Journal of Quality Technology* 12(4), 214–219.
- Harington, E. C. (1965). The desirability function. *Industrial Quality Control* 21, 494–498.
- Myers, R. H.; Montgomery, D. C.; Anderson-Cook, C. M. (2016). *Response Surface Methodology*, 4ª ed. Wiley, cap. 11.
