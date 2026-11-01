# Regressão linear: ajuste, ANOVA, intervalos, predição e diagnósticos

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `linear_model` (versão 1) |
| Operação do protocolo | `modelFitLinear` (`model.fitLinear`) |
| Módulos | C06 `models/{terms,design_matrix,linear,covariance,prediction}`, C07 `inference/{regression_anova,intervals}`, C08 `diagnostics/{residuals,influence}`, C03, C04 |
| Etapa | [ET04](../planos-execucao/ativos/et04-fundamentos-numericos-modelos.md) |
| Casos de validação | [`validation/cases/linear_model/`](../../validation/cases/linear_model/README.md) |

## 1. Pergunta estatística

Como a resposta varia com os fatores segundo um modelo linear (efeitos principais, interações, potências), quanta incerteza há nos coeficientes e o modelo explica mais que o acaso? É a base de ANOVA (ET05), planejamentos (ET06), superfícies (ET07) e otimização (ET08); **não é** exposto como tela própria na v0.1.

## 2. Pressupostos e estruturas compatíveis

Erros independentes, de média zero e variância constante; normalidade para os valores-p e intervalos exatos. O motor **calcula** o ajuste e os diagnósticos; **não afirma** que os pressupostos valem nem que as linhas sejam réplicas independentes. Linhas com resposta ou fator do modelo ausente são **excluídas** (casos completos), listadas com o motivo e avisadas; nunca imputadas.

## 3. Entradas e opções

`dataset` e `spec`: `responseId`, `intercept`, `terms` (`main{factorId}`, `interaction{factorIds}`, `power{factorId, degree ≥ 2}` — fator quantitativo), `coding` (`treatment` | `sum`), `confidenceLevel` (0 < nível < 1).

Colunas: intercepto; efeito principal numérico = valor; categórico com *k* níveis = *k − 1* colunas (tratamento: indicadoras dos níveis exceto o primeiro; soma: indicadoras dos primeiros *k − 1* níveis, com −1 no último nível); interação = produto das colunas dos principais (todas as combinações); potência = `xᵈ`. Níveis: os declarados, ou os presentes em ordem alfabética.

## 4. Fórmulas

Seja `X` a matriz `n × p` (posto `r`), `y` a resposta, `σ̂² = SQE/(n − r)`.

- `β̂` resolve `min ‖y − Xβ‖²`; `Var(β̂) = σ̂² (XᵀX)⁻¹` nas colunas estimáveis.
- Erro-padrão `SE(β̂ⱼ) = σ̂ √[(XᵀX)⁻¹]ⱼⱼ`; `t = β̂ⱼ/SE`; valor-p bilateral com `n − r` g.l.; IC `β̂ⱼ ± t₁₋α/₂ · SE`.
- **ANOVA**, com intercepto: `SQT = Σ(y − ȳ)²`, `SQM = Σ(ŷ − ȳ)²`, `gl_modelo = r − 1`, `gl_total = n − 1`. Sem intercepto (convenção NIST): `SQT = Σy²`, `SQM = Σŷ²`, `gl_modelo = r`, `gl_total = n`. `F = (SQM/gl_m)/(SQE/gl_e)` com valor-p da cauda superior de F. `R² = 1 − SQE/SQT`; `R²aj = 1 − (1 − R²)·gl_total/gl_e`.
- Alavancagem `hᵢ = Σₖ Q[i,k]²` (diagonal da matriz-chapéu). Resíduo padronizado `rᵢ = eᵢ/(σ̂√(1 − hᵢ))`; studentizado externo `tᵢ = rᵢ √((ν − 1)/(ν − rᵢ²))` (ν = gl residuais); Cook `Dᵢ = rᵢ² hᵢ / (r (1 − hᵢ))`.
- **Predição** em `x₀`: `ŷ₀ = x₀ᵀβ̂`; `q = x₀ᵀ(XᵀX)⁻¹x₀`; IC da média `ŷ₀ ± t σ̂ √q`; intervalo de predição `ŷ₀ ± t σ̂ √(1 + q)`. `x₀` precisa estar no espaço-linha de `X` (estimável).

## 5. Algoritmo numérico

