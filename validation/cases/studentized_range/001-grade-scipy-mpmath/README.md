# studentized_range / 001-grade-scipy-mpmath

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

`cdf`, `sf` e o quantil superior da amplitude studentizada `Q(k, ν)` concordam com uma referência independente em `k ∈ {2…50}`, `ν ∈ {2…1000, ∞}` e caudas de 0,5 a 1e-5?

## Dados

Grade fixa em `validation/tools/make_studentized_range_cases.py`: 8 valores de `k` × 9 de `ν` × 6 níveis de cauda = 432 pontos (sintéticos).

## Referência independente

SciPy 1.18.1 (`stats.studentized_range`: `isf`, `cdf`, `sf`). A própria referência é conferida pela **definição** com mpmath (integral dupla, 20 dígitos) em 10 pontos (`mpmathChecks`): SciPy − mpmath ≤ 1,4e-14.

## Resultados esperados e tolerâncias

`expected.json`: erro absoluto de `cdf` e `sf` ≤ 2e-12; erro relativo do quantil ≤ 1e-9. Medido: 5,05e-13 e 5,5e-12 ([método](../../../../docs/metodos/amplitude-studentizada.md#10-validação)).

## Diferenças admitidas

Somente a tolerância. A `sf` é `1 − cdf`: abaixo de p ≈ 1e-9 o valor é indicativo.

## Execução

`app/crates/optima-core/tests/studentized_range_validation.rs` (nativo) e `app/web/src/services/engine/comparison.parity.test.ts` (WebAssembly).
