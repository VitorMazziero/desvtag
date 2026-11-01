# DT-0012 — Superfície de resposta: α, Box–Behnken, matrizes personalizadas, extrapolação, equação e renderização 3D (ET07)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET07-T01 |
| Pendências relacionadas | PD-04 (variantes e algoritmos), PD-05 (rótulo CCD), PD-06 (renderização 3D) |
| Substitui / substituída por | — |

## Contexto

A ET07 entrega planejamentos e modelos de segunda ordem (composto central, Box–Behnken, matriz personalizada), ANOVA, falta de ajuste, equação e superfícies. É preciso fixar as parametrizações de `α`, o alcance do Box–Behnken, como tratar matrizes próprias, como identificar extrapolação, como apresentar a equação e como desenhar a superfície 3D sem trazer cálculo científico para o TypeScript.

## Decisões

### 1. Parametrizações de α

Três opções: **rotacional** (`α = F^(1/4)`), **face centrada** (`α = 1`) e **informado** (`0 < α ≤ 10`), cada uma **circunscrita** (padrão) ou **inscrita** (axiais em ±1 e parte fatorial em ±1/α). A opção rotulada CCD da referência é coberta pelo caso informado, que contém as demais variantes; o aplicativo nomeia pela geometria e mostra `α` e as contagens ([DT-0011, item 9](dt-0011-planejamentos-dois-niveis.md)). A parte fatorial é completa (até 8 fatores) ou fracionária regular por geradores (aviso se a resolução for < V). O teto de `α = 10` evita valores numéricos sem sentido físico.

### 2. Box–Behnken

Construção **por pares de fatores** (`2k(k − 1)` ensaios) para **3, 4 e 5** fatores. Para 6 e 7 a construção publicada exige blocos incompletos balanceados específicos que não foram implementados nem verificados; o motor **recusa** com diagnóstico em vez de aproximar. A verificação independente é a enumeração em Python e as propriedades (dois valores não nulos por ensaio, soma zero por coluna).

### 3. Modelo de segunda ordem e termos

Termos aceitos: principais, quadráticos e interações de **dois** fatores. O modelo completo é o padrão do motor quando a lista de termos é vazia. Não há seleção automática (`stepwise`, eliminação por valor-p): o usuário escolhe os termos; a falta de hierarquia é **avisada**, não corrigida. Cada ajuste vira uma `AnalysisRecord` própria, de modo que modelos alternativos coexistem no projeto. O quadrático é representado no arquivo e na interface por um termo com o mesmo fator repetido (`[A, A]`).

### 4. Matriz personalizada ou importada

Sem módulo `designs/custom.rs`: a análise aceita **qualquer** matriz com fatores quantitativos. A codificação usa os níveis informados ou, na ausência de planejamento gerado, o menor e o maior valor ensaiado por fator. Posto e estimabilidade vêm da QR com pivoteamento do núcleo, que marca os termos não estimáveis. Isso evita duplicar lógica de planejamento onde basta ajustar.

### 5. Equação

As escalas **codificada** e **real** são mostradas juntas. A real vem por **substituição algébrica exata** de `x = (z − c)/h` (sem novo ajuste); um teste exige coincidência com o preditor em todos os ensaios e outro compara com um segundo ajuste feito pelo Python com fatores reais.

### 6. Região experimental e extrapolação

Um ponto é extrapolação se sai do intervalo observado de qualquer fator **ou** se a alavancagem `x₀ᵀ(XᵀX)⁻¹x₀` supera a maior alavancagem dos ensaios (extrapolação oculta). Isso cobre o caso do cubo de um Box–Behnken e dos cantos de um DCCR rotacional, que o intervalo por fator não detecta. A região hachurada aparece nas figuras e é exportada como coluna no CSV da malha.

### 7. Malha e curvas de nível no motor

A malha (`5–101` passos por eixo) e as curvas de nível (*marching squares*, níveis em `1, 2, 5 × 10ⁿ`) são calculadas em Rust (`surfaceGrid`); a interface só escolhe eixos e valores fixados e desenha. O modelo é reajustado a cada pedido (milissegundos para os tamanhos da v0.1); a malha não é guardada no projeto, pois deriva do resultado e dos dados.

### 8. Renderização 3D (PD-06)

Renderizador **próprio em SVG**, com projeção ortogonal, azimute e elevação ajustáveis por controles deslizantes (acessíveis por teclado), quadriláteros ordenados por profundidade (algoritmo do pintor) e a mesma fonte para tela e exportação (SVG/PNG com metadados). Descartados three.js, Plotly e outras bibliotecas: a figura precisa ser vetorial, exportável com proveniência, nos três temas e sem dependência de WebGL; o custo é aceitar 3D estático (sem arrastar com o mouse) e malhas de até 61 × 61. A projeção é geometria de desenho, não cálculo estatístico.

### 9. Fora da ET07

R² de predição (PRESS), ponto estacionário e análise canônica, planejamentos com blocos, composições com restrições (v0.2 ou posterior). O ponto estacionário aparece no exemplo apenas como conferência externa; a busca do ótimo é da ET08.

## Alternativas consideradas

| Alternativa | Motivo de não adotar agora |
|---|---|
| Box–Behnken 6 e 7 fatores por tabela copiada | Sem fonte verificável no ambiente; preferível recusar |
| Eliminação automática de termos | Contraria a regra de não remover termos silenciosamente |
| Extrapolação só por intervalo de cada fator | Deixa passar cantos fora do envelope dos ensaios |
| Equação real por novo ajuste | Pode divergir do preditor por condicionamento; a substituição é exata |
| three.js / Plotly | WebGL, tamanho, exportação vetorial e temas; ver item 8 |
| R² de predição (PRESS) | Utilidade para iniciantes ainda a avaliar; não essencial na v0.1 |

## Critérios e evidências

[Composto central](../metodos/composto-central.md#10-validação), [Box–Behnken](../metodos/box-behnken.md#10-validação), [superfície de resposta](../metodos/superficie-resposta.md#10-validação), [matriz personalizada](../metodos/planejamento-personalizado.md#10-validação), E2E (Chromium e Firefox), axe nos três temas, inspeção visual das figuras.

## Consequências

- A ET08 consome `SurfaceResult.equation` e o modelo ajustado para otimização; nenhum cálculo de ponto ótimo existe ainda.
- Novas matrizes de planejamento (misturas, ótimos) entram em `designs/` sem alterar a análise.
- Qualquer mudança no formato do resultado exige regenerar os tipos e testar a abertura de projetos antigos.
