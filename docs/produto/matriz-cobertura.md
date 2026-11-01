# Matriz de cobertura

**Estado:** vigente · **Atualizado em:** 2026-11-01

Fonte única da versão-alvo e da situação de cada item do [catálogo funcional](catalogo-funcional.md) e dos recursos de produto aprovados. Nenhum item está implementado ou validado nesta data.

## Legenda

| Coluna | Valores |
|---|---|
| Versão | `v0.1` (primeira versão) ou `posterior` (destino indicativo no [plano da v0.1](../planos-execucao/plano-v0.1.md#3-fora-da-v01)) |
| Situação | `não iniciado` → `em andamento` → `implementado` → `validado` |
| Evidência | Link para caso em `validation/cases/` ou relatório em `validation/reports/`; obrigatório para `validado` |

`implementado` significa código e testes próprios; `validado` exige comparação com referência independente e verificação nas plataformas declaradas. A situação muda no mesmo pull request que entrega a evidência.

## Planejamentos

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Fatorial completo de dois níveis | F05 | v0.1 | ET06 | não iniciado | — |
| Fatorial fracionário (FFD): geradores, resolução, confundimento | F05 | v0.1 | ET06 | não iniciado | — |
| Plackett–Burman (PB) | F05 | v0.1 | ET06 | não iniciado | — |
| Réplicas, pontos centrais, codificação real/codificada, aleatorização com semente | F05 | v0.1 | ET06 | não iniciado | — |
| DIC — delineamento inteiramente casualizado | F04/F05 | v0.1 | ET05, ET06 | não iniciado | — |
| Composto central rotacional (DCCR/CCRD) | F06 | v0.1 | ET07 | não iniciado | — |
| Composto central de face centrada (FCD) | F06 | v0.1 | ET07 | não iniciado | — |
| Opção rotulada CCD no Protimiza (após conferência) | F06 | v0.1 | ET06, ET07 | não iniciado | — |
| Box–Behnken | F06 | v0.1 | ET07 | não iniciado | — |
| Planejamento personalizado ou matriz importada | F06 | v0.1 | ET07 | não iniciado | — |
| DBC e blocos em planejamentos | F08 | posterior | — | não iniciado | — |
| Níveis mistos | F09a | posterior | — | não iniciado | — |
| Misturas | F09b | posterior | — | não iniciado | — |
| Ótimos e sujeitos a restrições, ampliação sequencial | F09c | posterior | — | não iniciado | — |

## Modelos, inferência e diagnósticos

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Estatística descritiva (contagem, ausentes, média, variância, desvio-padrão, por grupo) | F01 | v0.1 | ET02 | não iniciado | — |
| Distribuições Normal, t, F e qui-quadrado | F03 | v0.1 | ET04 | não iniciado | — |
| Regressão linear: termos, interações, quadráticos, estimabilidade, predição | F03/F06 | v0.1 | ET04, ET07 | não iniciado | — |
| ANOVA da regressão e intervalos | F03 | v0.1 | ET04 | não iniciado | — |
| Resíduos, alavancagem e influência | F03 | v0.1 | ET04 | não iniciado | — |
| ANOVA de um fator, CV e tamanho de efeito | F04 | v0.1 | ET05 | não iniciado | — |
| Diagnóstico de resíduos e homogeneidade na comparação | F04 | v0.1 | ET05 | não iniciado | — |
| Análise de efeitos, curvatura e desenhos saturados | F05 | v0.1 | ET06 | não iniciado | — |
| Falta de ajuste e erro puro | F06 | v0.1 | ET07 | não iniciado | — |
| ANOVA multifatorial geral com interações e médias marginais | F08 | posterior | — | não iniciado | — |
| ANOVA de Welch | F08 | posterior | — | não iniciado | — |
| Modelos mistos | F09d | posterior | — | não iniciado | — |
| Pares e medidas repetidas | F08/F09e | posterior | — | não iniciado | — |
| Ajuste não linear (Monod) | F09f | posterior | — | não iniciado | — |
| Potência e planejamento da precisão | F09g | posterior | — | não iniciado | — |

## Comparações

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Distribuição da amplitude studentizada | F04 | v0.1 | ET05 | não iniciado | — |
| Tukey e Tukey–Kramer | F04 | v0.1 | ET05 | não iniciado | — |
| Letras de comparação no gráfico | F04 | v0.1 | ET05 | não iniciado | — |
| Dunnett | F08 | posterior | — | não iniciado | — |
| Games–Howell | F08 | posterior | — | não iniciado | — |
| Bonferroni e Holm | F08 | posterior | — | não iniciado | — |
| Contrastes planejados | F08 | posterior | — | não iniciado | — |
| Kruskal–Wallis e Dunn | F08 | posterior | — | não iniciado | — |

## Otimização

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Objetivos maximizar, minimizar, alvo e faixa | F07 | v0.1 | ET08 | não iniciado | — |
| Restrições obrigatórias × preferências, pesos | F07 | v0.1 | ET08 | não iniciado | — |
| Desejabilidade individual e global | F07 | v0.1 | ET08 | não iniciado | — |
| Vários candidatos, previsões e incerteza | F07 | v0.1 | ET08 | não iniciado | — |
| Proposta de ensaios de confirmação | F07 | v0.1 | ET08 | não iniciado | — |

## Gráficos

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Médias com incerteza nomeada e letras | F04 | v0.1 | ET05 | não iniciado | — |
| Boxplot | F04 | v0.1 | ET05 | não iniciado | — |
| Resíduos e diagnóstico | F04 | v0.1 | ET05 | não iniciado | — |
| Efeitos principais e interações | F05 | v0.1 | ET06 | não iniciado | — |
| Pareto | F05 | v0.1 | ET06 | não iniciado | — |
| Observado × predito | F05 | v0.1 | ET06 | não iniciado | — |
| Superfície 3D e contorno | F06 | v0.1 | ET07 | não iniciado | — |
| Desejabilidade e soluções de otimização | F07 | v0.1 | ET08 | não iniciado | — |

## Produto e plataforma

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Windows 11 de 64 bits (Tauri) | F00–F01 | v0.1 | ET01, ET02 | não iniciado | — |
| Chrome, Edge e Firefox atuais (WASM) | F00–F01 | v0.1 | ET01, ET02 | não iniciado | — |
| Português e inglês | F01 | v0.1 | ET02 | não iniciado | — |
| Temas Soft Light, Modern Dark e Professional | F01 | v0.1 | ET02 | não iniciado | — |
| Tela inicial, três entradas e fluxo guiado | F01 | v0.1 | ET02 | não iniciado | — |
| Explicações curtas (conclusão, evidência, próximo passo) | F01–F07 | v0.1 | ET02–ET08 | não iniciado | — |
| Digitação e colagem do Excel | F01/F02 | v0.1 | ET02, ET03 | não iniciado | — |
| Importação CSV e XLSX com prévia | F02 | v0.1 | ET03 | não iniciado | — |
| Importação de matrizes externas | F02 | v0.1 | ET03 | não iniciado | — |
| Projeto `.enzitag`, vários experimentos, revisões | F02 | v0.1 | ET03 | não iniciado | — |
| Recuperação automática e checkpoints | F02 | v0.1 | ET03 | não iniciado | — |
| Figuras SVG e PNG | F04/F10 | v0.1 | ET05, ET09 | não iniciado | — |
| Tabelas CSV e XLSX | F04/F10 | v0.1 | ET05, ET09 | não iniciado | — |
| Relatório HTML | F10 | v0.1 | ET09 | não iniciado | — |
| Personalização gráfica essencial | F10 | v0.1 | ET09 | não iniciado | — |
| Figuras e relatórios em PDF; personalização completa | F10 | posterior | — | não iniciado | — |
| DOCX | F14 | posterior | — | não iniciado | — |
| Publicação web e instalador Windows | F13 | v0.1 | ET10 | não iniciado | — |
| Atualizador assinado, canal experimental | F13 | v0.1 | ET10 | não iniciado | — |
| Canal estável | F13 | posterior | — | não iniciado | — |
| Google Drive opcional e compartilhamento por leitura/cópia | F11 | posterior | — | não iniciado | — |
| Comentários e colaboração simultânea | F14 | posterior | — | não iniciado | — |
| Windows 10, Safari e domínio próprio | F14 | posterior | — | não iniciado | — |
| Funções do Protimiza não visíveis nas capturas | F05–F09 | a definir após inventário | ET06 | não iniciado | — |
