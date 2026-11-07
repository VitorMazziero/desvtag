# Modelos mistos e medidas repetidas

**Estado:** v1 validada; extensão v2 implementada, com verificação da ET23 ainda aberta · **Atualizado em:** 2026-11-03

| Campo | Valor |
|---|---|
| ID no registro do motor | `linear_mixed_model` |
| Módulo | C06 `models/mixed` |
| Etapa | [ET17](../planos-execucao/concluidos/et17-modelos-mistos-e-medidas-repetidas.md) |
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

A tela diz que o modelo assume **simetria composta**, mostra `σᵤ²`, `σₑ²` e o ICC, avisa quando a variância entre unidades vai à fronteira e permite guardar/consultar os resultados na etapa Resultados (ET22), sem ajustar novamente ao abrir.

## 10. Validação

`mixed_model_validation.rs::mixed_models_equal_statsmodels_and_the_independent_satterthwaite`: em 3 conjuntos (dois **balanceados**, 8 × 4 e 12 × 3, e um **desbalanceado** com fator entre unidades, fator dentro, covariável e 18 % de dados ausentes) os efeitos fixos, erros-padrão, `σᵤ²`, `σₑ²` e BLUPs coincidem com o `statsmodels.MixedLM` (REML) a 5e-4 relativo (tolerância do otimizador do Python); os graus de liberdade de Satterthwaite coincidem com uma implementação independente em NumPy com a matriz `V` explícita (2e-3 relativo) e, nos balanceados, com os graus de liberdade **exatos** da ANOVA de medidas repetidas (`(a − 1)(s − 1)`), e `σᵤ²` coincide com o estimador da ANOVA. Um conjunto na **fronteira** (estimador da ANOVA negativo) coincide com o `OLS` (estimativas, erros-padrão e gl do resíduo). WebAssembly e E2E repetem o caso balanceado.

## 11. Referências

Pinheiro e Bates, *Mixed-Effects Models in S and S-PLUS*; Satterthwaite (1946); Littell et al., *SAS for Mixed Models*; Kenward e Roger (1997) para a alternativa não adotada.

## Limitações do percurso v1 (preservado para solicitações sem extensão)

- **Só simetria composta** (intercepto aleatório por unidade). Sem AR(1), covariância não estruturada, inclinação aleatória nem vários efeitos aleatórios.
- **Satterthwaite** e não Kenward–Roger; sem testes F de vários graus de liberdade por termo (só testes t por coeficiente).
- A ET22 guarda registros pareados e mistos separados, com revisão histórica, diagnóstico de pares, CSV/XLSX e relatórios HTML/PDF/Word; abrir não recalcula. As variantes metodológicas acima ficam na ET23.

## 12. Extensão v2 — covariância, testes conjuntos, EMM e perfis

A solicitação opcional `advanced` ativa a formulação v2; sem ela o estimador e a proveniência v1 permanecem iguais. Abrir arquivo não recalcula. [DT-0031](../decisoes-tecnicas/dt-0031-covariancias-e-inferencia-das-medidas-repetidas.md), [execução e limites atuais](../../validation/reports/et23/README.md).

### Estruturas e tempo

- **CS:** `V_g = σᵤ² 11′ + σₑ² I`, com os dois componentes identificáveis quando os efeitos fixos não absorvem cada unidade individualmente.
- **AR(1):** `V_g = σᵤ² 11′ + σₑ² R_g(ρ)`, `R_ij = ρ^|t_i−t_j|`, `−1 < ρ < 1`. A precisão residual é calculada pela representação de Markov e o intercepto por atualização de posto um. Lacunas inteiras permanecem lacunas; o motor não cria medidas. A origem temporal pode ser transladada: as diferenças entre índices da mesma unidade devem ser inteiras. Uma única distância não separa três parâmetros; distâncias apenas pares não identificam o sinal de ρ. Esses casos são recusados.
- **UN:** matriz marginal completa por ocasião `Σ = L L′`, com diagonal de L exponencial e variâncias heterogêneas. Cada unidade usa a submatriz das ocasiões observadas, sem imputação. Intercepto aleatório separado seria redundante; componentes de unidade, ICC e BLUP têm causa `notApplicable`. Cada par de ocasiões precisa ter pelo menos duas unidades observadas; o número de parâmetros de covariância precisa ser inferior a n−p. Fronteiras degeneradas ou ausência de informação não recebem inferência inventada.

Unidade×tempo duplicado é erro. Tempos ausentes são excluídos com ID e causa `missingTime`; resposta/fator ausentes seguem os casos completos. O efeito fixo do tempo é uma escolha separada: ausente, inclinação numérica ou fator categórico. Ordem categórica explícita conserva rótulos e mapeia 0, 1, 2…; isso supõe essas distâncias, e a tela explica essa escolha.

### REML e convergência

Minimiza-se `−ℓ_R = 1/2 [log|V| + log|X′V⁻¹X| + r′V⁻¹r + (n−p)log(2π)]`. GLS e o quadrático residual são calculados por bloco (sem subtrair dois termos grandes como y′Wy e β′X′Wy). A escala inicial vem do resíduo OLS no Rust. Variâncias são parametrizadas no log; ρ usa tanh; UN usa Cholesky. BFGS com gradiente central, Armijo, inícios determinísticos e até 400 iterações por início. Só candidatos com norma máxima do gradiente abaixo de `2e−5` são aceitos. A fronteira σᵤ²=0 é estimada separadamente e vence empates até `1e−7` no objetivo. A estrutura pedida não é trocada automaticamente.

