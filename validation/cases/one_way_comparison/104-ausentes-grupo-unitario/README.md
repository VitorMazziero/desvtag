# one_way_comparison / 104-ausentes-grupo-unitario

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

Respostas ausentes e um grupo com uma observação. ANOVA, tamanhos de efeito, CV, Tukey–Kramer, letras, Brown–Forsythe, boxplots e quantis do gráfico de normalidade concordam com a referência independente?

## Dados

Sintéticos, identificados como tais, em `input.csv` (célula vazia = resposta ausente). Valores escolhidos à mão para produzir o cenário descrito.

## Configuração

`config.json`: fator `treatment`, α = 0.05.

## Referência independente

SciPy 1.18.1 (`f_oneway`, `tukey_hsd`, `levene`, `norm.ppf`), NumPy 2.5.4 (percentis lineares) e letras por cliques maximais (Bron–Kerbosch). Gerado por `validation/tools/make_comparison_cases.py`.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 + 1e-12 × escala; valores-p do Tukey com erro absoluto ≤ 1e-10; letras idênticas.

## Diferenças admitidas

A ordem de atribuição das letras segue as médias decrescentes (a letra `a` é do grupo de maior média); outro software pode usar a ordem inversa, o que não altera a conclusão (a verificação é pelo conjunto de pares que compartilham letra, além da igualdade textual neste caso).

## Execução

`app/crates/optima-core/tests/comparison_validation.rs` (nativo) e `app/web/src/services/engine/comparison.parity.test.ts` (WebAssembly).
