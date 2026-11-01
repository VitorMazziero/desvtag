# ANOVA de um fator, tamanhos de efeito e coeficiente de variação

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `one_way_comparison` (versão 1; reúne ANOVA, Tukey, letras e diagnósticos) |
| Operação do protocolo | `comparisonOneWay` (`comparison.oneWay`) |
| Módulos | C07 `inference/one_way_anova`, C08 `diagnostics/assumptions`, C09 `comparisons/{groups,mod}`, C16 `visualization/{boxplot,residuals}`, C18 `interpretation/rules` |
| Etapa | [ET05](../planos-execucao/ativos/et05-anova-tukey-letras.md) |
| Casos de validação | [`validation/cases/one_way_comparison/`](../../validation/cases/one_way_comparison/README.md) |

## 1. Pergunta estatística

As médias de `k` grupos (níveis de um fator) são todas iguais? Delineamento inteiramente casualizado (DIC): cada linha é uma **réplica experimental independente**.

## 2. Pressupostos e estruturas compatíveis

Independência das observações, resíduos de média zero com variância comum e, para valores-p exatos, normalidade. **O motor não verifica independência** (fato `diagnostics.independence_not_assessed` sempre emitido): repetições de medição da mesma unidade experimental não são réplicas. Os demais pressupostos aparecem como evidência (Brown–Forsythe, razão de desvios-padrão, boxplots e gráficos de resíduos), **sem selo automático de validade e sem troca automática de método**. Grupos desbalanceados são aceitos.

## 3. Entradas e opções

`dataset`, `responseId`, `factorId` (cada nível do fator forma um grupo; níveis declarados ou, na falta deles, ordem numérica/alfabética) e `alpha` (0 < α < 1; padrão da interface 0,05). Linhas sem resposta ou sem nível ficam fora e são listadas (`excluded`) com aviso.

## 4. Fórmulas

`N = Σ nᵍ`, `ȳ_g`, `ȳ`: `SQ_entre = Σ nᵍ (ȳ_g − ȳ)²` (`k − 1` gl); `SQ_dentro = Σ_g Σ_i (y − ȳ_g)²` (`N − k` gl); `SQT = SQ_entre + SQ_dentro` (`N − 1` gl); `F = (SQ_entre/(k−1))/QME`, `QME = SQ_dentro/(N − k)`, valor-p = cauda superior de `F(k−1, N−k)`. `η² = SQ_entre/SQT`; `ω² = (SQ_entre − (k−1)·QME)/(SQT + QME)` (pode ser negativo; não é truncado); `CV = 100·√QME/|ȳ|`. IC da média do grupo: `ȳ_g ± t₁₋α/₂(N−k)·√(QME/nᵍ)` (variância comum); barras de desvio-padrão e de erro-padrão da média (`sd/√nᵍ`) são calculadas pelo motor.

## 5. Algoritmo numérico

Todos os dados são **deslocados** pelo primeiro valor antes das somas (subtração exata para dados próximos), e cada soma de quadrados usa a segunda passagem **corrigida** com soma de Neumaier. Isso mantém 15 dígitos até em conjuntos como NIST SmLs09 (valores ≈ 1e12 com diferenças de 0,1), onde a fórmula ingênua perde todos.

## 6. Saídas

`groups[]` (n, média, dp, erro-padrão, IC, barras, boxplot), `grandMean`, `anova` (entre, dentro, total, F, valor-p), `effectSizes` (η², ω², CV), `tukey`, `letters`, `diagnostics` (resíduos, QQ, Brown–Forsythe, razão de desvios-padrão), `excluded`, `issues`, `facts`, `provenance`. Toda estatística é `defined` ou `undefined` com motivo.

## 7. Casos sem resultado válido

