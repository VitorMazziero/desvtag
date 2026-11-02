# DT-0018 — Seleção e comparação de modelos e resultados em seções com barra lateral (ET11)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Pedido do usuário em 2026-11-01 (organização e seleção de termos como no Protimiza; página de resultados dividida em seções, com a exportação por último); plano da [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Pendências relacionadas | — |
| Substitui / substituída por | Complementa a [DT-0012](dt-0012-superficie-de-resposta.md) (superfície de resposta) e a [DT-0014](dt-0014-exportacao-e-relatorio.md) (exportação) |

## Contexto

Na v0.1 o modelo da superfície era sempre o de segunda ordem completo e a página de resultados era uma única coluna longa (resumo, tabelas, diagnósticos, figuras, otimização, confirmação e exportação em sequência). O usuário pediu (a) escolher os termos do modelo com facilidade, comparar modelos e receber recomendação de remoção; e (b) reduzir a quantidade de informação por tela, com a exportação por último.

## Decisões

### 1. Seleção de modelos é cálculo do núcleo, com recomendação **explicável**

`optima-core::surface::selection` (método `surface_model_selection`, versão 1; operação `surfaceSelectModel`). Métricas comparáveis: `R²`, `R²` ajustado, `R²` predito e `PRESS`, RMSE, valor-p do modelo e da falta de ajuste, **AICc** e **BIC** (convenção do `statsmodels`: verossimilhança gaussiana de variância `SQR/n`). **Não há métrica única**: a interface mostra todas e destaca avisos (falta de ajuste, poucos graus de liberdade, `R²` predito muito abaixo do ajustado).

A **recomendação** é a sequência de **eliminação regressiva com hierarquia** (remove o termo de maior valor-p acima de α que não quebre a hierarquia; nunca o intercepto; para sem candidato, por hierarquia ou por falta de graus de liberdade). Escolhida por ser **reproduzível, determinística e fácil de explicar** («este termo não é significativo e a sua saída não deixa o modelo incoerente»), em vez de uma busca exaustiva ou por AIC, cujo critério de parada é menos transparente. A recomendação **nunca é aplicada sozinha**: o usuário aplica, para em um passo ou volta ao completo.

### 2. O modelo escolhido pertence à análise e fica no projeto

O conjunto de termos escolhido fica em `analysis.designTerms` (campo que já existia na v0.1), que descreve a análise da resposta selecionada; o resultado calculado é gravado no projeto como qualquer outro e reabrir **não recalcula**. Mudar os termos marca o resultado como desatualizado; a otimização usa o modelo escolhido e é marcada como desatualizada junto. Projetos da v0.1 abrem sem migração (`schemaVersion` permanece 1).

**Desvio em relação ao plano:** o plano previa um modelo guardado **por resposta**. Foi implementado um conjunto de termos por análise (uma resposta analisada por vez, como na v0.1); guardar um modelo para cada resposta do projeto fica para a v0.2.x (registrado no plano da ET11).

### 3. Aviso estatístico obrigatório

Os valores-p do modelo final, calculados depois de escolher termos pelos próprios dados, são **otimistas**; a interface diz isso e recomenda confirmar com ensaios novos. A seleção para efeitos de planejamentos de dois níveis fica para a v0.2.x (T09 do plano).

### 4. Resultados em seções, com barra lateral

`SectionedResults` agrupa os blocos marcados com `data-section` (resumo, tabelas, efeitos, modelo, diagnósticos, figuras, otimização, confirmação, **exportação por último**); só a ativa fica visível. A barra é uma `nav` com botões (setas do teclado, foco visível, `aria-current`), vertical em tela larga e horizontal em tela estreita; o aviso de resultado desatualizado aparece em todas as seções. A seção ativa é estado da interface (não do projeto) e vale enquanto a tela de resultados está aberta; **não é lembrada ao recarregar a página** (o plano previa isso; ver os desvios da ET11). Só a preferência «mostrar todas as seções» persiste, no armazenamento local do dispositivo. O **relatório HTML continua completo e em sequência**, sem o componente. A opção «mostrar todas as seções» (preferência do dispositivo) preserva o comportamento da v0.1 e é usada pelos testes legados.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Seleção passo a passo automática (aplicar sem confirmar) | Esconde uma decisão de modelagem do usuário e favorece sobreajuste silencioso |
| Só AIC/BIC para recomendar | Não respeita a hierarquia do modelo e não explica o porquê de cada remoção |
| Abas em vez de barra lateral | Escondem a ordem lógica da análise; a barra mostra todas as seções ao mesmo tempo |
| Paginar o relatório HTML por seção | O relatório precisa ser completo e autocontido (DT-0014) |

## Critérios e evidências

[Especificação do método](../metodos/selecao-de-modelos.md) e validação contra o `statsmodels` (3 casos, sequência idêntica); testes de paridade WebAssembly; E2E `sections-flow` e do painel do modelo (Chromium e Firefox) com axe; [relatório de validação da v0.2](../../validation/reports/v0.2.0/README.md).
