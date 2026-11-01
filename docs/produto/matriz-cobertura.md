# Matriz de cobertura

**Estado:** vigente · **Atualizado em:** 2026-11-01

Fonte única da versão-alvo e da situação de cada item do [catálogo funcional](catalogo-funcional.md) e dos recursos de produto aprovados. A situação de cada item reflete o estado real do repositório na data de atualização.

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
| Fatorial completo de dois níveis | F05 | v0.1 | ET06 | implementado; validado numericamente (nativo e WebAssembly); Windows pendente | [método](../metodos/fatorial-dois-niveis.md#10-validação), [matrizes](../../validation/cases/two_level_design/designs.json), [análise 001](../../validation/cases/two_level_design_analysis/001-fatorial-2x3-replicas-centrais/README.md) |
| Fatorial fracionário (FFD): geradores, resolução, confundimento | F05 | v0.1 | ET06 | implementado; validado numericamente (nativo e WebAssembly); Windows pendente | [método](../metodos/fatorial-fracionario.md#10-validação), [casos](../../validation/cases/two_level_design/fractional.json), [análise 002](../../validation/cases/two_level_design_analysis/002-fracionario-resolucao-iv/README.md) |
| Plackett–Burman (PB) | F05 | v0.1 | ET06 | implementado; validado numericamente (nativo e WebAssembly); Windows pendente; tamanhos 8, 12, 16, 20, 24, 32, 44 e 48 | [método](../metodos/plackett-burman.md#10-validação), [casos](../../validation/cases/two_level_design/plackett-burman.json), [análise 003](../../validation/cases/two_level_design_analysis/003-plackett-burman-12-fatores-oito/README.md), [exemplo 02](../../examples/02-triagem-meio-cultivo/README.md) |
| Réplicas, pontos centrais, codificação real/codificada, aleatorização com semente | F05 | v0.1 | ET06 | implementado; validado (ordem idêntica à reimplementação independente; nativo e WebAssembly); Windows pendente | [aleatorização](../metodos/aleatorizacao.md#10-validação), [permutações](../../validation/cases/two_level_design/permutations.json) |
| DIC — delineamento inteiramente casualizado | F04/F05 | v0.1 | ET05, ET06 | em andamento: análise do DIC (ANOVA, Tukey, letras) implementada e validada na ET05; a geração aleatorizada de um DIC com fator categórico não está na ET06 (apenas planejamentos de dois níveis) e permanece pendente | [exemplo 01](../../examples/01-enzimas-quatro-condicoes/README.md), [ANOVA](../metodos/anova-um-fator.md#10-validação) |
| Composto central rotacional (DCCR/CCRD) | F06 | v0.1 | ET07 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente | [método](../metodos/composto-central.md#10-validação), [matrizes](../../validation/cases/surface_design/designs.json), [exemplo 03](../../examples/03-superficie-meio-cultivo/README.md) |
| Composto central de face centrada (FCD) | F06 | v0.1 | ET07 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente | [método](../metodos/composto-central.md#10-validação), [análise 002](../../validation/cases/response_surface/002-fcd-3-fatores/README.md) |
| Opção rotulada CCD no Protimiza (após conferência) | F06 | v0.1 | ET06, ET07 | implementada a cobertura pelo composto central com `α` informado (circunscrito ou inscrito), conforme a decisão da ET06; **a conferência da matriz e do rótulo no serviço de referência continua pendente** (sem acesso) | [inventário](catalogo-funcional.md#inventário-protimiza-et06), [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md), [composto central](../metodos/composto-central.md) |
| Box–Behnken | F06 | v0.1 | ET07 | implementado para 3 a 5 fatores (6 e 7 recusados explicitamente); validado numericamente (nativo e WebAssembly); Windows 11 pendente | [método](../metodos/box-behnken.md#10-validação), [análise 003](../../validation/cases/response_surface/003-box-behnken-3-fatores/README.md) |
| Planejamento personalizado ou matriz importada | F06 | v0.1 | ET07 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente (análise de qualquer matriz quantitativa, com posto e estimabilidade) | [método](../metodos/planejamento-personalizado.md#10-validação), [análise 004](../../validation/cases/response_surface/004-personalizado-3-fatores/README.md) |
| DBC e blocos em planejamentos | F08 | posterior | — | não iniciado | — |
| Níveis mistos | F09a | posterior | — | não iniciado | — |
| Misturas | F09b | posterior | — | não iniciado | — |
| Ótimos e sujeitos a restrições, ampliação sequencial | F09c | posterior | — | não iniciado | — |

## Modelos, inferência e diagnósticos

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Estatística descritiva (contagem, ausentes, média, variância, desvio-padrão, mínimo, máximo, por grupo) | F01 | v0.1 | ET02 | implementado; validado numericamente (nativo e WebAssembly, 9 casos NIST); Windows pendente | [método](../metodos/estatistica-descritiva.md#10-validação), [casos NIST](../../validation/cases/descriptive_summary/001-nist-numacc1/README.md) |
| Distribuições Normal, t, F e qui-quadrado | F03 | v0.1 | ET04 | implementado; validado numericamente (nativo e WebAssembly, 531 pontos mpmath, caudas até 1e-290); Windows pendente | [método](../metodos/distribuicoes.md#10-validação), [casos](../../validation/cases/distributions/001-normal/README.md) |
| Regressão linear: termos, interações, quadráticos, estimabilidade, predição | F03/F06 | v0.1 | ET04, ET07 | implementado e validado numericamente na ET04 (11 conjuntos NIST StRD, 6 casos contra NumPy/SciPy; nativo e WebAssembly); uso em superfícies na ET07 ([validado](../metodos/superficie-resposta.md#10-validação)) e Windows 11 pendente | [método](../metodos/regressao-linear.md#10-validação), [casos](../../validation/cases/linear_model/README.md) |
| ANOVA da regressão e intervalos | F03 | v0.1 | ET04 | implementado; validado numericamente (nativo e WebAssembly); Windows pendente | [método](../metodos/regressao-linear.md#10-validação), [casos](../../validation/cases/linear_model/README.md) |
| Resíduos, alavancagem e influência | F03 | v0.1 | ET04 | implementado; validado numericamente contra NumPy/SciPy e por propriedades (leave-one-out); Windows pendente | [método](../metodos/regressao-linear.md#10-validação), [casos](../../validation/cases/linear_model/README.md) |
| ANOVA de um fator, CV e tamanho de efeito | F04 | v0.1 | ET05 | implementado; validado numericamente (11 conjuntos NIST StRD a 15 dígitos; nativo e WebAssembly); Windows pendente | [método](../metodos/anova-um-fator.md#10-validação), [casos](../../validation/cases/one_way_comparison/README.md) |
| Diagnóstico de resíduos e homogeneidade na comparação | F04 | v0.1 | ET05 | implementado (Brown–Forsythe, resíduos padronizados, QQ, razão de desvios; sem selo de validade); validado contra SciPy/NumPy; Windows pendente | [método](../metodos/anova-um-fator.md#2-pressupostos-e-estruturas-compatíveis), [casos](../../validation/cases/one_way_comparison/README.md) |
| Análise de efeitos, curvatura e desenhos saturados | F05 | v0.1 | ET06 | implementado; validado numericamente (nativo e WebAssembly); Windows pendente | [método](../metodos/fatorial-dois-niveis.md#10-validação), [análises 001–005](../../validation/cases/two_level_design_analysis/001-fatorial-2x3-replicas-centrais/README.md) |
| Falta de ajuste e erro puro | F06 | v0.1 | ET06, ET07 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente; só calculada quando identificável, com a ausência explicada | [método](../metodos/superficie-resposta.md#10-validação), [análise 001](../../validation/cases/response_surface/001-ccd-rotacional-2-fatores/README.md), [sem erro puro 006](../../validation/cases/response_surface/006-sem-erro-puro/README.md) |
| ANOVA multifatorial geral com interações e médias marginais | F08 | posterior | — | não iniciado | — |
| ANOVA de Welch | F08 | posterior | — | não iniciado | — |
| Modelos mistos | F09d | posterior | — | não iniciado | — |
| Pares e medidas repetidas | F08/F09e | posterior | — | não iniciado | — |
| Ajuste não linear (Monod) | F09f | posterior | — | não iniciado | — |
| Potência e planejamento da precisão | F09g | posterior | — | não iniciado | — |

## Comparações

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Distribuição da amplitude studentizada | F04 | v0.1 | ET05 | implementado; validado numericamente (432 pontos SciPy e 10 mpmath; erro absoluto 5e-13; nativo e WebAssembly); Windows pendente | [método](../metodos/amplitude-studentizada.md#10-validação), [caso](../../validation/cases/studentized_range/001-grade-scipy-mpmath/README.md) |
| Tukey e Tukey–Kramer | F04 | v0.1 | ET05 | implementado; validado numericamente contra SciPy (p ajustado a 1e-10, intervalos a 1e-9); nativo e WebAssembly; Windows pendente | [método](../metodos/tukey.md#10-validação), [casos](../../validation/cases/one_way_comparison/README.md) |
| Letras de comparação no gráfico | F04 | v0.1 | ET05 | implementado; validado por propriedade (até 60 grupos) e contra cliques maximais independentes; nativo e WebAssembly; Windows pendente | [método](../metodos/letras-comparacao.md#8-validação) |
| Dunnett | F08 | posterior | — | não iniciado | — |
| Games–Howell | F08 | posterior | — | não iniciado | — |
| Bonferroni e Holm | F08 | posterior | — | não iniciado | — |
| Contrastes planejados | F08 | posterior | — | não iniciado | — |
| Kruskal–Wallis e Dunn | F08 | posterior | — | não iniciado | — |

## Otimização

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Objetivos maximizar, minimizar, alvo e faixa | F07 | v0.1 | ET08 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente | [desejabilidade](../metodos/desejabilidade.md#10-validação), [casos](../../validation/cases/desirability_optimization/001-um-resposta-maximizar/README.md) |
| Restrições obrigatórias × preferências, pesos | F07 | v0.1 | ET08 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente (limites obrigatórios por penalidade com tolerância 1e-9; importâncias na média geométrica) | [caso 002](../../validation/cases/desirability_optimization/002-duas-respostas-conflito/README.md), [caso 005](../../validation/cases/desirability_optimization/005-regiao-inviavel/README.md) |
| Desejabilidade individual e global | F07 | v0.1 | ET08 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente; fórmulas conferidas ponto a ponto com o código Python independente | [método](../metodos/desejabilidade.md#10-validação) |
| Vários candidatos, previsões e incerteza | F07 | v0.1 | ET08 | implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente; busca local com vários inícios, comparada com busca exaustiva; sem afirmação de ótimo global | [busca](../metodos/busca-otimizacao.md#10-validação), [exemplo 04](../../examples/04-otimizacao-e-confirmacao/README.md) |
| Proposta de ensaios de confirmação | F07 | v0.1 | ET08 | implementado: experimento vinculado com previsões gravadas e conferência com o observado; verificado em E2E (Chromium e Firefox), reabertura do projeto e exemplo 04; Windows 11 pendente | [busca](../metodos/busca-otimizacao.md), [exemplo 04](../../examples/04-otimizacao-e-confirmacao/README.md) |

## Gráficos

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Médias com incerteza nomeada e letras | F04 | v0.1 | ET05 | implementado (SVG próprio, três temas, PT/EN, axe; verificação visual); Windows pendente | [ficha](../modulos/u07-u09-u16-comparacao-resultados-e-exportacao.md) |
| Boxplot | F04 | v0.1 | ET05 | implementado (quartis do tipo 7 validados contra NumPy); Windows pendente | [ficha](../modulos/u07-u09-u16-comparacao-resultados-e-exportacao.md) |
| Resíduos e diagnóstico | F04 | v0.1 | ET05 | implementado (resíduos × ajustados e QQ, com pontos validados contra SciPy); Windows pendente | [ficha](../modulos/u07-u09-u16-comparacao-resultados-e-exportacao.md) |
| Efeitos principais e interações | F05 | v0.1 | ET06 | implementado; médias dos efeitos principais conferidas com NumPy (casos 001–005); a série de interações tem testes unitários do núcleo e E2E, sem referência independente própria; Windows pendente | [casos](../../validation/cases/two_level_design_analysis/001-fatorial-2x3-replicas-centrais/README.md) |
| Pareto | F05 | v0.1 | ET06 | implementado; ordenação e linha de referência (valor absoluto de t com t crítico, Lenth ou só efeito) conferidas contra o t crítico independente; Windows pendente | [casos](../../validation/cases/two_level_design_analysis/004-saturado-lenth/README.md) |
| Observado × predito | F05 | v0.1 | ET06 | implementado; valores ajustados conferidos com NumPy; Windows pendente | [casos](../../validation/cases/two_level_design_analysis/001-fatorial-2x3-replicas-centrais/README.md) |
| Superfície 3D e contorno | F06 | v0.1 | ET07 | implementado: malha, extrapolação e curvas calculadas no núcleo e conferidas com NumPy (malha 5×5 nos 6 casos); desenho em SVG próprio (DT-0012), verificado em E2E, axe e inspeção visual; Windows 11 pendente | [método](../metodos/superficie-resposta.md#10-validação), [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) |
| Desejabilidade e soluções de otimização | F07 | v0.1 | ET08 | implementado: malha de desejabilidade calculada no núcleo, desenho em SVG (tela e exportação) e axe nos três temas; Windows 11 pendente | [busca](../metodos/busca-otimizacao.md), [DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md) |

## Produto e plataforma

| Item | Fase | Versão | Etapa | Situação | Evidência |
|---|---|---|---|---|---|
| Windows 11 de 64 bits (Tauri) | F00–F01 | v0.1 | ET01, ET02 | em andamento: build Tauri e IPC nativo verificados em Linux; execução no Windows pendente | [ET01](../planos-execucao/ativos/et01-fundacao-tecnica.md#11-registro-de-progresso) |
| Chrome, Edge e Firefox atuais (WASM) | F00–F01 | v0.1 | ET01, ET02 | em andamento: E2E em Chromium e Firefox; Edge e Chrome estável pendentes | [ET01](../planos-execucao/ativos/et01-fundacao-tecnica.md#11-registro-de-progresso) |
| Português e inglês | F01 | v0.1 | ET01, ET02 | implementado para as funcionalidades da ET02 (paridade de chaves e de plural testada); cada etapa seguinte estende | [U17](../modulos/u17-idiomas.md) |
| Temas Soft Light, Modern Dark e Professional | F01 | v0.1 | ET01, ET02 | implementado para os componentes da ET02 (contraste e axe nos três temas); cada etapa seguinte estende | [U18](../modulos/u18-temas-e-acessibilidade.md) |
| Tela inicial, três entradas e fluxo guiado | F01 | v0.1 | ET02 | implementado (E2E em Chromium e Firefox; sem projetos recentes até a ET03); Windows pendente | [ET02](../planos-execucao/ativos/et02-primeiro-percurso.md#11-registro-de-progresso) |
| Explicações curtas (conclusão, evidência, próximo passo) | F01–F07 | v0.1 | ET02–ET08 | em andamento: descritiva (ET02) e comparação de tratamentos (ET05) | [ET02](../planos-execucao/ativos/et02-primeiro-percurso.md#11-registro-de-progresso), [ET05](../planos-execucao/ativos/et05-anova-tukey-letras.md#11-registro-de-progresso) |
| Digitação e colagem do Excel | F01/F02 | v0.1 | ET02, ET03 | implementado (grade e colagem com vírgula decimal e erros por célula); importação de arquivos na ET03 | [ET02](../planos-execucao/ativos/et02-primeiro-percurso.md#11-registro-de-progresso) |
| Importação CSV e XLSX com prévia | F02 | v0.1 | ET03 | implementado (CSV/TSV/TXT em TypeScript; XLSX em Rust validado contra openpyxl nativo e WASM); Windows pendente | [U05](../modulos/u05-importacao.md), [caso XLSX](../../validation/cases/import_xlsx/001-acentos-virgula-ausentes-formula/README.md) |
| Importação de matrizes externas | F02 | v0.1 | ET03 | implementado (mapeamento de colunas; nunca deduz o planejamento pelo nome do arquivo) | [U05](../modulos/u05-importacao.md) |
| Projeto `.enzitag`, vários experimentos, revisões | F02 | v0.1 | ET03 | implementado; formato validado contra arquivos escritos em Python (Rust, WASM e IPC nativo em Linux); migração real inexistente (esquema 1); reabertura Windows ↔ navegador pendente | [formato](../arquitetura/formato-enzitag.md), [casos](../../validation/cases/project_file/README.md) |
| Recuperação automática e checkpoints | F02 | v0.1 | ET03 | implementado (2 s, IndexedDB, três estados distintos; revisões nas operações); Windows pendente | [DT-0008](../decisoes-tecnicas/dt-0008-formato-enzitag-versoes-recuperacao.md), [U13](../modulos/u13-armazenamento-e-recuperacao.md) |
| Figuras SVG e PNG | F04/F10 | v0.1 | ET05, ET09 | implementado: SVG e PNG de todas as figuras (comparação, planejamento, superfície 2D/3D, otimização) com proveniência, paleta acessível e escala de fonte; Windows pendente | [guia](../guias/exportacao.md), [ficha](../modulos/u07-u09-u16-comparacao-resultados-e-exportacao.md) |
| Tabelas CSV e XLSX | F04/F10 | v0.1 | ET05, ET09 | implementado: CSV (técnico e Excel PT) e XLSX de todas as tabelas, proteção contra fórmulas, proveniência; XLSX validado com openpyxl e ida e volta no motor; abertura manual em Excel/LibreOffice não registrada | [guia](../guias/exportacao.md), [DT-0014](../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md), [ficha](../modulos/u07-u09-u16-comparacao-resultados-e-exportacao.md) |
| Relatório HTML | F10 | v0.1 | ET09 | implementado: autocontido, no idioma da exportação, com proveniência, tabelas, figuras e interpretação; inspecionado visualmente | [guia](../guias/exportacao.md), [DT-0014](../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md) |
| Personalização gráfica essencial | F10 | v0.1 | ET09 | parcial: paleta (inclui daltonismo), tamanho de fonte, algarismos significativos e idioma de exportação como preferências do dispositivo; **sem** edição por figura (título, eixos, letras) nem configuração salva no projeto — lacuna registrada no plano da ET09 | [guia](../guias/exportacao.md) |
| Figuras e relatórios em PDF; personalização completa | F10 | posterior | — | não iniciado | — |
| DOCX | F14 | posterior | — | não iniciado | — |
| Publicação web e instalador Windows | F13 | v0.1 | ET10 | não iniciado | — |
| Atualizador assinado, canal experimental | F13 | v0.1 | ET10 | não iniciado | — |
| Canal estável | F13 | posterior | — | não iniciado | — |
| Google Drive opcional e compartilhamento por leitura/cópia | F11 | posterior | — | não iniciado | — |
| Comentários e colaboração simultânea | F14 | posterior | — | não iniciado | — |
| Windows 10, Safari e domínio próprio | F14 | posterior | — | não iniciado | — |
| Funções do Protimiza não visíveis nas capturas | F05–F09 | a definir após inventário | ET06 | em andamento: inventário parcial registrado (sem acesso ao serviço); itens incertos listados; pergunta não bloqueante ao usuário | [inventário](catalogo-funcional.md#inventário-protimiza-et06) |
