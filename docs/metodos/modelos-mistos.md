# Modelo linear misto: intercepto aleatório por unidade (medidas repetidas)

**Estado:** implementado; validado contra o `statsmodels` e contra a ANOVA de medidas repetidas · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `linear_mixed_model` |
| Módulo | C06 `models/mixed` |
| Etapa | [ET17](../planos-execucao/ativos/et17-modelos-mistos-e-medidas-repetidas.md) |
| Casos de validação | [`validation/cases/linear_mixed_model`](../../validation/cases/linear_mixed_model/mixed.json) (4 casos); gerador [`make_mixed_model_cases.py`](../../validation/tools/make_mixed_model_cases.py) |

## 1. Pergunta

Os efeitos fixos (tratamento, tempo, covariáveis) quando a **mesma unidade experimental** (indivíduo, lote, dia) é medida várias vezes e as medidas da mesma unidade são correlacionadas?

## 2. Pressupostos

`y = Xβ + Zu + ε`, `u ~ N(0, σᵤ²)` independente entre unidades, `ε ~ N(0, σₑ²)`. Isso implica **simetria composta**: correlação `σᵤ²/(σᵤ² + σₑ²)` (ICC) igual entre quaisquer duas medidas da mesma unidade. Dados ausentes são tratados pelo próprio modelo (unidades com menos medidas continuam contribuindo), sem imputar.

## 3. Entradas e opções

Dados com a **unidade experimental** em toda observação usada; resposta; termos dos efeitos fixos (fatores categóricos e quantitativos, codificação por tratamento); nível de confiança. São necessárias ao menos 2 unidades, ao menos uma com mais de uma medida e mais observações que parâmetros mais um.

## 4. Fórmulas

Com `λ = σᵤ²/σₑ²`, o bloco de uma unidade com `n_g` medidas tem `V₀⁻¹ = I − λ/(1 + n_gλ)·11ᵀ`. `W` é a matriz bloco-diagonal formada por esses blocos. `β̂ = (XᵀWX)⁻¹XᵀWy`, `Var(β̂) = σₑ²(XᵀWX)⁻¹`. REML perfilado: `ℓ_R(λ) = −½[(n − p)·ln σ̂ₑ² + Σ ln(1 + n_gλ) + ln|XᵀWX|]`, `σ̂ₑ² = (yᵀWy − β̂ᵀXᵀWy)/(n − p)`. BLUP: `û_g = λ/(1 + n_gλ)·Σᵢ∈g (yᵢ − xᵢβ̂)`.

## 5. Algoritmo numérico

Somas por grupo (sem formar `Z`); Cholesky para `XᵀWX`. **Maximização de `ℓ_R(λ)`:** grade logarítmica de 241 pontos entre `10⁻⁸` e `10⁸`, mais `λ = 0`, refinamento por seção áurea em torno do melhor ponto. `λ < 10⁻⁸` é a **fronteira**. **Graus de liberdade de Satterthwaite** por coeficiente: `ν = 2·Var(β̂ⱼ)²/(gᵀAg)`, `g` o gradiente de `Var(β̂ⱼ)` em `(σᵤ², σₑ²)` e `A` a inversa da informação observada do REML, ambos por diferenças centrais (passo relativo `10⁻³`). Na fronteira os graus de liberdade são `n − p`.

## 6. Saídas

Coeficientes (estimativa, erro-padrão, gl de Satterthwaite, t, valor-p e intervalo), `σᵤ²`, `σₑ²`, ICC, indicador de fronteira, valor do REML perfilado, efeitos aleatórios previstos por unidade, observações excluídas e avisos.

## 7. Casos sem resultado válido

`mixed.missing_unit`, `mixed.too_few_units`, `mixed.too_few_observations`, `mixed.no_repeated_units` (todas as unidades com uma só medida) e `model.rank_deficient` (efeitos fixos sem posto completo). Avisos `mixed.boundary_variance` (σᵤ² = 0), `mixed.df_fallback` (Satterthwaite não calculável: usa `n − p`) e `mixed.unbalanced` (informativo).

## 8. Exemplo

8 indivíduos medidos em 4 tempos: o coeficiente de cada tempo (em relação ao primeiro) tem `(4 − 1)(8 − 1) = 21` graus de liberdade, os mesmos da ANOVA de medidas repetidas.

## 9. Interpretação apresentada ao usuário

A tela diz que o modelo assume **simetria composta**, mostra `σᵤ²`, `σₑ²` e o ICC, avisa quando a variância entre unidades vai à fronteira e lembra que os resultados não são guardados no projeto.

## 10. Validação

`mixed_model_validation.rs::mixed_models_equal_statsmodels_and_the_independent_satterthwaite`: em 3 conjuntos (dois **balanceados**, 8 × 4 e 12 × 3, e um **desbalanceado** com fator entre unidades, fator dentro, covariável e 18 % de dados ausentes) os efeitos fixos, erros-padrão, `σᵤ²`, `σₑ²` e BLUPs coincidem com o `statsmodels.MixedLM` (REML) a 5e-4 relativo (tolerância do otimizador do Python); os graus de liberdade de Satterthwaite coincidem com uma implementação independente em NumPy com a matriz `V` explícita (2e-3 relativo) e, nos balanceados, com os graus de liberdade **exatos** da ANOVA de medidas repetidas (`(a − 1)(s − 1)`), e `σᵤ²` coincide com o estimador da ANOVA. Um conjunto na **fronteira** (estimador da ANOVA negativo) coincide com o `OLS` (estimativas, erros-padrão e gl do resíduo). WebAssembly e E2E repetem o caso balanceado.

## 11. Referências

Pinheiro e Bates, *Mixed-Effects Models in S and S-PLUS*; Satterthwaite (1946); Littell et al., *SAS for Mixed Models*; Kenward e Roger (1997) para a alternativa não adotada.

## Limitações desta versão

- **Só simetria composta** (intercepto aleatório por unidade). Sem AR(1), covariância não estruturada, inclinação aleatória nem vários efeitos aleatórios.
- **Satterthwaite** e não Kenward–Roger; sem testes F de vários graus de liberdade por termo (só testes t por coeficiente).
- O resultado é **calculado ao pedir e não é guardado no projeto**; não entra nos relatórios.
