# U07, U08, U09 e U16 — Configuração da comparação, resultados, gráficos e exportação

**Estado:** implementado (exportação completa da v0.1 na ET09); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pastas | `app/web/src/features/{analysis,results}`, `app/web/src/services/{charts,export}` |
| Etapa de criação | ET05 |
| Depende de | U11 (estado), U12 (cliente do motor), U13/E04 (arquivos), U17/U18 (idiomas e temas), C09 |
| Método | [ANOVA de um fator](../metodos/anova-um-fator.md) |

## 1. Responsabilidade

U07: escolher resposta, fator e α do caminho **Comparar tratamentos**. U08: explicação curta (conclusão, evidência, próximo passo, fatos e avisos), tabelas de grupos (com letras), ANOVA e pares. U09: gráficos de médias com incerteza nomeada e letras, boxplot, resíduos × ajustados e QQ, desenhados a partir das séries do motor. U16: tabelas em CSV e XLSX, figuras em SVG e PNG e relatório HTML, todos com proveniência (ET09, [DT-0014](../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md), [guia](../guias/exportacao.md)). Nenhum cálculo estatístico no TypeScript.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `features/analysis/AnalysisSetup.tsx`, `buildRequest.ts` | Configuração, operação (`analysisKind`) e assinatura dos dados e opções |
| `features/results/ResultsView.tsx` | Escolhe a visão pelo tipo do resultado |
| `features/results/ComparisonResults.tsx` | Composição, seleção da incerteza, gráficos e exportação |
| `features/results/ComparisonInterpretation.tsx` | Explicação curta, fatos e avisos localizados |
| `features/results/ComparisonTables.tsx`, `comparisonRows.ts` | Tabelas na tela e linhas do CSV |
| `features/results/ChartFigure.tsx`, `ExportButton.tsx` | Figura acessível e botões de SVG/PNG; aplica a personalização da figura (chave = `testId`) à tela e à exportação |
| `features/results/FigureCustomizer.tsx`, `services/charts/figureStyle.ts` | Edição por figura (título, rótulos, letras, fonte) gravada em `Experiment.figure_styles`; troca os textos marcados com `data-figure` no SVG ([DT-0016](../decisoes-tecnicas/dt-0016-dic-aleatorizado-e-estilo-por-figura.md)) |
| `features/settings/UpdateCheck.tsx` | “Verificar atualizações” (só no aplicativo Windows; instalação somente com assinatura válida, [DT-0017](../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)) |
| `services/charts/{svg,means,boxplot,scatter}.ts` | Renderizador SVG (tela e exportação, mesma fonte) |
| `services/export/{csv,png,metadata}.ts` | CSV (formatos técnico e Excel, proteção contra fórmulas), rasterização, chunk `tEXt` e proveniência |
| `services/export/{xlsx,report,settings}.ts` | Pasta de trabalho (escrita pelo motor), documento e limpeza do relatório HTML, preferências de exportação |
| `services/charts/style.ts` | Paleta (padrão/daltonismo) e escala de fonte sobre o SVG |
| `features/export/{ExportSettingsPanel,ReportButton}.tsx` | Preferências de exportação e relatório (renderização oculta no idioma da exportação) |
| `features/results/{TableExportButtons,useTableExport,useFigureFormat}.ts(x)` | Par CSV/XLSX por tabela e algarismos das figuras |
| `optima-project/src/xlsx_writer.rs`; operação `ExportXlsx` do motor | Escrita de XLSX (números, textos embutidos, `quotePrefix`, planilha de proveniência) |
| `services/storage/*` (`exportFile`) e `src-tauri/src/commands.rs` (`export_file`) | Download no navegador; diálogo nativo e gravação segura no Windows |

## 3. Comportamento

- A barra de incerteza (IC com variância comum, desvio-padrão ou erro-padrão da média) é escolhida pelo usuário e **sempre nomeada** na figura e na exportação; a legenda das letras diz que compartilhar letra não é equivalência.
- A tabela de pares fica aberta abaixo do gráfico; o texto do gráfico é escapado e tem título e descrição acessíveis com identificadores únicos.
- Mudar dados, fator ou α invalida o resultado exibido (assinatura); reabrir um projeto mostra o guardado, sem recálculo.
- Exportações levam método, versões, análise, revisão (e hash), projeto, experimento, configuração e data.

## 4. Erros e limitações

Falha ou cancelamento de exportação é informado em linha (`role="status"`). O PNG depende de `canvas` (navegadores e WebView2). Sem edição por figura (título, eixos, letras), sem PDF/DOCX e sem preferências de exportação no projeto (ver plano da ET09, desvios).

## 5. Manutenção

Novo gráfico: função em `services/charts/` com `id` único, teste de SVG bem formado (sem `NaN`), `ChartFigure` e textos PT/EN. Testes: `npm test`, `npm run test:e2e` (inclui axe nos três temas).

## 6. Testes e validação

Testes unitários (gráficos, CSV, proteção contra fórmulas, pasta de trabalho, estilo das figuras), ida e volta do XLSX contra o importador do motor, verificação com openpyxl, E2E de exportação (XLSX, CSV Excel, relatório em inglês com interface em português, paleta) e E2E do percurso e do exemplo 01 em PT e EN (Chromium e Firefox) com download de CSV, SVG e PNG verificados byte a byte, axe em três temas, verificação do IPC nativo em Linux.