| Situação | Comportamento |
|---|---|
| Menos de dois grupos com observações, fator ou resposta inexistente, α inválido | erro `invalidInput` (`comparison.too_few_groups`, `request.*`, `comparison.invalid_alpha`) |
| Nenhum grau de liberdade do erro (`N = k`) | F, valor-p, ω², CV, IC e Tukey `undefined(noResidualDegreesOfFreedom)`; aviso `comparison.no_residual_df`; sem letras |
| Variação nula dentro dos grupos (QME = 0) | F `undefined(constantResponse)`; sem Tukey; aviso `comparison.zero_within_variance` |
| Resposta constante | η², ω² `undefined(constantResponse)` |
| Média geral zero | CV `undefined(zeroMean)` |
| Grupo com uma observação | sem dp/erro-padrão; entra na ANOVA; fato `comparison.singleton_groups` |
| Observações excluídas | aviso e fato `comparison.excluded_observations` |

## 8. Exemplo com valores intermediários

Grupos `(1, 2, 3)`, `(2, 3, 4)`, `(5, 6, 7)`: médias 2, 3, 6; `ȳ = 11/3`; `SQ_dentro = 6` (6 gl); `SQ_entre = 3[(5/3)² + (2/3)² + (7/3)²] = 26` (2 gl); `F = 13/1 = 13`; `η² = 26/32`; `ω² = 24/33`. Testes unitários.

## 9. Interpretação apresentada ao usuário

Conclusão (grupos e observações comparados), evidência (`F(gl₁; gl₂)`, valor-p e pares diferentes pelo Tukey) e próximo passo (ler letras, conferir pares e diagnósticos). Fatos por chave: `anova.significant|not_significant` (o teste F não diz quais grupos diferem; não detectar diferença não prova igualdade), `diagnostics.*`, `comparison.*`.

## 10. Validação

**NIST StRD ANOVA** (SiRstv, SmLs01–09, AtmWtAg) contra somas de quadrados **exatas em racionais** sobre os binários de 64 bits lidos do CSV (`validation/tools/make_comparison_cases.py`). LRE medido em 2026-11-01: **15,0 dígitos** (SQ entre, SQ dentro, F, R² e σ) nos 11 conjuntos, nativo e WebAssembly; exigência registrada: 13.

| Conjunto | Observações × grupos | LRE do valor certificado do NIST contra a referência exata | LRE do motor |
|---|---|---|---|
| SiRstv | 25 × 5 | ≥ 13,1 | 15,0 |
| SmLs01–03 | 189, 1 869, 18 009 × 9 | 15,0 | 15,0 |
| SmLs04–06 | 189, 1 869, 18 009 × 9 | ≈ 10 | 15,0 |
| SmLs07–09 | 189, 1 869, 18 009 × 9 | ≈ 4 | 15,0 |
| AtmWtAg | 48 × 2 | ≥ 10,2 | 15,0 |

Os valores certificados de SmLs04–09 e AtmWtAg supõem decimais exatos; como `0,4` não é exato em binário, **nenhum programa que leia `double` pode igualá-los além de ~4 dígitos em SmLs07–09**. A referência correta é a exata sobre os mesmos binários (o motor a reproduz em 15 dígitos).

Casos aplicados (4: quatro condições, desbalanceado, sete grupos com ponto distante, ausentes com grupo unitário) contra SciPy/NumPy (tolerância relativa 1e-9): F, valor-p, η², ω², CV, IC, boxplot, Brown–Forsythe, resíduos padronizados e quantis do QQ. Windows 11: pendente.

## 11. Referências

- NIST StRD, Analysis of Variance: <https://www.itl.nist.gov/div898/strd/anova/anova.html>; Simon e Lesage (1989), *CSDA* 8, 325–332.
- Brown, M. B.; Forsythe, A. B. (1974). Robust tests for the equality of variances. *JASA* 69, 364–367.
- Olejnik, S.; Algina, J. (2003). Generalized eta and omega squared statistics. *Psychological Methods* 8, 434–447.
- Tukey, J. W. (1977). *Exploratory Data Analysis* (boxplot); Hyndman, R.; Fan, Y. (1996), *The American Statistician* 50, 361–365 (quantis de tipo 7); Blom, G. (1958), *Statistical Estimates and Transformed Beta-Variables* (pontos do QQ).