QR de Householder com pivoteamento, colunas normalizadas (ver [fundamentos](fundamentos-numericos.md)). `c = Qᵀy`; `R₁₁ b = c₁`; coeficiente original = `b/norma da coluna`. `SQE = Σ cᵢ²` para `i > r`; ajustados `Q[c₁; 0]`, resíduos `Q[0; c₂]`. `(XᵀX)⁻¹ = D⁻¹(R₁₁ᵀR₁₁)⁻¹D⁻¹` por substituição; `x₀ᵀ(XᵀX)⁻¹x₀ = ‖R₁₁⁻ᵀ D⁻¹x₀‖²`, com **verificação de estimabilidade** (as coordenadas das colunas aliasadas devem igualar `R₁₂ᵀ z`). Número de condição: SVD de Jacobi das colunas retidas e normalizadas; aviso a partir de 1e8. Somas por soma compensada.

## 6. Saídas

`LinearFit`: `nObservations`, `nColumns`, `rank`, `dfResidual`, `confidenceLevel`, `coefficients[]` (estimativa, erro-padrão, t, valor-p, IC), `aliased[]`, `anova` (modelo, resíduo, total, F, valor-p, R², R² ajustado, `centered`), `residualVariance`, `residualSd`, `conditionNumber`, `observations[]` (observado, ajustado, resíduo, alavancagem, padronizado, studentizado, Cook), `excluded[]`, `issues[]`, `provenance`. Toda estatística é `defined` ou `undefined` com motivo.

## 7. Casos sem resultado válido

| Situação | Comportamento |
|---|---|
| Modelo/dados inválidos (fator ou resposta inexistente, potência de fator categórico ou grau < 2, interação com fator repetido, termo duplicado, nenhum caso completo) | erro `invalidInput` com `issues` (`request.*`, `model.*`); nada é calculado |
| Entrada não finita, dimensões incoerentes, nível de confiança fora de (0, 1), posto zero | erro com `model.non_finite_input`, `model.invalid_dimensions`, `model.invalid_confidence_level`, `model.zero_rank` |
| Colunas combinação linear das demais (aliasing) | ajuste prossegue no posto `r`; colunas em `aliased`, linha da tabela `undefined(notEstimable)`; aviso `model.rank_deficient` |
| `n = r` (modelo saturado) | estimativas definidas; erros-padrão, t, p, IC, σ, F e R² ajustado `undefined(noResidualDegreesOfFreedom)`; aviso `model.no_residual_df` |
| Resposta constante | R² e F `undefined(constantResponse)`; aviso `model.constant_response` |
| Só intercepto | F e valor-p `undefined(noModelTerms)` |
| Ajuste perfeito (SQE = 0) | erros-padrão 0; t e p `undefined(nonFiniteResult)` |
| Mau condicionamento (≥ 1e8) | aviso `model.ill_conditioned` com o número |
| Observações excluídas | aviso `model.excluded_observations` com a contagem |
| Estouro por escala extrema | erro `model.non_finite_result` |
| Resíduo com `1 − hᵢ ≈ 0` ou σ̂ = 0 | resíduos padronizados, studentizados e Cook `undefined` |

## 8. Exemplo com valores intermediários

`x = 1…5`, `y = 1, 3, 2, 5, 4`: `x̄ = 3`, `ȳ = 3`, `Sxx = 10`, `Sxy = 8`; `b₁ = 0,8`, `b₀ = 0,6`; `SQT = 10`, `SQM = Sxy²/Sxx = 6,4`, `SQE = 3,6`; `σ̂² = 3,6/3 = 1,2`; `SE(b₁) = √(1,2/10) = 0,3464`, `t = 2,309`, `F = t² = 16/3`, valor-p `0,10409` (SciPy), `R² = 0,64`, `R²aj = 0,52`; alavancagem de `x = 1`: `1/5 + 4/10 = 0,6`. Predição em `x = 6`: `ŷ = 5,4`, `q = 1/5 + 9/10 = 1,1`, `SE = √(1,2·1,1) = 1,1489`. Estes valores estão em testes (`prediction_matches_scipy`, `regression_anova`).

## 9. Interpretação apresentada ao usuário

A ET04 não adiciona tela nem texto de interpretação; os fatos (`results:facts.*`) e as explicações curtas dos modelos entram com ANOVA (ET05), efeitos (ET06) e superfícies (ET07).

## 10. Validação

