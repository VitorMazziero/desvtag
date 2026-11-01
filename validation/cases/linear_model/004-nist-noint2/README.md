# linear_model / 004-nist-noint2

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

O ajuste por mínimos quadrados do conjunto NIST StRD `NoInt2` (3 observações, 1 parâmetros, sem intercepto) atinge a exatidão exigida em coeficientes, erros-padrão, desvio residual, R², somas de quadrados e F, e o motor avisa quando o problema é mal condicionado?

## Dados

Conjunto do NIST Statistical Reference Datasets, Linear Least Squares Regression (https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/NoInt2.dat), de domínio público (governo dos EUA). Valores copiados sem alteração para `input.csv`. Os valores certificados estão em `expected.json › certifiedNist`.

## Configuração

`config.json`: método `linear_model`, intercepto `false`, termos [{"type": "main", "factor": "x"}].

## Referência independente

Mínimos quadrados **exatos** em aritmética racional (`fractions`) sobre os números binários de 64 bits lidos do CSV; raízes quadradas em 60 dígitos (`mpmath` 1.4.1). Gerado por `validation/tools/make_regression_cases.py`. O LRE da referência exata contra os valores certificados do NIST está em `referenceVsCertifiedLre` (coeficientes 15.0 dígitos): a diferença vem apenas de os decimais do arquivo não serem exatos em binário.

## Resultados esperados e tolerâncias

`expected.json › exactOnBinary64Inputs` e `tolerances.minLre` (dígitos corretos exigidos: coefficients ≥ 13, stdErrors ≥ 13, sigma ≥ 13, rSquared ≥ 13, ssModel ≥ 13, ssResidual ≥ 13, f ≥ 13). Regra: piso do LRE medido menos 1 dígito, máximo 13. Em ajustes perfeitos (SQE/SQT < 1e-20) SQE, σ e erros-padrão usam erro absoluto na escala dos dados e F é omitido.

## Diferenças admitidas

Somente as de conversão decimal→binário descritas acima e a tolerância em dígitos.

## Execução

`app/crates/optima-core/tests/linear_model_validation.rs` (nativo) e `app/web/src/services/engine/linear.parity.test.ts` (WebAssembly). Valores medidos: [regressão linear](../../../../docs/metodos/regressao-linear.md#10-validação).
