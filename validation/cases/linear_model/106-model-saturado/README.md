# linear_model / 106-model-saturado

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

2² sem repetição com interação (sem graus de liberdade residuais). O construtor de modelos e o ajuste concordam com a referência independente em coeficientes, erros-padrão, t, valores-p, intervalos, ANOVA, ajustados, resíduos e diagnósticos (e com as observações excluídas e o estado explícito esperado)?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng(20261101)`) por `validation/tools/make_model_cases.py`, arredondados a 2 casas decimais; `input.csv` (4 linhas; célula vazia = ausente).

## Configuração

`config.json`: termos [{"type": "main", "factor": "A"}, {"type": "main", "factor": "B"}, {"type": "interaction", "factors": ["A", "B"]}], intercepto true, codificação `treatment`, confiança 0,95.

## Referência independente

NumPy 2.5.4 (`lstsq`, inversa de XᵀX em dupla precisão) e SciPy 1.18.1 (`stats.t`, `stats.f`); a matriz do modelo é construída em Python pela especificação de `docs/metodos/regressao-linear.md`, sem usar o código Rust.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 mais 1e-12 × escala dos dados (matrizes bem condicionadas; o erro típico medido é muito menor).

## Diferenças admitidas

Nenhuma além da tolerância.

## Execução

`app/crates/optima-core/tests/linear_model_validation.rs` (nativo) e `app/web/src/services/engine/linear.parity.test.ts` (WebAssembly).
