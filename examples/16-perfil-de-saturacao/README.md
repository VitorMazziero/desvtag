# Exemplo 16 — Perfil de saturação com NIST Misra1d

As 14 observações relacionam pressão e volume. A função racional de saturação disponível como Monod tem a mesma forma algébrica do modelo Misra1d quando `Vmax = b₁` e `K = 1/b₂`. Os dados vêm do conjunto público de regressão não linear do NIST. [Fonte e proveniência](../../validation/sources/nist-strd/README.md).

Abra o [projeto com ajuste salvo](projeto.enzitag) para consultar estimativas, intervalos de Wald, perfis de verossimilhança e pontos examinados. Para reproduzir, importe o [CSV](ensaios.csv) como dados existentes e abra **Extras → Curvas de saturação**. Selecione Monod, use Pressão como variável explicativa e Volume como resposta, informe os inícios `450` e `3333,3333333333335` e ative o perfil. Use confiança de 95%.

| Quantidade | Referência aproximada |
|---|---:|
| `Vmax` | 437,369708 |
| `K` | 3308,265021 |
| Soma de quadrados residual | 0,05641929528 |
| IC de perfil de `Vmax` | [430,374615; 444,601736] |
| IC de perfil de `K` | [3246,723099; 3371,902205] |

Estimativas e soma de quadrados provêm da certificação NIST. Os intervalos de perfil usam a referência independente em SciPy e o corte assintótico de razão de verossimilhança. O projeto foi produzido e reaberto pelo aplicativo com o [roteiro de geração](../../app/web/scripts/save-examples-et24.mjs). [Referência numérica e tolerâncias](../../validation/cases/nonlinear_profile/profile.json).
