# ET17 — Modelos mistos, medidas repetidas e comparações pareadas

| Campo | Valor |
|---|---|
| Estado | **Concluído na v0.3** (2026-11-02) com itens movidos para a v0.4 (§13) |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F08 (comparações pareadas), F09d (mistos), F09e (medidas repetidas) |
| Marco | Prepara M4 |
| Depende de | ET14 |
| Módulos | C14 (`models/{mixed,repeated_measures}.rs`), C03 (otimização numérica, Cholesky), C04 (t e F aproximados), C07, C09 (comparações), C01 (unidade experimental e tempo), U03, U07, U08, U09 |
| Ativado em | 2026-11-02 |
| Concluído em | 2026-11-02 (itens não entregues → v0.4) |

## 1. Objetivo

Analisar dados em que as observações **não são independentes**: amostras pareadas (antes e depois, mesmo lote), **medidas repetidas** da mesma unidade ao longo do tempo e **efeitos aleatórios** (lote, dia, operador), com componentes de variância, graus de liberdade apropriados e comparações coerentes com a estrutura.

## 2. Escopo

**Inclui**

- Comparações pareadas: t pareado e Wilcoxon de postos sinalizados, com intervalo e tamanho de efeito.
- Modelos lineares mistos com intercepto aleatório e, se a DT aprovar, inclinação aleatória; estimação por **REML** (ML para comparar modelos de efeitos fixos); componentes de variância com estado de fronteira (variância zero) explícito; graus de liberdade de **Kenward–Roger** ou **Satterthwaite** (DT).
- Medidas repetidas: unidade acompanhada e tempo como fator; estruturas de covariância composta simétrica, AR(1) e não estruturada; faltantes tratados pelo modelo (sem descartar a unidade inteira).
- Médias marginais e comparações a partir do modelo misto.
- Papel de coluna «unidade experimental» e «tempo» na grade e na importação.

**Não inclui**

- Modelos lineares generalizados mistos (contagens, proporções): posterior.
- Efeitos aleatórios cruzados complexos além do que a DT aprovar.

## 3. Entradas e referências

