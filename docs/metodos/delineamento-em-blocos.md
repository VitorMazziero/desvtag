# Delineamento em blocos completos casualizados (DBC)

**Estado:** implementado; validado contra a reimplementação independente; Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `randomized_block_design` |
| Módulo | C06c `designs/randomized_block` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`validation/cases/randomized_block_design`](../../validation/cases/randomized_block_design/rcbd.json) (5 casos; gerador [`make_rcbd_cases.py`](../../validation/tools/make_rcbd_cases.py)) |
| Análise | [ANOVA multifatorial com bloco](anova-multifatorial.md) |

## 1. Pergunta

Como aplicar `t` tratamentos quando as unidades experimentais se agrupam em blocos homogêneos (dias, lotes, operadores, placas) e se quer separar a variação entre blocos da variação do erro?

## 2. Pressupostos

Cada bloco recebe **todos** os tratamentos exatamente uma vez («completo»); a ordem de execução **dentro de cada bloco** é sorteada de forma independente. Efeitos de bloco aditivos. Cada unidade é uma réplica experimental independente dentro do bloco.

## 3. Entradas e opções

`RcbdSpec`: fator de tratamento (id e nome), tratamentos, nome do fator de bloco, blocos, `randomize` e semente (inteiro até 2⁵³ − 1 para ser exato no JavaScript). Mínimo de 2 tratamentos e 2 blocos; no máximo 100 de cada e o limite geral de ensaios dos planejamentos.

## 4. Fórmulas

Para cada bloco `b` (na ordem dos blocos), parte-se da ordem padrão dos tratamentos e aplica-se **Fisher–Yates** com o gerador PCG32 compartilhado, **um único gerador** para a sequência inteira (semente registrada). Sem aleatorização, a ordem é a padrão. O ensaio `r` (contagem global) fica no bloco `b`, posição `p`, com o tratamento sorteado.

## 5. Algoritmo numérico

O mesmo PCG32 e a mesma redução de índices usados no [DIC](delineamento-inteiramente-casualizado.md) e nos planejamentos de dois níveis ([aleatorização](aleatorizacao.md)); resultado idêntico no Windows e no navegador para a mesma semente.

## 6. Saídas

`GeneratedRcbd`: especificação, `total`, `runs[]` (ensaio, bloco e índice, posição no bloco, tratamento e índice), `randomizationAlgorithm` (`pcg32-xsh-rr/fisher-yates` ou `standard-order`), avisos e proveniência.

## 7. Casos sem resultado válido

Erros de entrada localizados: `design.rcbd_empty_name`, `design.rcbd_too_few_levels`, `design.rcbd_too_many_levels`, `design.rcbd_empty_level`, `design.rcbd_duplicate` e `design.too_many_runs`.

## 8. Exemplo

Três tratamentos (A, B, C) em quatro dias (d1–d4), 12 ensaios: cada dia traz A, B e C em ordem própria. A interface grava `B<bloco>-T<tratamento>` como identificador da unidade (por exemplo `B2-T3`), que **não muda** se a semente mudar, e prepara a análise multifatorial com o dia como bloco.

## 9. Interpretação apresentada ao usuário

Contagem «12 ensaios: 3 tratamentos × 4 blocos», tabela da ordem de execução (bloco, posição, tratamento) com CSV/XLSX e a linha «Aleatorização: algoritmo, semente».

## 10. Validação

Reimplementação independente em Python (PCG32 e Fisher–Yates por bloco) em [`make_rcbd_cases.py`](../../validation/tools/make_rcbd_cases.py); o teste `rcbd_validation.rs` exige a **ordem idêntica em cada bloco** nos 5 casos (sementes 42, 0, 7, 12345 e 9223372036854775813; a última excede 2⁵³ e só é representável no motor nativo), e `v02.parity.test.ts` exige a mesma ordem no WebAssembly nos casos com semente representável em JavaScript (um caso sem aleatorização, 7, confere a ordem padrão).

## 11. Referências

- Montgomery, D. C. (2019). *Design and Analysis of Experiments*, 10ª ed., cap. 4. Wiley.
- O'Neill, M. E. (2014). PCG: a family of simple fast space-efficient statistically good algorithms for random number generation. Harvey Mudd College, HMC-CS-2014-0905.
