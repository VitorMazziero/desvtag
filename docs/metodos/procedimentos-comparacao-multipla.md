# Procedimentos de comparação múltipla: Games–Howell (Welch), Bonferroni e Holm

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `multiple_comparison_procedures` |
| Módulos | C09b `comparisons/procedures`, C04 `distributions/studentized_range` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`validation/cases/multiple_comparison_procedures`](../../validation/cases/multiple_comparison_procedures/procedures.json) (6 casos; gerador [`make_procedure_cases.py`](../../validation/tools/make_procedure_cases.py)) |
| Procedimentos irmãos | [Dunnett](dunnett.md), [Kruskal–Wallis/Dunn](kruskal-wallis-dunn.md); Tukey continua em [tukey.md](tukey.md) |

## 1. Pergunta

Quais grupos diferem quando **as variâncias não são iguais** (Games–Howell) ou quando se quer o procedimento mais simples e transparente de ajuste (Bonferroni, Holm)? Cada procedimento declara a **família** de comparações (todos os pares) e o controle de erro (probabilidade de ao menos uma falsa detecção ≤ α).

## 2. Pressupostos

- **Games–Howell:** observações independentes e aproximadamente normais dentro de cada grupo; **não** exige variâncias iguais nem tamanhos iguais. Indicado quando o teste de Brown–Forsythe da ANOVA aponta variâncias diferentes.
- **Bonferroni e Holm:** os da [ANOVA de um fator](anova-um-fator.md#2-pressupostos-e-estruturas-compatíveis) (variância comum). Holm é uniformemente menos conservador que Bonferroni com o mesmo controle de erro.

## 3. Entradas e opções

Grupos (rótulo e observações), `α` e o procedimento. Mínimo de 2 grupos com ao menos 2 observações cada para Games–Howell e Welch; Bonferroni e Holm exigem graus de liberdade do erro.

## 4. Fórmulas

- **ANOVA de Welch** (teste global do Games–Howell): `F_W` com `gl₁ = k − 1` e `gl₂` de Welch, pesos `wᵢ = nᵢ/sᵢ²`.
- **Games–Howell**, par `(i, j)`: `d = ȳᵢ − ȳⱼ`; `EP = √((sᵢ²/nᵢ + sⱼ²/nⱼ)/2)`; `q = |d|/EP`; `gl` de Welch–Satterthwaite do par; valor-p `P(Q(k, gl) > q)`; IC simultâneo `d ± q_crít·EP`.
- **Bonferroni:** `t = d/(s_p √(1/nᵢ + 1/nⱼ))` com `gl = N − k`; `p_aj = min(1, m·p)` para `m = k(k−1)/2` comparações.
- **Holm:** ordena os `p` crescentes; `p_aj,(r) = max_{s ≤ r} min(1, (m − s + 1)·p_(s))` (monotônico).

## 5. Algoritmo numérico

A cauda da amplitude studentizada usa o núcleo da [amplitude studentizada](amplitude-studentizada.md) com a tabela de `W(w; k)` por interpolação de Chebyshev (ver [DT-0019](../decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md)). Os graus de liberdade fracionários de Welch entram diretamente na integral em `s`.

## 6. Saídas

`procedure`, `alpha`, `globalTest` (nome, estatística, `gl₁`, `gl₂`, valor-p), `groups` (n, média, desvio-padrão, mediana), `pairs` (diferença, erro-padrão, estatística, `gl`, valor-p, valor-p ajustado, IC, `significant`), `letters` (quando todos os pares têm veredito), `issues`.

## 7. Casos sem resultado válido

Entrada recusada com erro localizado: `comparison.too_few_groups` (menos de 2 grupos), `comparison.invalid_alpha`, `comparison.procedure_needs_variance` (Games–Howell e Welch com grupo de uma observação, cuja variância é indefinida) e `comparison.no_error_degrees_of_freedom` (Bonferroni e Holm sem graus de liberdade do erro). Quando algum par fica sem veredito, as letras não são calculadas (aviso `comparison.letters_unavailable`) e o par fica com `significant = null`; nenhum zero ou infinito é usado como substituto.

## 8. Exemplo

Cinco grupos com desvios-padrão de 0,4 a 4,0 (caso `unequal`): a ANOVA clássica e Tukey subestimam a variância dos grupos dispersos; Games–Howell usa `gl` de Welch por par e produz intervalos mais largos nos pares com o grupo de maior dispersão.

## 9. Interpretação apresentada ao usuário

Frase do teste global, tabela de pares (diferença, estatística, valor-p, valor-p ajustado, resultado «diferença detectada / não detectada»), letras de comparação e gráfico de médias com desvio-padrão. Texto: «grupos com letra em comum não tiveram diferença detectada; não indica equivalência».

## 10. Validação

Referências independentes (sem usar o código Rust): ANOVA de Welch pelo `statsmodels.stats.oneway.anova_oneway(use_var="unequal")`; Games–Howell pela fórmula com `scipy.stats.studentized_range`, conferida com `scikit_posthocs`; Bonferroni e Holm pelo `statsmodels multipletests`, conferidos com `posthoc_ttest(pool_sd=True)`. Casos: `games-howell-desiguais`, `bonferroni-empates` e `holm-empates` (mais os de Dunnett e Kruskal–Wallis, nos documentos irmãos). Tolerâncias registradas em `app/crates/optima-core/tests/procedures_validation.rs`: estatística global 1e-9 relativo; valor-p global 1e-7 relativo (1e-12 absoluto); diferença, erro-padrão e estatística do par 1e-10 relativo; valor-p ajustado 1e-6 relativo e 1e-8 absoluto; limites do intervalo 1e-7 relativo e 1e-8 absoluto. Todos os casos passaram nessas tolerâncias. Paridade WebAssembly × nativo em `v02.parity.test.ts`.

## 11. Referências

- Games, P. A.; Howell, J. F. (1976). Pairwise multiple comparison procedures with unequal n's and/or variances. *Journal of Educational Statistics* 1, 113–125.
- Welch, B. L. (1951). On the comparison of several mean values: an alternative approach. *Biometrika* 38, 330–336.
- Holm, S. (1979). A simple sequentially rejective multiple test procedure. *Scandinavian Journal of Statistics* 6, 65–70.
