# Comparação de amostras pareadas (t pareado e Wilcoxon)

**Estado:** implementado; validado contra o SciPy · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `paired_comparison` |
| Módulo | C09 `comparisons/paired` |
| Etapa | [ET17](../planos-execucao/concluidos/et17-modelos-mistos-e-medidas-repetidas.md) |
| Casos de validação | [`validation/cases/paired_comparison`](../../validation/cases/paired_comparison/paired.json) (4 casos); gerador [`make_mixed_model_cases.py`](../../validation/tools/make_mixed_model_cases.py) |

## 1. Pergunta

A mesma unidade, medida em duas condições (antes e depois, dois tratamentos aplicados ao mesmo lote), difere entre as condições?

## 2. Pressupostos

Cada unidade contribui com **um** par; as diferenças entre unidades são independentes. O t pareado supõe diferenças aproximadamente normais; o Wilcoxon supõe diferenças simétricas em torno da mediana.

## 3. Entradas e opções

Vetores `primeira` e `segunda` condição (mesma ordem de unidades), no mínimo 2 pares, valores finitos, nível de significância. Na interface os pares são formados pela **unidade experimental**: só entram unidades com exatamente uma observação em cada um dos dois níveis do fator.

## 4. Fórmulas

`d = primeira − segunda`; `t = d̄/(s_d/√n)`, `n − 1` gl; IC `d̄ ± t₁₋α/₂·s_d/√n`; `d_z = d̄/s_d`. **Wilcoxon:** diferenças nulas descartadas (`zero_method = wilcox`), postos de `|d|` com postos médios nos empates, `W₊`, `W₋` e estatística `mín(W₊, W₋)`.

## 5. Algoritmo numérico

Valor-p do t pelo [t de Student](distribuicoes.md). **Wilcoxon exato** (`n ≤ 50`, sem zeros nem empates): distribuição de `W` por contagem das somas de subconjuntos de `1..n`; bilateral `min(1, 2·P(W ≤ w))`. **Aproximação normal** nos demais casos: média `n(n + 1)/4`, variância `n(n + 1)(2n + 1)/24 − Σ(t³ − t)/48`, sem correção de continuidade.

## 6. Saídas

Pares, médias das duas condições, diferença média, desvio-padrão, erro-padrão, t, gl, valor-p, intervalo, `d_z`; Wilcoxon com `n` usado, zeros, `W₊`, `W₋`, estatística, valor-p, método e presença de empates.

## 7. Casos sem resultado válido

`paired.length_mismatch`, `paired.too_few_pairs`, `model.non_finite_input`, `model.invalid_confidence_level`. Diferenças constantes: `t` e intervalo indefinidos (`ConstantResponse`). Todas as diferenças nulas: sem Wilcoxon. Aviso `paired.few_pairs` com menos de 6 pares.

## 8. Exemplo

Cinco pares com diferenças todas positivas e sem empates: `W₋ = 0` e valor-p exato `2/32 = 0,0625`.

## 9. Interpretação apresentada ao usuário

O aplicativo mostra a diferença média **1.ª − 2.ª condição**, o intervalo, o `d_z` e os dois testes, e lista as unidades que ficaram de fora (só uma condição, mais de uma observação por nível, sem unidade). Nada é imputado nem agregado.

## 10. Validação

`mixed_model_validation.rs::paired_tests_equal_scipy`: média, desvio, `t`, gl, valor-p, intervalo, `d_z`, `n` usado, zeros, `W₊`, estatística, método e valor-p do Wilcoxon coincidem com `scipy.stats.ttest_rel` e `scipy.stats.wilcoxon` (método explícito `exact` ou `approx`, sem correção de continuidade) em 4 casos (com e sem zeros e empates, `n` pequeno e `n = 60`), a 1e-9 relativo. O teste do WebAssembly repete os casos; o E2E usa 6 pares e confere o valor-p exato `0,03125`.

## 11. Referências

Wilcoxon (1945); Hollander, Wolfe e Chicken, *Nonparametric Statistical Methods*; Cohen (1988) para o `d_z`.
