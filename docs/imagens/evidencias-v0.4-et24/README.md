# Evidências da ET24 em execução

[Relatório parcial e critérios abertos](../../../validation/reports/et24/README.md). Perfis de saturação são o primeiro incremento; potência avançada e nativo/UI completos ainda pendentes.

| Pasta | Estado da captura |
|---|---|
| `profiles-first` | Primeira apresentação Chromium antes da correção dos fieldsets e do texto que distingue os IC; preservada como diagnóstico. |
| `profiles-final` | Quatro casos do zero e relatórios nos três navegadores, depois da correção visual; subpasta identifica o navegador. PDFs Chromium renderizados. |
| `matrix-chromium` | 48 cenários, quatro modelos × seis temas × PT/EN, configuração/limites/figura; larguras/fontes e axe por cenário. |
| `noncentral-first` | Achado numérico de potência e diagnóstico de orçamento nos três navegadores; antes de corrigir espaçamento entre campo e botão. |
| `error-focus` | Último diagnóstico: foco no aviso e rolagem da janela interna garantem que o erro completo esteja visível (3/3 motores). |
| `tool-spacing` | Última reconferência: 18/18 perfis/potência nos três navegadores, com espaço entre grupos e ações de Extras. |
| `matrix-firefox-webkit` | 96 cenários equivalentes em Firefox/WebKit. |

Rodadas 5/5 inicial, 15/15 funcional após correção, 48/48 Chromium e 96/96 Firefox/WebKit na matriz. Isso não declara a ET24 nem a v0.4 concluídas. Capturas são complementares aos casos científicos/arquivos reabríveis. Hashes usam bytes brutos; a conferência contra Git faz parte de cada checkpoint.


Integridade AU-B02/B03/B04: `integrity-browser` preserva o diagnóstico inicial; `integrity-final` contém a rodada 41/42 (falha EBUSY de download) e PDF renderizado; `integrity-native-verified` contém a execução Windows aprovada após corrigir o roteiro. Pastas native anteriores preservam o diagnóstico do teste. Último ajuste do aviso e nova rodada sem OneDrive em conferência; consultar §9.7 do plano v0.4 antes de usar uma pasta como evidência final. Não confundir arquivos de revisões distintas com uma única qualificação.

Rodada final `integrity-verified`: **9/9** nos três motores, depois do último delta de aviso; os 23 testes WASM foram repetidos no mesmo artefato. `integrity-final` conserva o PDF renderizado e o diagnóstico EBUSY. A pasta nativa aprovada antecede somente os dois deltas de apresentação explicitados no plano.

Bloco 03 aceito: `execution-final` (51/51 funcionais), `execution-visible` (9/9 com geometria do aviso e salvamento efetivamente pendente), `execution-real-load-final` (3/3 cancelamentos após envio real ao worker), `execution-nonlinear` (3/3 falhas/recuperação de saturação), `execution-native-accepted` (limite global nativo, serviço independente, nove cancelamentos e cálculo posterior). Pastas de execução anteriores conservam diagnóstico do roteiro e capturas iniciais. Ver §9.8 do plano para o significado e os limites de cada evidência.

Reconferência de integridade encerrada: `integrity-recheck-browser` (9/9 Chromium/Firefox/WebKit, axe, exportações e reabertura sem recálculo); `integrity-recheck-native` (Windows/WebView2 real, seis temas/PT–EN, arquivos históricos, ajuste exato e escalas extremas). A pasta nativa inclui PDF renderizado, logs, `paper-check.json` e `verification.json` com identidades dos artefatos. Regressão core/project: 618 aprovados e um ignorado preexistente; reforços de contrato/IC: 8 + 17 aprovados; WASM: 23 aprovados. Esses resultados fecham AU-B02/B03/B04, sem encerrar a ET24.

Bloco 04 aceito: `ui-core-accepted` (42/42 início/extremos), `ui-matrix-accepted` (116/117; falha de contexto Firefox antes do app) e `ui-matrix-retry` (1/1 aprovado); `ui-paper-header-final` (21/21 e conferência PDF/XLSX). `ui-native-tables-final`, `ui-native-mixed-final`, `ui-native-families-final` contêm a rodada Windows recompilada. `paper-data-check.json` registra conferência independente, incluindo dados numéricos. Pastas anteriores preservam diagnósticos, inclusive legenda órfã. Logs e hashes ficam na pasta nativa de tabelas; consultar §9.9 do plano para limites e versão dos artefatos.

## Evidências de desempenho e limites

| Pasta | Conferência |
|---|---|
| `performance-before-*`, `performance-precision-*`, `performance-guarded-*` | Bases e candidata por alvo. Medianas, p95, memória, hashes das solicitações e das respostas completas. |
| `performance-work-counts` | Contagens no motor com a feature de observação. Inclui a extração da base e a comparação com as respostas nativas. |
| `performance-boundaries-*` | Oito casos por alvo. Inclui ajustes admitidos, recusas e decodificação de históricos de 100 e 1.000 registros. |
| `performance-budget-final-browser` | UN de 12 ocasiões com inferência completa e parcial. Seleção de análises antigas em um histórico de 1.000 registros nos três navegadores. |
| `performance-budget-native-final` | Resultados científicos via IPC, arquivos antigos com bytes preservados, Hill parcial criado pela interface, temas, idiomas, relatórios e recuperação. |
| `performance-budget-native-accepted/paper-check` | Texto, posição e renderização dos oito PDFs. Conferência do conteúdo Word por XML. |
| `performance-real-paste-full` | Colagem real, cálculo, formatos completos, arquivo reaberto e conferência de cada célula da matriz de preditores. |
| `performance-q12-legend` | Figura e SVG da UN com e sem intervalo de confiança após a correção da legenda. |

As repetições de diagnóstico permanecem nas respectivas pastas. A seleção versionada preserva resultados, capturas e medidas de aceite. Rastreios grandes e cópias repetidas de cargas de transporte ficam na área de trabalho local. [Critérios e interpretação das medidas](../../planos-execucao/plano-v0.4.md#910-execução-do-bloco-05--custo-2026-11-04).

A candidata de fechamento está em `closure-browser`, `closure-native`, `closure-native-families` e `closure-verification`. Os exemplos reabertos e seus hashes estão em `et24-examples`. A [conferência T01–T09](../../planos-execucao/concluidos/et24-ajuste-nao-linear-e-potencia-avancados.md) registra o alcance da aprovação.

As pastas `ui-matrix-accepted` e `matrix-firefox-webkit` foram transferidas para o acervo privado de evidências. O registro de localização e verificação SHA-256 está na §11.4 do [plano da v0.4](../../planos-execucao/plano-v0.4.md).