O valor completo `remlLogLikelihood` inclui a constante. Diferentes bases/codificações de X podem mudar sua constante aditiva: não comparar esse número entre espaços ou bases de efeitos fixos diferentes. O campo legado `remlProfile` continua perfilado no v1; no v2 o valor de referência é o campo completo da extensão.

### Inferência e hipótese

A covariância dos coeficientes é `(X′V⁻¹X)⁻¹`. Usa-se a inversa da Hessiana observada de `−ℓ_R` nos parâmetros transformados e o gradiente da variância de cada função linear. Para contraste c, `ν = 2(c′Cov(β)c)² / (g′ A g)`. Derivadas centrais com passo `5e−4(1+|θ|)`.

Para cada termo, a hipótese é **todos os seus coeficientes simultaneamente zero**, condicionados aos restantes, na codificação registrada (tratamento ou soma zero). A saída guarda as colunas e o termo; não se chama isso de ANOVA tipo III invariável. O F usa a decomposição espectral da covariância do contraste e os gl de Fai–Cornelius. Para q=1, F=t². Para gl componentes ν_j>2, `E=Σ ν_j/(ν_j−2)` e `ν_F=2E/(E−q)`; gl iguais usam sua média e o caso de q>1 com componente ≤2 usa a aproximação de 2 gl. Hessiana não positiva definida, contraste não estimável ou gl indisponível produz causa explícita `covarianceInformationUnavailable`, sem substituir por n−p. Kenward–Roger não foi implementado.

### Médias e diferenças

A grade usa pesos iguais entre níveis categóricos dos fatores do modelo. Covariáveis ficam nas referências explícitas ou nas médias dos casos usados (Rust). EMM, covariância, diferenças e IC vêm dos vetores do modelo. Cada fator pedido é uma família: Bonferroni ou Holm nos valores-p; **IC simultâneos Bonferroni** em ambos os casos, identificados separadamente. A grade, referências, ajuste e tamanhos das famílias ficam no resultado e no arquivo. Orçamento explícito de 100.000 células: [DT-0032](../decisoes-tecnicas/dt-0032-limite-explicito-da-grade-de-medias-marginais.md).

### Perfis e arquivos

Pontos históricos por unidade, predição populacional e condicional (quando aplicável), resíduo populacional e média por ocasião são calculados no core. O perfil médio usa as condições realmente observadas em cada ocasião e o vetor médio do modelo; **não é EMM**. Seu IC é da média modelada, não intervalo de uma nova observação. n e unidades estão na tabela fonte; ausências não são preenchidas. A interface desenha SVG e exporta números/causas integralmente.

Campos novos são opcionais no esquema 1. `timeText` integra o hash da revisão quando presente; versões anteriores podem recusar arquivos novos que o contenham. Estrutura, tempo, codificação, interações, referências, EMM e ajustes integram assinatura/persistência. A validação estrutural confere dimensões, IDs, covariância e vínculos sem repetir cálculos.

### Referências executadas na ET23

- [Casos REML](../../validation/cases/repeated_covariance/reml.json): cinco conjuntos CS/AR1/UN, positivos/negativos, balanceados e com ausências; NumPy/SciPy com V densa, otimização independente e informação observada.
- [Casos fatoriais](../../validation/cases/repeated_covariance/factorial.json): CS e AR1, três níveis, interação de quatro gl, covariável, desbalanceamento, referência 2,25, EMM igualmente ponderadas e Holm/IC Bonferroni.
- Testes Rust públicos `repeated_covariance_validation.rs` e WASM `repeated.parity.test.ts`. Tolerâncias: objetivo absoluto `2e−7`, coeficientes `2e−5`, covariância `3e−5`, parâmetros transformados `2e−4`, inferência relativa `0,003` (derivadas numéricas independentes). Versões, sementes e inícios estão nos artefatos/geradores. R não foi executado.
- A verificação da aplicação nativa, matriz final de navegadores e fechamento por requisito constam do relatório da etapa; não deduzir conclusão da ET23 só destes casos científicos.

Persistem fora do escopo: inclinações aleatórias, vários fatores aleatórios cruzados e Kenward–Roger.

### Orçamento operacional v2 qualificado no bloco 05 (AU-P05)

Novos ajustes v2 aceitam até 4.096 observações de entrada, 64 colunas fixas/262.144 células e 12 ocasiões na estrutura UN. O construtor verifica a largura antes de materializar produtos. Cada avaliação REML debita `soma(tamanho_do_bloco³)+p³+n*p²` de um orçamento compartilhado de três bilhões de unidades, com aritmética inteira verificada antes da alocação dos blocos. O objetivo escalar preserva a mesma álgebra; a inversa completa só é materializada onde necessária.

Se a estimação não terminar, `mixed.work_budget` impede apresentar busca parcial como ajuste concluído. Se a informação de covariância não terminar depois da estimação, mantém estimativas/covariância fixa/erros-padrão sustentados, mas gl, IC e testes dependentes ficam explicitamente indisponíveis com `mixed.inference_budget`; nenhum substituto n−p. Arquivos históricos maiores continuam sendo abertos sem recalcular ou truncar.

A [referência balanceada de 12 ocasiões](../../validation/cases/repeated_covariance/resource_q12.json) verifica covariância amostral, médias e intervalos t com gl=31 contra solução fechada NumPy/SciPy independente. É uma fronteira operacional, sem SLA nem garantia de RAM global. [DT-0031](../decisoes-tecnicas/dt-0031-covariancias-e-inferencia-das-medidas-repetidas.md) e [plano v0.4 §9.10](../planos-execucao/plano-v0.4.md#910-execução-do-bloco-05--custo-2026-11-04) mantêm os critérios de qualificação e as pendências.
