# Seleção e comparação de modelos de superfície de resposta

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `surface_model_selection` |
| Módulo | C13b `surface/selection` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`validation/cases/surface_model_selection`](../../validation/cases/surface_model_selection/selection.json) (3 casos de composto central de face centrada com 2, 3 e 4 fatores; gerador [`make_selection_cases.py`](../../validation/tools/make_selection_cases.py)) |
| Decisão | [DT-0018](../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md) |

## 1. Pergunta

Quais termos do modelo de segunda ordem sustentam a resposta e quais podem sair sem piorar o ajuste? O aplicativo **mostra** o efeito de cada remoção e **recomenda** uma sequência; a decisão é do usuário.

## 2. Pressupostos

Os da [superfície de resposta](superficie-resposta.md#2-pressupostos). A comparação por AIC/BIC supõe resíduos normais de variância comum (verossimilhança gaussiana) e vale **apenas entre modelos ajustados aos mesmos dados** (mesma resposta, mesmas linhas).

## 3. Entradas e opções

A solicitação da superfície com a lista de termos do modelo atual (vazia = modelo completo de segunda ordem) e `α` da eliminação (padrão 0,05).

## 4. Fórmulas

Com `n` observações, `k` parâmetros (inclui o intercepto) e `SQR` a soma de quadrados do resíduo (convenção do `statsmodels`, verossimilhança gaussiana de variância `SQR/n`):

- `R²`, `R²` ajustado, `RMSE = √(SQR/(n − k))`;
- `PRESS = Σ (eᵢ/(1 − hᵢᵢ))²` e `R²_pred = 1 − PRESS/SQT`;
- `AIC = −2·llf + 2k`, `BIC = −2·llf + k·ln n`, `AICc = AIC + 2k(k+1)/(n − k − 1)`;
- valor-p do modelo (teste `F`) e da **falta de ajuste** (indefinido sem erro puro).

**Eliminação regressiva com hierarquia.** A partir do modelo atual, em cada passo remove o termo de **maior valor-p acima de α** que respeite a hierarquia (um efeito principal só sai se nenhum quadrático ou interação do mesmo fator permanecer). O intercepto nunca sai. Para quando não há candidato (`no_candidate`), quando a hierarquia bloqueia os restantes (`hierarchy`) ou quando sobraria menos de 1 grau de liberdade no resíduo (`no_degrees_of_freedom`).

## 5. Algoritmo numérico

Um ajuste por mínimos quadrados (QR) por modelo da sequência; `PRESS` pelas alavancagens do ajuste; sem reajuste estocástico. A sequência é determinística.

## 6. Saídas

`full` (métricas do modelo completo), `steps[]` (o primeiro é o modelo atual; cada passo traz o termo removido, o valor-p dele no modelo anterior e as métricas do modelo resultante), `stoppedBecause`, `alpha`, `issues`, `provenance`.

## 7. Casos sem resultado válido

Passo que não pode ser ajustado (posto deficiente) → aviso `selection.step_failed` e a sequência termina nele. Métricas sem graus de liberdade ficam **indefinidas** (estado explícito), nunca zero.

## 8. Exemplo

Caso `ccf-3-fatores-quadratico-so-em-x2` (composto central de face centrada, 3 fatores, só o fator 2 com efeito quadrático): a sequência recomendada remove, nesta ordem, as interações x1×x3, o quadrático de x3, x1×x2, o quadrático de x1 e x2×x3, e termina com os três efeitos principais e o quadrático de x2; a referência independente produz exatamente a mesma sequência. No caso `ccf-2-fatores-modelo-completo-significativo` nenhum termo pode sair e a sequência só tem o passo inicial; no de 4 fatores quase linear (`ccf-4-fatores-modelo-quase-linear`) saem oito termos.

## 9. Interpretação apresentada ao usuário

Lista de termos que se liga e desliga (com confirmação quando a remoção quebra a hierarquia), com os termos de valor-p alto marcados como «não significativo»; comparação lado a lado de **completo, atual e recomendado** (parâmetros, graus de liberdade do resíduo, `R²`, `R²` ajustado, `R²` predito, RMSE, valor-p do modelo e da falta de ajuste, `AICc`, `BIC`); a sequência sugerida de remoções, com «usar este modelo» em cada passo; botões «aplicar a recomendação» e «voltar ao modelo completo»; avisos de falta de ajuste, poucos graus de liberdade e sobreajuste (`R²` predito muito abaixo do ajustado). Texto fixo: «valores-p calculados depois de escolher termos pelos próprios dados são otimistas; confirme o modelo final com ensaios novos».

## 10. Validação

`statsmodels` (`OLS`, `aic`, `bic`, `rsquared_adj`, `OLSInfluence.resid_press`), falta de ajuste por definição (erro puro dos pontos centrais) e a eliminação regressiva com hierarquia escrita em Python. Tolerâncias de `selection_validation.rs`: `R²`, `RMSE` 1e-9 relativo; `PRESS` 1e-8; `AIC`, `AICc`, `BIC` 1e-10 relativo e 1e-8 absoluto; valores-p 1e-6 relativo. A **sequência de remoções** coincide termo a termo com a referência nos três casos.

## 11. Referências

- Allen, D. M. (1974). The relationship between variable selection and data augmentation and a method for prediction. *Technometrics* 16, 125–127 (PRESS).
- Burnham, K. P.; Anderson, D. R. (2002). *Model Selection and Multimodel Inference*, 2ª ed. Springer (AIC, AICc, BIC).
- Myers, R. H.; Montgomery, D. C.; Anderson-Cook, C. M. (2016). *Response Surface Methodology*, 4ª ed., cap. 8. Wiley (hierarquia e seleção).
