# DT-0032 — Limite explícito da grade de médias marginais

Estado: aceita para execução. Data: 2026-11-03. Etapa: ET23.

## Contexto

A grade de médias marginais exige o produto cartesiano dos níveis categóricos envolvidos no modelo. O arquivo pode ter muitos fatores e níveis: a memória e o custo crescem exponencialmente. Usar apenas combinações observadas mudaria a hipótese e os pesos escolhidos na DT-0031.

## Decisão

O motor verifica o tamanho com multiplicação protegida e recusa grades acima de **100.000 células**, com código `mixed.reference_grid_too_large` e mensagem PT/EN que declara o limite. Não troca para pesos observados, não descarta níveis nem fatores e não substitui a estrutura pedida. O usuário pode reduzir explicitamente o modelo ou a grade. Isso é um orçamento computacional, não uma declaração de que a grade maior seria cientificamente inválida. O limite deve ser registrado na especificação e coberto por teste de entrada adversa.

A interface mantém o resultado anterior se o novo pedido falhar. Nenhuma limitação de desempenho é usada para afirmar uma etapa concluída sem os demais requisitos.
