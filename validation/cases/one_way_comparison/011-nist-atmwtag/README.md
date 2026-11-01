# one_way_comparison / 011-nist-atmwtag

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

A ANOVA de um fator do conjunto NIST StRD `AtmWtAg` (2 tratamentos, 48 observações) atinge a exatidão exigida em somas de quadrados, F, R² e desvio residual?

## Dados

Conjunto do NIST Statistical Reference Datasets, Analysis of Variance (https://www.itl.nist.gov/div898/strd/anova/AtmWtAg.dat), de domínio público (governo dos EUA). Valores copiados sem alteração para `input.csv` (coluna `treatment` = `t` + rótulo original).

## Configuração

`config.json`: método `one_way_comparison`, resposta `y`, fator `treatment`, α = 0,05.

## Referência independente

Somas de quadrados **exatas** em aritmética racional (`fractions`) sobre os binários de 64 bits lidos do CSV; raiz quadrada em 60 dígitos (`mpmath` 1.4.1). Gerado por `validation/tools/make_comparison_cases.py`. LRE da referência exata contra o valor certificado do NIST em `referenceVsCertifiedLre`: 10.2 dígitos no pior campo (a diferença vem da conversão decimal→binário).

## Resultados esperados e tolerâncias

`expected.json › exactOnBinary64Inputs` e `tolerances.minLre`; regra: piso do LRE medido menos 1 dígito, no máximo 13.

## Diferenças admitidas

Somente a conversão decimal→binário e a tolerância em dígitos.

## Execução

`app/crates/optima-core/tests/comparison_validation.rs` (nativo) e `app/web/src/services/engine/comparison.parity.test.ts` (WebAssembly).
