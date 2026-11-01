# U07, U08, U09 e U16 — Configuração da comparação, resultados, gráficos e exportação

**Estado:** implementado; Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pastas | `app/web/src/features/{analysis,results}`, `app/web/src/services/{charts,export}` |
| Etapa de criação | ET05 |
| Depende de | U11 (estado), U12 (cliente do motor), U13/E04 (arquivos), U17/U18 (idiomas e temas), C09 |
| Método | [ANOVA de um fator](../metodos/anova-um-fator.md) |

## 1. Responsabilidade

U07: escolher resposta, fator e α do caminho **Comparar tratamentos**. U08: explicação curta (conclusão, evidência, próximo passo, fatos e avisos), tabelas de grupos (com letras), ANOVA e pares. U09: gráficos de médias com incerteza nomeada e letras, boxplot, resíduos × ajustados e QQ, desenhados a partir das séries do motor. U16: CSV, SVG e PNG com proveniência. Nenhum cálculo estatístico no TypeScript.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `features/analysis/AnalysisSetup.tsx`, `buildRequest.ts` | Configuração, operação (`analysisKind`) e assinatura dos dados e opções |
| `features/results/ResultsView.tsx` | Escolhe a visão pelo tipo do resultado |
| `features/results/ComparisonResults.tsx` | Composição, seleção da incerteza, gráficos e exportação |
| `features/results/ComparisonInterpretation.tsx` | Explicação curta, fatos e avisos localizados |
| `features/results/ComparisonTables.tsx`, `comparisonTables.ts` | Tabelas na tela e linhas do CSV |
| `features/results/ChartFigure.tsx`, `ExportButton.tsx` | Figura acessível e botões de SVG/PNG |
| `services/charts/{svg,means,boxplot,scatter}.ts` | Renderizador SVG (tela e exportação, mesma fonte) |
| `services/export/{csv,png,metadata}.ts` | CSV, rasterização, chunk `tEXt` e proveniência |
| `services/storage/*` (`exportFile`) e `src-tauri/src/commands.rs` (`export_file`) | Download no navegador; diálogo nativo e gravação segura no Windows |

## 3. Comportamento

- A barra de incerteza (IC com variância comum, desvio-padrão ou erro-padrão da média) é escolhida pelo usuário e **sempre nomeada** na figura e na exportação; a legenda das letras diz que compartilhar letra não é equivalência.
- A tabela de pares fica aberta abaixo do gráfico; o texto do gráfico é escapado e tem título e descrição acessíveis com identificadores únicos.
- Mudar dados, fator ou α invalida o resultado exibido (assinatura); reabrir um projeto mostra o guardado, sem recálculo.
- Exportações levam método, versões, análise, revisão (e hash), projeto, experimento, configuração e data.

## 4. Erros e limitações

Falha ou cancelamento de exportação é informado em linha (`role="status"`). O PNG depende de `canvas` (navegadores e WebView2); relatório HTML e XLSX entram na ET09. Gráficos 3D não existem ainda (ET07).

## 5. Manutenção

Novo gráfico: função em `services/charts/` com `id` único, teste de SVG bem formado (sem `NaN`), `ChartFigure` e textos PT/EN. Testes: `npm test`, `npm run test:e2e` (inclui axe nos três temas).

## 6. Testes e validação

22 testes unitários (gráficos, CSV, PNG, formatação, assinatura), E2E do percurso e do exemplo 01 em PT e EN (Chromium e Firefox) com download de CSV, SVG e PNG verificados byte a byte, axe em três temas, verificação do IPC nativo em Linux.
