# Box–Behnken

**Estado:** implementado para 3 a 5 fatores; validado numericamente (nativo e WebAssembly); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `response_surface_design` |
| Módulos | C12 `designs/box_behnken` |
| Etapa | [ET07](../planos-execucao/concluidos/et07-superficies-resposta.md) |
| Casos de validação | [`validation/cases/surface_design/designs.json`](../../validation/cases/surface_design/designs.json), [`response_surface/003`](../../validation/cases/response_surface/003-box-behnken-3-fatores/README.md) |
| Decisão | [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) |

## 1. Pergunta

Como estimar um modelo de segunda ordem **sem ensaiar combinações extremas de todos os fatores** (todos os fatores nos níveis alto ou baixo ao mesmo tempo)?

## 2. Pressupostos

Três níveis por fator (`−1`, `0`, `+1`); região cúbica; os vértices do cubo não são ensaiados, de modo que o modelo só vale dentro da região coberta pelos pontos (a extrapolação para os vértices é sinalizada pela alavancagem).

## 3. Entradas e opções

`k` de 3 a 5 fatores com níveis baixo e alto; réplicas e pontos centrais (necessários: sem eles a soma dos quadrados é constante e o modelo quadrático completo não é estimável).

## 4. Fórmulas

Para cada par de fatores `(i < j)`, em ordem lexicográfica, quatro ensaios `(±1, ±1)` nesse par, com os demais fatores no centro (`0`): `2k(k − 1)` ensaios — 12 (`k = 3`), 24 (`k = 4`) e 40 (`k = 5`) — mais os pontos centrais. Cada coluna tem soma zero e cada ensaio tem exatamente dois valores não nulos.

## 5. Algoritmo numérico

Enumeração direta. A construção corresponde à de Box e Behnken (1960) nos três tamanhos suportados. Para 6 e 7 fatores a construção publicada usa blocos incompletos balanceados diferentes e **não está implementada**: o motor recusa com `design.box_behnken_unsupported`.

## 6. Saídas

Como no [composto central](composto-central.md), sem pontos axiais nem `α`.

## 7. Casos sem resultado válido

Número de fatores fora de 3–5 (recusa explícita; a interface desabilita a opção). Aviso `design.surface_needs_center` sem pontos centrais.

## 8. Exemplo

Caso de validação 003: 3 fatores, 3 pontos centrais, 15 ensaios, modelo completo com 5 graus de liberdade do erro e 2 de erro puro.

## 9. Interpretação apresentada ao usuário

A matriz mostra os tipos de ponto; a análise é a de [superfície de resposta](superficie-resposta.md).

## 10. Validação

Contagens (12, 24, 40), pares em ordem, valores e soma das colunas conferidos contra a enumeração independente em Python (casos `surface_design`); a análise do caso 003 contra NumPy/SciPy. Windows 11: pendente.

## 11. Referências

- Box, G. E. P.; Behnken, D. W. (1960). Some new three level designs for the study of quantitative variables. *Technometrics* 2, 455–475.
- Myers, R. H.; Montgomery, D. C.; Anderson-Cook, C. M. (2016). *Response Surface Methodology*, 4ª ed. Wiley.