- [Roteiro F09d e F09e](../roteiro-produto.md#f09--famílias-avançadas-do-catálogo): «Convergência, componentes na fronteira e referência equivalente»; «Dependência respeitada e contrastes apropriados».
- Pinheiro e Bates, *Mixed-Effects Models in S and S-PLUS*; Kenward e Roger (1997); Satterthwaite (1946); Littell et al., *SAS for Mixed Models*.
- Referências independentes: statsmodels `MixedLM` (REML), SciPy (t pareado, Wilcoxon); R `lme4`/`nlme` e `pbkrtest` quando disponíveis no computador de validação.

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Graus de liberdade | Kenward–Roger, Satterthwaite ou ambos? | Satterthwaite (mais simples); Kenward–Roger (melhor em amostras pequenas) | Referência independente disponível, desenhos pequenos de laboratório |
| Otimizador do REML | Que algoritmo e parametrização? | Newton com Cholesky do perfil; EM inicial + Newton | Convergência, fronteira, tempo no WebAssembly |
| Estruturas de covariância | Quais oferecer na v0.3? | Composta simétrica, AR(1), não estruturada | Uso em bioprocessos, identificabilidade com poucos tempos |
| Esquema do projeto | Como marcar unidade e tempo? | Papéis de coluna novos (campo opcional) | Esquema aditivo; importação |

## 5. Tarefas

- [x] **T01** — Especificações [`comparacoes-pareadas.md`](../../metodos/comparacoes-pareadas.md) e [`modelos-mistos.md`](../../metodos/modelos-mistos.md) (a de medidas repetidas está no modelo misto de simetria composta). *DTs separadas não escritas: Satterthwaite e REML por grade + seção áurea estão registrados nas especificações.*
- [x] **T02** — `comparisons/paired.rs`: t pareado, intervalo, `d_z`, Wilcoxon exato e aproximado (zeros e empates); 4 casos SciPy.
- [x] **T03** — `models/mixed.rs`: REML do intercepto aleatório com busca em grade e seção áurea, componentes de variância, fronteira explícita, BLUPs; 4 casos (statsmodels, ANOVA de medidas repetidas, OLS na fronteira). *Não convergência não ocorre: o perfil é unidimensional e a fronteira é tratada.*
- [~] **T04** — Satterthwaite por coeficiente (validado) entregue; **testes F de vários graus de liberdade, médias marginais e comparações a partir do modelo misto pendentes**.
- [ ] **T05** — **Pendente:** AR(1) e covariância não estruturada nas medidas repetidas (só simetria composta foi entregue).
- [x] **T06** — Operações `comparisonPaired` e `modelMixed`, contratos gerados e paridade WebAssembly (pareados).
- [~] **T07** — Interface `RepeatedMeasures` (pareamento por unidade, modelo misto com coluna «Unidade» da grade; PT/EN) entregue; **papéis de coluna «unidade» e «tempo» como tipos próprios, resultados em seções, figuras de perfis e guarda no projeto pendentes** (o resultado é calculado ao pedir).
- [~] **T08** — E2E (`methods-flow.spec.ts`: 6 indivíduos × 2 condições, t pareado, Wilcoxon exato e modelo misto com gl 5) feito; exemplos sintéticos em `examples/` e verificação nativa pendentes.

## 6. Entregas

Comparações pareadas, modelos mistos com componentes de variância e medidas repetidas com estruturas de covariância, validados e com interface própria.

## 7. Critérios de conclusão

1. t pareado e Wilcoxon iguais ao SciPy.
2. Estimativas REML, componentes de variância e testes de efeitos fixos iguais à referência nas tolerâncias registradas, inclusive um caso com componente na fronteira e um caso que não converge (estado explícito, sem resultado silencioso).
3. Medidas repetidas com faltantes usam todas as observações disponíveis; perfis e comparações coerentes com a estrutura escolhida.
4. Paridade WebAssembly × nativo; E2E; axe.

## 8. Verificação

Rust e casos independentes; vitest; E2E nos quatro navegadores; verificação nativa no Windows 10.

## 9. Documentação a criar ou atualizar

Especificações, DTs, mapa de módulos (C14), fichas U03/U07/U08, matriz de cobertura (F08 pareados, F09d, F09e), CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Diferenças entre referências (statsmodels × R) | Registrar a referência e a parametrização de cada caso; tolerâncias justificadas |
| Convergência frágil em amostras pequenas | Estados explícitos de fronteira e não convergência; mensagens que explicam o motivo |
| Usuário escolher modelo errado para medidas repetidas | Recomendação de método (C18) a partir dos papéis de coluna |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3). Etapa não iniciada. |
| 2026-11-02 | **Ativada.** Entregues: comparações pareadas e modelo misto com intercepto aleatório (REML, Satterthwaite), validados contra SciPy, statsmodels, ANOVA de medidas repetidas e OLS; interface e E2E. **Pendentes:** AR(1) e não estruturada, testes F multi-gl, resultados guardados no projeto, exemplos e verificação nativa. |

## 12. Desvios e descobertas

Nenhum até o momento.

## 13. Destino dos itens não entregues (decisão de 2026-11-02)

O usuário fechou a v0.3 e levou as demais pendências para a [v0.4](../plano-v0.4.md) ([decisões aprovadas §18](../../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02)). Itens desta etapa que ficam sem entrega na v0.3:

- Testes F de vários graus de liberdade, médias marginais e comparações; AR(1) e covariância não estruturada; papéis de coluna «unidade» e «tempo»; figuras de perfis → [ET23](../plano-v0.4.md#et23--modelos-mistos-e-medidas-repetidas-avançados).
- Guardar no projeto os resultados e levá-los aos relatórios → [ET22](../plano-v0.4.md#et22--resultados-das-famílias-novas-guardados-no-projeto).
- Exemplo criado na v0.3 (11 — medidas repetidas).
