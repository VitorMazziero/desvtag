# Kruskal–Wallis e comparações de Dunn (por postos)

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `multiple_comparison_procedures` (procedimento `kruskalDunn`) |
| Módulo | C09b `comparisons/procedures` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`procedures.json`](../../validation/cases/multiple_comparison_procedures/procedures.json) (casos `kruskal-dunn-bonferroni-empates` e `kruskal-dunn-holm-empates`, com empates) |

## 1. Pergunta

As distribuições dos grupos diferem em **posição** quando a normalidade não é razoável, há valores discrepantes ou a resposta é ordinal? Não compara médias: compara postos.

## 2. Pressupostos

Observações independentes; formas de distribuição semelhantes entre os grupos para que a diferença seja interpretada como deslocamento (mediana). Empates são tratados por postos médios, com correção.

## 3. Entradas e opções

Grupos, `α` e o ajuste das comparações de Dunn: `bonferroni` ou `holm`.

## 4. Fórmulas

Postos médios `R̄ᵢ` sobre as `N` observações. `H = [12/(N(N+1)) Σ nᵢR̄ᵢ² − 3(N+1)] / C`, com `C = 1 − Σ(t³ − t)/(N³ − N)` (correção de empates) e valor-p da qui-quadrado com `k − 1` graus de liberdade. **Dunn:** `z = (R̄ᵢ − R̄ⱼ)/√(σ²(1/nᵢ + 1/nⱼ))`, `σ² = N(N+1)/12 − Σ(t³ − t)/(12(N−1))`; valor-p bilateral normal, ajustado por Bonferroni ou Holm.

## 5. Algoritmo numérico

Postos médios por ordenação estável; somas dos empates por contagem; caudas da normal e da qui-quadrado do módulo de [distribuições](distribuicoes.md).

## 6. Saídas

As do [procedimento de comparação múltipla](procedimentos-comparacao-multipla.md#6-saídas) com `meanRank` por grupo e a diferença **de postos** nos pares; teste global `kruskalWallis` (H, `gl`, valor-p). Letras de comparação quando todos os pares têm veredito.

## 7. Casos sem resultado válido

Menos de 2 grupos ou α inválido → erro de entrada (`comparison.too_few_groups`, `comparison.invalid_alpha`). Quando nenhum par tem veredito, as letras não são calculadas (`comparison.letters_unavailable`). Estatísticas indefinidas são estados explícitos, nunca zero ou infinito.

## 8. Exemplo

Quatro condições enzimáticas com valores inteiros repetidos (empates): H e valor-p batem com o `scipy.stats.kruskal`; pares de Dunn com Holm conferem com o `scikit_posthocs`.

## 9. Interpretação apresentada ao usuário

O texto diz que se comparam **postos**, não médias; a coluna «diferença» é de postos médios.

## 10. Validação

`scipy.stats.kruskal` (H e valor-p, com correção de empates) e `scikit_posthocs.posthoc_dunn` (Bonferroni e Holm) como referências independentes; tolerâncias de `procedures_validation.rs`: estatística global 1e-9 e valor-p global 1e-7 relativos; estatística `z` do par 1e-10 relativo; valor-p ajustado 1e-6 relativo e 1e-8 absoluto; postos médios 1e-12.

## 11. Referências

- Kruskal, W. H.; Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. *Journal of the American Statistical Association* 47, 583–621.
- Dunn, O. J. (1964). Multiple comparisons using rank sums. *Technometrics* 6, 241–252.
