# distributions / chi-square

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

`cdf`, `sf` e os quantis do qui-quadrado são exatos para df de 0,5 a 1000?

## Dados

Grades de argumentos fixas em `validation/tools/make_distribution_cases.py`, incluindo graus de liberdade fracionários e muito grandes e caudas de até 1e-290 (sintético).

## Referência independente

mpmath 1.4.1 com 60 dígitos (beta e gama incompletas regularizadas e `erfc` do mpmath); quantis por busca de raiz em alta precisão sobre o logaritmo da cauda, com ponto inicial do SciPy 1.18.1. Nenhum código Rust é usado. Valores esperados guardados com 25 algarismos significativos.

## Resultados esperados e tolerâncias

`expected.json`: cada ponto traz o argumento e o valor exato. Erro relativo máximo aceito: ver `tolerances` no arquivo (a justificativa está em `docs/metodos/distribuicoes.md`).

## Diferenças admitidas

Nenhuma além da tolerância relativa.

## Execução

`app/crates/optima-core/tests/distributions_validation.rs` (nativo) e `app/web/src/services/engine/numeric.parity.test.ts` (WebAssembly).
