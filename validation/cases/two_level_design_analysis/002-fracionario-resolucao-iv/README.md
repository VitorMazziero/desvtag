# two_level_design_analysis / 002-fracionario-resolucao-iv

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

Fracionário 2^(4−1) IV com duas réplicas: principais e três interações (uma delas confundida com outra do modelo). Coeficientes e efeitos (2 × coeficiente), erros-padrão, t, valores-p, intervalos, ANOVA, falta de ajuste, curvatura, método de Lenth e médias dos gráficos concordam com a referência independente?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng(12)`) a partir de efeitos verdadeiros conhecidos mais ruído normal, arredondados a 3 casas; `input.csv` tem os valores **reais** dos fatores (níveis `F_i`: baixo = 10·i, alto = 10·i + 8) e a resposta `y`, na ordem de execução aleatória.

## Configuração

`config.json`: planejamento (`spec`), termos do modelo ["A", "B", "C", "D", "AB", "AC", "CD"], α = 0.05, curvatura incluída.

## Referência independente

NumPy 2.5.4 (`lstsq`, inversa de XᵀX), SciPy 1.18.1 (`stats.t`, `stats.f`); Lenth e falta de ajuste implementados em Python pela definição ([método](../../../../docs/metodos/fatorial-dois-niveis.md)). O teste de curvatura por termo indicador é conferido contra a fórmula clássica (Montgomery) quando o modelo é saturado nos pontos fatoriais.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 + 1e-12 × escala.

## Diferenças admitidas

Nenhuma além da tolerância.

## Execução

`app/crates/optima-core/tests/design_validation.rs` (nativo) e `app/web/src/services/engine/design.parity.test.ts` (WebAssembly).
