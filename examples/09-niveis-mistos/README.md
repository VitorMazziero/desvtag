# Exemplo 09 — Níveis mistos: 3 cepas × 2 pH × 2 repetições

**Dados sintéticos**, criados para este exemplo. Um **fatorial completo de níveis mistos** com dois fatores qualitativos/quantitativos de números de níveis diferentes: **Cepa** (A, B, C) e **pH** (5 e 7), duas repetições (12 ensaios), na ordem do planejamento (sem aleatorização, para que o arquivo seja reproduzível: a cepa varia mais depressa que o pH). A resposta é a **atividade** (`app/web/scripts/make-example-v03b.mjs`: `10 + 2·(índice da cepa) + 1,5·(pH alto) + perturbação fixa`).

Arquivos: [`projeto.enzitag`](projeto.enzitag) (planejamento e dados) e [`ensaios.csv`](ensaios.csv).

## Como reproduzir

1. Abra `projeto.enzitag`.
2. Na análise, use **Analisar planejamento** (ANOVA multifatorial).

## Resultado esperado

Conferido contra o `statsmodels` (`ols` com contrastes soma e `anova_lm`; o planejamento é balanceado, então os tipos I a III coincidem). `R²` = 0,9892.

| Fonte | Soma de quadrados | g.l. | F | Valor-p |
|---|---|---|---|---|
| Cepa | 30,42 | 2 | 217,3 | 2,5e-6 |
| pH | 7,68 | 1 | 109,7 | 4,4e-5 |
| Cepa × pH | 0,50 | 2 | 3,571 | 0,09514 |
| Resíduo | 0,42 | 6 | | |

Cepa e pH têm efeito; a interação não é significativa (α = 0,05). Método: [níveis mistos](../../docs/metodos/niveis-mistos.md) e [ANOVA multifatorial](../../docs/metodos/anova-multifatorial.md).
