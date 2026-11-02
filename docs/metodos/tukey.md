# Comparações de Tukey (HSD) e Tukey–Kramer

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `one_way_comparison` (parte do mesmo método) |
| Módulos | C09 `comparisons/tukey`, C04 `distributions/studentized_range` |
| Etapa | [ET05](../planos-execucao/concluidos/et05-anova-tukey-letras.md) |
| Casos de validação | [`validation/cases/one_way_comparison/101…104`](../../validation/cases/one_way_comparison/README.md) |

## 1. Pergunta

Quais pares de médias diferem, mantendo a probabilidade de **ao menos uma falsa detecção** em toda a família de comparações no nível α?

## 2. Pressupostos

Os da [ANOVA de um fator](anova-um-fator.md#2-pressupostos-e-estruturas-compatíveis). A **família é explícita**: todos os `k(k − 1)/2` pares de médias de um fator, com α e confiança simultânea `1 − α` informados no resultado. Tamanhos desiguais usam a extensão de Kramer (conservadora quando as variâncias são iguais).

## 3. Entradas e opções

Médias, tamanhos, `QME`, `gl` do erro e `α` (os da ANOVA). Sem outras opções na v0.1.

## 4. Fórmulas

Para o par `(i, j)`: `d = ȳᵢ − ȳⱼ`; `EP = √(QME/2 · (1/nᵢ + 1/nⱼ))`; `q = |d|/EP`; valor-p ajustado `P(Q(k, gl) > q)`; intervalo simultâneo `d ± q_crít·EP` com `P(Q(k, gl) > q_crít) = α`. Diferença detectada se `p_ajustado < α` (equivale a o intervalo excluir 0). Variante: `tukey` se todos os `nᵍ` são iguais; `tukeyKramer` caso contrário.

## 5. Algoritmo numérico

Núcleo da [amplitude studentizada](amplitude-studentizada.md) criado uma vez por análise; `q_crít` por Brent no logaritmo da cauda; um `sf` por par. **Desde a v0.2** a função `W(w; k)` (distribuição da amplitude de `k` normais), que depende só de `k`, é **tabulada uma vez por `k`** por interpolação de Chebyshev em trechos, e cada valor-p passa a custar ~400 avaliações polinomiais em vez de ~400 quadraturas ([DT-0019](../decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md)); 100 grupos × 30 repetições caíram de ≈ 30 s para ≈ 126 ms ([limites](../arquitetura/limites-operacionais.md)).

## 6. Saídas

`variant`, `alpha`, `groups`, `comparisonsCount`, `dfError`, `criticalValue`, `comparisons[]` (grupo A e B por índice, diferença, erro-padrão, `q`, valor-p ajustado, IC simultâneo, `significant`).

## 7. Casos sem resultado válido

Sem graus de liberdade do erro, `QME = 0`, `k < 2` ou α inválido → `tukey` ausente (avisos `comparison.no_residual_df` ou `comparison.zero_within_variance`) e, portanto, sem letras. Um par sem `p` finito fica com `significant = null`.

## 8. Exemplo

Quatro condições, 5 réplicas (caso 101): `QME` e `gl = 16`; `q_crít(0,05; 4; 16) ≈ 4,05`; pH 7 − controle = 5,86 U/mL diferença detectada; pH 5 − pH 9 não detectada (letra `b` em comum).

## 9. Interpretação apresentada ao usuário

Fato `tukey.pairs_different` (contagem, total, α, família de todos os pares) e `tukey.kramer` quando os tamanhos diferem. A tabela de pares fica sempre acessível sob o gráfico de médias.

## 10. Validação

Quatro casos aplicados contra o SciPy: `stats.tukey_hsd` (grupos com ≥ 2 observações; p ajustados e intervalos simultâneos conferidos com 1e-9) e a fórmula explícita com `studentized_range` do SciPy (caso com grupo unitário). Medido: p ajustado dentro de 1e-10 (tolerância) em todos os pares; intervalos e diferenças em 1e-9 relativo. Windows 11: pendente.

## 11. Referências

- Tukey, J. W. (1953). The problem of multiple comparisons (relatório não publicado).
- Kramer, C. Y. (1956). Extension of multiple range tests to group means with unequal numbers of replications. *Biometrics* 12, 307–310.
- Hayter, A. J. (1984). A proof of the conjecture that the Tukey–Kramer multiple comparisons procedure is conservative. *Annals of Statistics* 12, 61–75.
