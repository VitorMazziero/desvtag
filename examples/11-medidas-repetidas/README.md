# Exemplo 11 — Medidas repetidas: pareado, Wilcoxon e modelo misto

**Dados sintéticos**, criados para este exemplo: seis unidades experimentais (S1 a S6) medidas **antes** e **depois** de uma condição. A coluna de **unidade experimental** identifica os pares (`app/web/scripts/make-example-v03b.mjs`; aumento por unidade entre 0,8 e 1,5).

Arquivos: [`projeto.enzitag`](projeto.enzitag) e [`ensaios.csv`](ensaios.csv). O projeto guarda o pareado e o modelo misto como cálculos separados; o mais recente abre sem recálculo.

## Como reproduzir

1. Abra `projeto.enzitag`.
2. Em **Resultados → Cálculo guardado**, alterne entre pareado e modelo misto. Para refazer, volte a **Análise**, escolha o método e execute.

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

Atualização da ET22: resultados gravados pelo aplicativo real e WASM por `app/web/scripts/save-example-families.mjs`; as referências independentes acima e os dados sintéticos foram preservados. Alterar entradas marca o registro como desatualizado, sem trocar seus rótulos/unidades.