**NIST StRD, regressão linear** (11 conjuntos), contra **mínimos quadrados exatos em racionais** sobre os binários de 64 bits lidos do CSV (`validation/tools/make_regression_cases.py`; a referência exata coincide com os valores certificados em ≥ 13,2 dígitos nos coeficientes). Dígitos corretos (LRE) do motor, mínimo por grandeza, medidos em 2026-11-01 (idênticos no WebAssembly dentro das mesmas exigências):

| Conjunto | Coef. | Erro-padrão | σ | R² | SQ modelo | SQ resíduo | F | cond. | Aviso |
|---|---|---|---|---|---|---|---|---|---|
| Norris | 12,2 | 13,7 | 13,7 | 15,0 | 15,0 | 13,4 | 13,5 | 2,8 | — |
| Pontius | 11,9 | 12,2 | 12,2 | 15,0 | 14,7 | 11,9 | 11,9 | 18 | — |
| NoInt1 | 15,0 | 14,4 | 14,4 | 15,0 | 15,0 | 14,1 | 14,1 | 1 | — |
| NoInt2 | 15,0 | 15,0 | 15,0 | 15,0 | 15,0 | 15,0 | 15,0 | 1 | — |
| Longley | 11,2 | 12,1 | 12,4 | 14,5 | 14,7 | 12,1 | 12,1 | 4,3e4 | — |
| Filip | 7,3 | 7,2 | 8,8 | 11,0 | 11,0 | 8,5 | 8,5 | 5,2e9 | `ill_conditioned` |
| Wampler1 | 9,1 | 15,0* | 15,0* | 15,0 | 15,0 | 15,0* | — | 2,2e3 | — |
| Wampler2 | 13,8 | 15,0* | 15,0* | 15,0 | 14,9 | 15,0* | — | 2,2e3 | — |
| Wampler3 | 9,1 | 13,8 | 13,9 | 15,0 | 14,8 | 13,6 | 13,6 | 2,2e3 | — |
| Wampler4 | 7,7 | 14,6 | 15,0 | 15,0 | 15,0 | 15,0 | 15,0 | 2,2e3 | — |
| Wampler5 | 5,7 | 14,6 | 15,0 | 13,7 | 14,8 | 15,0 | 14,8 | 2,2e3 | — |

\* ajuste perfeito: erro absoluto na escala dos dados (a referência é 0).

Exigência por caso: piso do medido menos 1 dígito, máximo 13 (em `expected.json › tolerances`). **Filip** (polinômio de grau 10, dado clássico de má condição) é resolvido com ~7 dígitos e o motor **emite o aviso de condicionamento**; Wampler5 tem coeficientes com ~5,7 dígitos porque o ruído (da ordem de 10⁷) domina o sinal — o erro é minúsculo relativo ao erro-padrão (≈ 14,6 dígitos nos erros-padrão).

**Construtor de modelos** (6 casos, NumPy/SciPy, tolerância relativa 1e-9 + 1e-12 × escala): fatorial 2×3 com interação em codificação de tratamento (101) e de soma (102, mesmos ajustados e SQ), casos completos com resposta e fator ausentes e desbalanceamento (103), quadrático com categórico (104), aliasing exato (105: posto 3 de 4 colunas) e modelo saturado (106). Estatísticas conferidas: coeficientes, erros-padrão, t, valores-p, IC, F, valor-p, R², R²aj, ajustados, resíduos, alavancagem, padronizados, studentizados e Cook.

**Propriedades** (testes): invariância à ordem das linhas; invariância das estatísticas sem unidade a mudanças de escala (1e-8 a 1e8) e escala correta dos coeficientes; identidade de *leave-one-out* dos resíduos studentizados externos; soma das alavancagens = posto; ida e volta JSON exata.

Windows 11: pendente.

## 11. Referências

- NIST Statistical Reference Datasets, Linear Least Squares Regression: <https://www.itl.nist.gov/div898/strd/lls/lls.shtml>.
- Wampler, R. H. (1970). A report on the accuracy of some widely used least squares computer programs. *JASA* 65, 549–565.
- Longley, J. W. (1967). *JASA* 62, 819–841.
- Golub e Van Loan (2013), cap. 5; Higham (2002), cap. 20.
- Cook, R. D. (1977). Detection of influential observations in linear regression. *Technometrics* 19, 15–18.
- Belsley, Kuh e Welsch (1980). *Regression Diagnostics*.
