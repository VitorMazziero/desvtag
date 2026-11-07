# Exemplo 08 — Curva de saturação de Monod

**Dados sintéticos**, criados para este exemplo: velocidade de reação em função da concentração de substrato (10 pontos entre 0,3 e 25 g/L). A função verdadeira é `v = 3·S / (2,5 + S)` (Vmax = 3 g/L/h; Km = 2,5 g/L) mais uma perturbação fixa e pequena (`app/web/scripts/make-example-v03.mjs`).

Arquivos: [`projeto.enzitag`](projeto.enzitag) e [`ensaios.csv`](ensaios.csv). O ajuste de Monod, seus pontos originais e a faixa de confiança já estão guardados no projeto.

## Como reproduzir

1. Abra `projeto.enzitag`.
2. O resultado guardado abre sem ajuste. Para refazer, abra **Extras → Curvas de saturação** e use **Ajustar curva** (Monod).

## Resultado esperado

Conferido contra `scipy.optimize.curve_fit` (mínimos quadrados, a partir de `ensaios.csv`; 8 graus de liberdade):

| Parâmetro | Estimativa | Erro-padrão |
|---|---|---|
| Vmax | 3,0022 | 0,0147 |
| Km | 2,4983 | 0,0403 |

`R²` = 0,9997; erro-padrão residual 0,0160. O aplicativo informa também os intervalos de Wald, a correlação entre os parâmetros e a faixa de confiança da curva ([método](../../docs/metodos/ajuste-nao-linear.md)). Sem intervalos por verossimilhança perfilada.

Atualização da ET22: resultados gravados pelo aplicativo real e WASM por `app/web/scripts/save-example-families.mjs`; as referências independentes acima e os dados sintéticos foram preservados. Alterar entradas marca o registro como desatualizado, sem trocar seus rótulos/unidades.
