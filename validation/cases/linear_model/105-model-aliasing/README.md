# linear_model / 105-model-aliasing

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

Coluna x3 = x1 + x2 (posto deficiente). O construtor de modelos e o ajuste concordam com a referência independente em coeficientes, erros-padrão, t, valores-p, intervalos, ANOVA, ajustados, resíduos e diagnósticos (e com as observações excluídas e o estado explícito esperado)?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng(20261101)`) por `validation/tools/make_model_cases.py`, arredondados a 2 casas decimais; `input.csv` (12 linhas; célula vazia = ausente).

## Configuração

`config.json`: termos [{"type": "main", "factor": "x1"}, {"type": "main", "factor": "x2"}, {"type": "main", "factor": "x3"}], intercepto true, codificação `treatment`, confiança 0,95.

## Referência independente

NumPy 2.5.4 (`lstsq`, inversa de XᵀX em dupla precisão) e SciPy 1.18.1 (`stats.t`, `stats.f`); a matriz do modelo é construída em Python pela especificação de `docs/metodos/regressao-linear.md`, sem usar o código Rust.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 mais 1e-12 × escala dos dados (matrizes bem condicionadas; o erro típico medido é muito menor).

## Diferenças admitidas

Nenhuma além da tolerância. Em modelos com aliasing só as quantidades invariantes (ajustados, resíduos, SQ, R², F, posto) são comparadas; qual coluna é declarada aliasada é uma convenção do pivoteamento.

## Execução

`app/crates/optima-core/tests/linear_model_validation.rs` (nativo) e `app/web/src/services/engine/linear.parity.test.ts` (WebAssembly).
