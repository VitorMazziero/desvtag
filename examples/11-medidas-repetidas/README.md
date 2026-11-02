# Exemplo 11 — Medidas repetidas: pareado, Wilcoxon e modelo misto

**Dados sintéticos**, criados para este exemplo: seis unidades experimentais (S1 a S6) medidas **antes** e **depois** de uma condição. A coluna de **unidade experimental** identifica os pares (`app/web/scripts/make-example-v03b.mjs`; aumento por unidade entre 0,8 e 1,5).

Arquivos: [`projeto.enzitag`](projeto.enzitag) e [`ensaios.csv`](ensaios.csv).

## Como reproduzir

1. Abra `projeto.enzitag`.
2. Na análise, abra **Medidas repetidas, pareados e modelos mistos**; use **Comparar pares** e **Ajustar modelo misto**.

## Resultado esperado

Conferido contra o SciPy (`ttest_rel`, `wilcoxon`) e o `statsmodels` (`MixedLM`, REML, intercepto aleatório por unidade).

| Resultado | Valor |
|---|---|
| Diferença média (Antes − Depois) | −1,15 |
| t pareado (5 g.l.) | −10,29; p = 0,0001493 |
| IC de 95% da diferença | de −1,4374 a −0,8626 |
| `d_z` | −4,199 |
| Wilcoxon (exato, 6 pares) | p = 0,03125 |
| Modelo misto: efeito de «Depois» | 1,150 (erro-padrão 0,112) |
| Variância entre unidades | 0,9247 |
| Variância residual | 0,0375 |
| ICC | 0,961 |

Com dados balanceados, os graus de liberdade do efeito da condição (Satterthwaite) são 5, e o teste do modelo misto coincide com o t pareado. Métodos: [comparações pareadas](../../docs/metodos/comparacoes-pareadas.md) e [modelos mistos](../../docs/metodos/modelos-mistos.md) (só intercepto aleatório).
