# Mapa de módulos e arquivos

**Estado:** vigente · **Atualizado em:** 2026-11-01

Mapa de responsabilidades e caminhos relativos à raiz do repositório. O estado de cada implementação é definido pelo plano ativo/concluído e pelos registros de progresso abaixo; entradas planejadas não equivalem a métodos entregues. Este mapa acompanha o [roteiro do produto](../planos-execucao/roteiro-produto.md), as [decisões aprovadas](../produto/decisoes-aprovadas.md) e a [estrutura do repositório](estrutura-repositorio.md). A etapa da v0.1 que cria ou amplia cada módulo está indicada nos [planos de etapa](../planos-execucao/README.md).

## Convenção para manutenção

- Um módulo representa uma responsabilidade e possui entrada pública identificada. Em Rust, `mod.rs` agrupa a API e declara submódulos; os algoritmos ficam em arquivos com nomes explícitos. Em TypeScript, `index.ts` exporta somente a API pública da funcionalidade.
- Arquivos de entrada pequenos: não colocar o app em `App.tsx`, nem os cálculos em `lib.rs` ou `commands.rs`.
- Separar cálculo, contrato, apresentação, acesso a arquivos e comunicação. Evitar arquivos genéricos como `utils.rs` para responsabilidades científicas diferentes.
- Uma família pode ter vários arquivos: `comparisons/tukey.rs`, `comparisons/games_howell.rs` e `comparisons/letters.rs`, por exemplo. Cada procedimento tem um proprietário definido.
- Novos arquivos surgem na fase correspondente; não criar centenas de arquivos vazios antecipadamente.
- Documentar entradas, saídas, dependências, erros, referências e testes em `docs/modulos/<id>-<slug>.md` (exemplo: `c09-comparacoes.md`). Fórmulas detalhadas ficam em `docs/metodos/<slug>.md` (exemplo: `tukey.md`). Nomes seguem a [convenção de nomenclatura](../convencoes/nomenclatura.md).
- O mapa descreve organização interna proposta para executar requisitos aprovados. Ajustes de nomes são permitidos se o mapa, os imports e os testes forem atualizados juntos.

## Pacotes e dependências

| Pacote/pasta | API principal prevista | Papel e dependências |
|---|---|---|
| `app/crates/optima-core` | `src/lib.rs` | Tipos científicos e cálculo puro. Não importa React, Tauri, filesystem ou Google |
| `app/crates/optima-project` | `src/lib.rs` | Documento do projeto, revisões, serialização e migrações em memória; depende dos tipos do core |
| `app/crates/optima-engine` | `src/lib.rs`, `src/dispatch.rs` | Casos de uso comuns e envelopes de solicitação/resposta; depende de core/project |
| `app/crates/optima-wasm` | `src/lib.rs` | Adaptação WebAssembly do engine; sem fórmulas duplicadas |
| `app/desktop/src-tauri` | `src/lib.rs` | Comandos Tauri, tarefas de cálculo, arquivos, autorização nativa e atualização; chama engine |
| `app/web` | `src/main.tsx`, `src/app/App.tsx` | Uma interface React; seleciona adaptador WASM ou Tauri e serviços de armazenamento |

`optima-project` e `optima-engine` são extrações propostas além das pastas já reservadas. Tornam explícita a separação entre ciência, documento e execução. Não criar um pacote Cargo por teste estatístico; procedimentos relacionados permanecem módulos do core.

## Núcleo científico

Todos os caminhos da tabela abaixo começam em **`app/crates/optima-core/src/`**. Cada diretório tem `mod.rs`; a coluna de arquivos enumera os responsáveis pelo trabalho, não apenas nomes de pastas.

| ID | Módulo e arquivos previstos | Entradas → saídas e dependências |
|---|---|---|
| C01 | `domain/{ids,factor,dataset,response,observation,unit,design,model_spec}.rs` (ET01: `ids`, `factor`) | Dados tipados, IDs, unidades experimentais, fatores numéricos/categóricos, papéis e configurações; base comum |
| C02 | `validation/{dataset,design,model,issues}.rs` | Dados/configuração → erros e avisos codificados; usa C01; sem textos de interface |
| C03 | `numeric/{matrix,qr,svd,summation,root_finding,special_functions}.rs` (ET02, ET04); `integration` (ET05), `cholesky`, `random` (ET06) quando houver consumidor | Operações numéricas estáveis, rank, convergência, tolerâncias e RNG com semente explícita; base matemática |
| C04 | `distributions/{normal,student_t,f,chi_square,quantile,evaluate,studentized_range,range_table,dunnett}.rs` (ET04, ET05; `range_table` — tabela de Chebyshev de `W(w; k)` — e `dunnett` na ET11); `noncentral`, `multivariate_t` quando houver consumidor | CDF, caudas e quantis necessários; usa C03; implementações progressivas conforme métodos consumidores |
| C05 | `descriptive/{mod,summary,grouped}.rs` (ET02); `quantiles.rs` quando houver consumidor | Dados elegíveis → n, média, dispersão e quantis; usa C01–C03 |
| C06 | `models/{terms,design_matrix,linear,prediction,covariance}.rs` (ET04; a estimabilidade está em `covariance.rs`); `models/factorial_anova.rs` (ET11: ANOVA multifatorial com blocos, tipos I–III, médias marginais e contrastes) | Dados + especificação → coeficientes, rank, resíduos, covariância, predições e funções estimáveis; usa C01–C04 |
| C07 | `inference/{regression_anova,intervals,one_way_anova}.rs` (ET04, ET05); `one_way_anova` (ET05), `lenth` e `lack_of_fit` (ET06), `factorial_anova`, `welch`, `effect_sizes` quando houver consumidor | Modelos/dados + hipóteses → tabelas, testes, intervalos; usa C04–C06; especifica tipo de soma de quadrados |
| C08 | `diagnostics/{residuals,influence,assumptions}.rs` (ET04, ET05); `adequacy` (ET07) | Modelo + estrutura experimental → diagnósticos calculados e limitações; usa C06–C07 |
| C09 | `comparisons/{groups,tukey,letters}.rs` (ET05; a família é explícita em `tukey.rs`); `comparisons/procedures.rs` (ET11: Games–Howell, Dunnett, Bonferroni, Holm e Kruskal–Wallis/Dunn, com os ajustes); contrastes em `models/factorial_anova.rs` | Estimativas + covariância + graus de liberdade + família → comparações e letras; usa C04, C06–C07 |
| C10 | `nonparametric/{ranks,kruskal_wallis,dunn}.rs` (na v0.2 a comparação por postos está em `comparisons/procedures.rs`) | Dados independentes elegíveis → postos, testes e ajustes, com empates; usa C01–C04 e ajustes de C09 |
| C11 | `designs/{spec,coding,factorial,fractional,alias,plackett_burman,randomization,generate,recommend,analysis,completely_randomized,randomized_block}.rs` (ET06; réplicas e pontos centrais em `generate.rs`; `randomized_block.rs` — DBC — na ET11) | Fatores + orçamento + semente + estrutura → matriz, codificação, ordem, geradores e confundimento; análise de efeitos, curvatura e Lenth; usa C01–C03, C06–C07 |
| C12 | `designs/{central_composite,box_behnken}.rs` (ET07; a matriz personalizada não tem arquivo próprio: a análise `surface/model.rs` aceita qualquer matriz quantitativa e verifica posto e estimabilidade, [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md)) | Fatores, níveis e geometria → planejamento de superfície e metadados; usa C11 e C06 para estimabilidade |
| C13 | `designs/{mixed_levels,mixture,optimal,constraints,augmentation}.rs` | Região admissível + modelo alvo → matriz candidata/expandida e avaliação; usa C03, C06 e C11 |
| C14 | `models/mixed/` e `models/nonlinear/{mod,types,model,optimizer,fitting,profile}.rs` | Dados dependentes/não lineares + especificação → ajuste, covariância e convergência; usa C03–C06; estimadores específicos documentados |
| C15 | `power/{mod,types,legacy,anova,t_test,advanced,fixed_design,simulation}.rs` (regressão/contrastes/simulação em execução na ET24) | Efeito de interesse + estrutura + erro/precisão → potência/tamanho necessário; usa C03–C07 e C14 quando pertinente |
| C16 | `visualization/{boxplot,residuals}.rs` (ET05; as barras de médias vêm de `comparisons`); `effects` (efeitos principais e interações), Pareto e observado × predito (em `designs/analysis.rs`) (ET06), `surface/{terms,model,equation,grid,contour}.rs` (ET07: ajuste de segunda ordem, equação, malha, extrapolação e curvas de nível) | Resultado + domínio → séries e malhas científicas sem estilo; usa modelos, diagnósticos e comparações |
| C17 | `optimization/{objective,constraints,desirability,search,candidates,optimize,evaluate,grid}.rs` (ET08; a proposta de confirmação é montada na interface a partir de `evaluate`, e o vínculo no projeto está em `optima-project/src/confirmation.rs`; a malha de desejabilidade do gráfico está em `grid.rs`) | Modelos + alvos + domínio → candidatos, restrições, compromisso, previsão e avaliação em condições dadas; usa C06, C16 (`surface`) e C11 (PCG32) |
| C18 | `interpretation/{mod,facts,rules}.rs` (ET02); `recommendations.rs` com as recomendações de método | Dados/resultados/diagnósticos → mensagens por chave, parâmetros e evidência; não gera traduções nem recalcula testes |
| C19 | `registry/{methods,capabilities,status}.rs`, `errors.rs`, `provenance.rs`, `trace.rs` | Registro de métodos disponíveis, requisitos, versão, evidências e passos opcionais; declara dependências e situação |

Os arquivos com múltiplos métodos, como `adjustments.rs`, podem ser subdivididos se crescerem; o arquivo de entrada continua identificável. Não expor matriz/algoritmo interno de um ajuste como contrato público se uma estrutura estável de resultado for suficiente.

## Documento e execução

| ID | Caminhos previstos | Responsabilidade |
|---|---|---|
| P01 | `app/crates/optima-project/src/{document,experiment,figure_style,comment,analysis,revision}.rs` (`annotation` e `attachment` não criados: sem uso na v0.1) | Documento com vários experimentos, revisões e análises imutáveis vinculadas aos dados |
| P02 | `app/crates/optima-project/src/{archive,manifest,schema,integrity}.rs` | Codificação/decodificação `.enzitag` em bytes, versão de esquema e integridade; sem abrir arquivos do sistema |
| P03 | `app/crates/optima-project/src/migrations/mod.rs` | Migrações explícitas e preservação de resultados; `v001.rs` e seguintes só quando houver mudança real de esquema |
| E01 | `app/crates/optima-engine/src/{request,response,dispatch,capabilities}.rs` | API comum: validar, resumir, gerar planejamento, ajustar, comparar, diagnosticar, predizer, otimizar e operar documento |
| E02 | `app/crates/optima-engine/src/{jobs,cancellation,events}.rs` (planejado); **ET08: cancelamento inicial no cliente** (`EngineClient.cancel`, Worker recriado no navegador; resultado descartado no Windows), sem progresso incremental ([DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md), item 9) | Identidade da tarefa, checkpoints de cancelamento e progresso; sem scheduler específico de plataforma |
| E03 | `app/crates/optima-wasm/src/lib.rs` | Transporte do texto JSON do engine para JS; mesma semântica de erros e resultados. `conversion.rs`/`errors.rs` só se surgir necessidade (ET01 não precisou) |
| E04 | `app/desktop/src-tauri/src/{commands,jobs,files}.rs` (ET03); `auth.rs` (Drive) e `updater.rs` (ET10) depois | Transporte nativo, tarefas fora da thread da UI, salvamento seguro e recursos Windows |

## Interface compartilhada e integrações

Todos os caminhos abaixo começam em **`app/web/src/`**, salvo indicação contrária.

| ID | Arquivos de entrada e suporte | Responsabilidade |
|---|---|---|
| U01 | `app/App.tsx` (`AppShell` e `Router` não criados: [DT-0007](../decisoes-tecnicas/dt-0007-decisoes-et02-interface.md)), `features/home/{index.ts,availability.ts,StartActions}`, `features/examples`, `features/project/RecentFiles.tsx` | Estrutura principal, três entradas, exemplos (Extras) e recentes (Arquivo) |
| U02 | `features/workflow/{index.ts,Workflow.tsx,steps.ts,guards.ts}` | Cinco etapas, navegação contextual e etapas satisfeitas/invalidadas |
| U03 | `features/experiment/{index.ts,FactorEditor.tsx,ResponseEditor.tsx}` (ET02); `StructureEditor.tsx` na ET03 | Fatores, respostas, unidades experimentais, blocos, tempos e réplicas |
| U04 | `features/data/{index.ts,DataGrid.tsx,columnRoles.ts,editing.ts}` | Tabela, edição e erros por célula; alterações geram revisão e invalidam resultados dependentes |
| U05 | `features/import/{index.ts,ImportWizard.tsx,ImportButton.tsx,mapping.ts,fillResponses.ts}`; `services/import/csv.ts` (XLSX pelo motor: `app/crates/optima-project/src/xlsx.rs`; colagem em `features/data/editing.ts`) | Leitura e normalização, prévia e confirmação de papéis; não calcula estatística |
| U06 | `features/design/{index.ts,DesignPanel.tsx,TwoLevelPanel.tsx,CrdPanel.tsx,CrdMatrix.tsx,crdRows.ts,RunMatrix.tsx,designRows.ts,matrixCsv.ts,collectionColumns.ts}` (`collectionColumns`: colunas de resposta da planilha de coleta, ET13) (ET06; `DesignPanel` reúne seletor, opções e contagem) | Escolha, condições, contagem de ensaios e matriz; recebe capacidades do motor |
| U07 | `features/analysis/{index.ts,AnalysisSetup.tsx,buildRequest.ts}` (ET02); `ModelTerms.tsx` e `ComparisonSetup.tsx` nas etapas dos modelos e das comparações | Hipóteses, modelos alternativos, comparações e configurações avançadas |
| U08 | `features/results/{index.ts,ResultsView.tsx,DescriptiveTable.tsx,Interpretation.tsx}` (ET02); `ComparisonResults`/`ComparisonTables` (ET05) e `DesignResults` (ET06); `SectionedResults` (barra lateral de seções), `ModelPanel` (seleção e comparação de modelos), `ProcedureResults` e `FactorialResults` (ET11); `DiagnosticPanel` nas etapas seguintes | Tabelas e explicações curtas localizadas a partir de resultados do motor |
| U09 | `features/results/{ChartFigure.tsx,SurfaceView.tsx,SurfaceResults.tsx}` e `services/charts/{svg,means,boxplot,scatter,pareto,effects,contour,surface3d,surfaceGeometry}.ts` (ET05–ET07; `ChartView`, `ChartEditor` e `LetterLayer` não foram criados: o renderizador SVG próprio cobre tela e exportação, [DT-0010](../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md), [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md)); `ChartEditor` na ET09); personalização completa por figura (`FigureCustomizer`: textos, letras manuais, anotações livres, cor, fundo, fonte, grade, legenda, resolução) e `services/charts/figureStyle.ts` (ET11) | Aparência e renderização, rótulos e letras, projeções 2D/3D; sem inferência em JavaScript |
| U10 | `features/optimization/{index.ts,OptimizationPanel.tsx,GoalsEditor.tsx,CandidateTable.tsx,TradeOffs.tsx,OptimizationReport.tsx,DesirabilityView.tsx,ConfirmationPanel.tsx,ConfirmationCheck.tsx,optimizationSetup.ts}` (ET08; objetivos e restrições reunidos em `GoalsEditor`) | Objetivos, restrições, desejabilidade e candidatos retornados pelo motor |
| U11 | `features/project/{index.ts,ProjectTree.tsx,HistoryView.tsx,SaveStatus.tsx}` (ET03); `state/{project,preferences}.ts` e `state/ProjectContext.tsx` (ET02), `state/jobs.ts` (ET08) | Experimentos, revisões, seleção e preferências; não replica resultados em estados independentes |
| U12 | `services/engine/{index,EngineClient,contracts.generated,wasmClient,tauriClient}.ts`, `services/engine/EngineContext.tsx`; `workers/engine.worker.ts` | Contrato único e escolha de adaptador; Worker navegador, comandos no desktop |
| U13 | `services/storage/{StorageProvider,browserFile,desktopFile,recovery,autosave,context,bytes,index}.ts` (`revisionStore` não criado: as revisões estão no documento) | Abrir/salvar bytes e recuperar sessões; serialização do projeto pertence a P02 |
| U14 | `services/drive/{auth.web,auth.desktop,client,folder,sync,conflicts}.ts`; `features/drive/{DrivePicker,ConnectionStatus,ConflictDialog}.tsx` | Login opcional, seleção por arquivo, reconexão, sincronização e conflitos |
| U15 | `features/comments/{index.ts,CommentThread.tsx,CommentsPanel.tsx}` (v0.3, ET20); `features/sharing/{index.ts,OpenShared.tsx}` previsto | Compartilhar/abrir/cópia e comentários em revisão identificada; sem presumir edição simultânea |
| U16 | `services/export/{csv,png,xlsx,report,settings,metadata,index}.ts`; `services/charts/{style,figureStyle}.ts`; `services/export/{pdf,pdfContent}.ts` (PDF de figuras e de relatórios, ET11, [DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)); `features/export/{ExportSettingsPanel,ReportButton}.tsx`; `features/results/{TableExportButtons,useTableExport,useFigureFormat}`; `state/ExportSettingsContext.tsx`; no Rust `optima-project/src/xlsx_writer.rs` e operação `ExportXlsx` (ET09, [DT-0014](../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md); `ExportDialog` não foi criado: botões junto de cada tabela e figura) | Figuras SVG/PNG/PDF, tabelas CSV/XLSX, relatórios HTML e PDF (v0.2); DOCX depois |
| U17 | `i18n/{index,format}.ts`, `i18n/locales/{pt-BR,en}/{common,results,diagnostics}.json` (`methods.json` quando houver textos de métodos) | Textos, formatação e idioma da exportação; preserva dados internos |
| U18 | `themes/{tokens,fonts,soft-light,modern-dark,professional}.css`; `features/settings/{index.ts,ThemeSelector,LanguageSelector,UpdateSettings}.tsx`; `state/preferences.ts` | Três temas, acessibilidade, preferências e atualização; seis temas na v0.2 (`themes/{industrial,organic,clay}.css`, tokens de profundidade em `tokens.css`, [DT-0021](../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)); logo do grupo em `features/branding/GroupLogo.tsx` |
| U19 | `services/errors/{codes,presentation}.ts` (ET02); `services/logging/local.ts` ainda não criado | Erros compreensíveis e registro local sem dados experimentais/credenciais por padrão |
| U20 | `features/engine-status/{index.ts,EngineStatus.tsx}` | Tela provisória da ET01 que exibe `engine.info`; substituída pelo fluxo guiado na ET02 |

Convenção das funcionalidades: lógica e contratos em `.ts`, componentes em `.tsx`; `index.ts` exporta a API pública.

## Contratos entre módulos

| Contrato | Campos/conteúdo mínimo | Regra |
|---|---|---|
| `Dataset` | IDs de observação e unidade experimental, colunas tipadas, papéis, valores e ausências explícitas | Não inferir independência ou preencher ausência com zero |
| `AnalysisRequest` | Versão do protocolo, ID da tarefa, revisão, método, modelo, opções, semente quando usada | Entradas validadas novamente no motor |
| `AnalysisResult` | Método/versão, hash da entrada, estimativas, testes, diagnósticos, proveniência | Resultado imutável; não salvar NaN/Infinity como número válido |
| `Diagnostic` | Código, severidade, parâmetros, referências a células/termos e evidência | Idioma resolvido em U17; erro bloqueante distinto de advertência |
| `ComparisonResult` | Família, pares, estimativas, intervalos, p ajustado, alpha e status de estimabilidade | Letras derivam da mesma família; pares não testados não são não significativos |
| `ChartSpec` | Referência da análise, séries/colunas, unidades, incerteza, idioma, estilo e anotações | Edição gráfica não modifica estatística |
| `ProjectDocument` | Versão do esquema, projeto, experimentos, revisões, análises e apresentação | Sem tokens OAuth ou credenciais |
| `StorageProvider` | Ler, gravar, copiar, listar quando suportado; revisão remota opaca e capacidades | Mesmo conteúdo em destinos diferentes; capacidades não presumidas |

IDs são strings estáveis. Valores científicos usam precisão dupla no core e no transporte, com arredondamento apenas na apresentação. A fonte dos contratos é Rust; gerar tipos TypeScript e verificar a compatibilidade do formato serializado. O protocolo possui versão própria, separada da versão do arquivo de projeto.

## Exemplo de percurso: Tukey com letras

1. U05 importa ou U04 edita; C02 valida estrutura; P01 registra revisão dos dados.
2. U07 informa modelo, família e alpha; U12 envia `AnalysisRequest` ao engine.
3. E01 chama C06/C07 para ajuste e ANOVA; C09/Tukey usa estimativas, incerteza e graus de liberdade apropriados.
4. C09/letras recebe as comparações calculadas; C16 prepara séries de médias e incerteza; C18 produz fatos interpretáveis.
5. U08 mostra tabelas, U09 desenha gráfico e U17 localiza textos. P01 preserva a análise junto à revisão de origem.
6. U16 exporta a mesma análise; U13 salva o documento codificado por P02. U14 pode enviar esses mesmos bytes ao Drive.

Manutenção típica: corrigir o cálculo do Tukey em `comparisons/tukey.rs`; ajustar organização das letras em `comparisons/letters.rs`; mover letras no desenho em `LetterLayer.tsx`; traduzir a interpretação nos arquivos de idioma. Cada mudança possui verificações correspondentes e não exige misturar as quatro responsabilidades.

## Documentação e verificações por módulo

- `docs/modulos/<id>-<slug>.md`: propósito, proprietário dos arquivos, entrada/saída, dependências, erros, exemplo de uso e impacto de mudanças.
- `docs/metodos/<slug>.md`: especificação estatística, fórmulas, referências e variantes suportadas.
- `app/crates/<pacote>/tests/<modulo>_tests.rs`: invariantes e comportamento público; testes locais de rotinas privadas junto ao módulo quando necessários.
- `app/web/src/**/<nome>.test.ts(x)`: contratos, transformação de dados e comportamento relevante da interface.
- `validation/cases/<method_id>/<nnn>-<slug>/`: dados, configuração, referência independente, resultados esperados e tolerâncias.
- `validation/reports/v<versão>/`: evidências por método e plataforma, geradas nas verificações de entrega.
- `app/web/tests/e2e/`: percursos reais de importação, cálculo, reabertura e exportação; acrescentar verificação nativa Windows compatível com Tauri.

Módulos Rust em arquivos separados seguem a organização documentada no [Rust Book](https://doc.rust-lang.org/book/ch07-02-defining-modules-to-control-scope-and-privacy.html). O transporte desktop usa os [comandos do Tauri](https://v2.tauri.app/develop/calling-rust/); o navegador terá motor isolado em Worker, apoiado pelo [guia wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/examples/wasm-in-web-worker.html). Versões de ferramentas serão fixadas na fase de preparação.

## Atualização da ET29 (v0.4 em desenvolvimento)

- **U01/U02/U03:** `features/blocks/GuidedBlocks.tsx` reúne blocos declarados pelos painéis em `GuidedFlow`/`FlowBlock`. Só o coordenador desenha navegação. Conteúdo de etapas visitadas permanece montado; a memória de bloco usa projeto, criação, experimento e etapa na sessão. `features/workflow/Workflow.tsx` coordena a etapa, os bloqueios e a mistura temporária.
- **U06:** os seis painéis de `features/design/` declaram configuração, geração/busca e matriz. Extremos reais do composto central vêm de `designGenerate` do motor. `DesignPanel` apresenta requisitos por família.
- **U04/U05:** `features/data/DataGrid.tsx` protege condições geradas, destaca respostas e localiza erros; importação também pode começar em Variáveis, sem cadastro provisório. O mapeamento já oferece unidade experimental.
- **U07/U08:** `features/analysis/presentation.ts` descreve método, resposta e modelo para revisão, exportação e comentários. Contrastes usam pesos por nível; os cálculos permanecem no Rust.
- **U09/U16:** `services/charts/layout.ts` compõe títulos/notas pelo espaço disponível e intersecta retas; `svg.ts` fornece recorte das marcas. `effects.ts` usa legendas com amostras, nomes e níveis reais. `services/export` mantém a raiz independente do relatório, exclui ajudas interativas e evita títulos órfãos. Nenhuma inferência foi transferida à interface.
- **U14:** `features/project/saveLabel.ts` distingue computador e Drive com horário; `workspace.ts` e `optima-project/document.rs` persistem `currentExperimentId` opcional. Arquivos antigos usam o primeiro experimento quando não há seleção válida.
- **U18/U20:** `features/menus` contém Arquivo/Extras/Sobre, modais nativos e identidade de versão/commit. Etapas recolhíveis no computador e seletor em telas pequenas; blocos acima do conteúdo liberam largura para tabelas. A [DT-0027](../decisoes-tecnicas/dt-0027-percurso-unificado-e-composicao-das-figuras.md) registra a composição.

## Atualização da ET27

- **C17/E01:** `optimization/confirmation.rs` e operação `confirmationCompare` calculam diferença e classificação sem reestimar o modelo; limites, ausências, duplicatas e overflow explícitos.
- **P01/U20:** `optima-project/comment.rs` recebe `editedAt` opcional; ação `editComment` preserva identidade/revisão/respostas/resolução. `CommentThread` fornece edição, cancelamento e foco.
- **U08/U17:** `features/results/StatCell.tsx` centraliza células numéricas, valor completo e causas de indefinição; `i18n/format.ts` diferencia estatísticas e valor-p.
- **U09/U16:** `ChartFigure` reúne menu e prévia; `charts/saturation.ts` e `ternary.ts` integram as famílias. `export/figureFonts.ts`, `pdfFonts.ts` e `fonts/` preservam as fontes licenciadas; `hatching.ts` converte padrões em linhas vetoriais recortadas no PDF. A composição continua nos arquivos de cada família.
- **U10:** `GoalSummary`, `CandidateSummary`, seleção única e `ConfirmationOrigin` tornam explícitos critério, empate, escala 0–1 e origem histórica. `useConfirmationComparisons` coordena o pedido científico sem calcular na interface.
- **U18:** tokens por papel e ajustes ópticos dos seis temas; telas estreitas e ampliação não transferem a rolagem das tabelas/figuras à página. [Relatório da ET27](../../validation/reports/et27/README.md).

## Atualização da ET22

- **P01/P03:** `optima-project/families.rs` define configurações e registros aditivos; `family_validation.rs` valida identidades, finitude, tipos e referências contra a revisão original. O esquema continua 1; campos ausentes são compatíveis. O core não faz IO.
- **U13/U14:** `state/familyActions.ts` captura dados no início da solicitação, cria referências históricas sem perder edições posteriores e conserva registros imutáveis. `workspace.ts` encaminha respostas tardias ao experimento original e rejeita projeto/época substituídos. `revisionOps.ts` contém somente operações estruturais do histórico. A recuperação IndexedDB inclui esses estados.
- **U07/U08:** `useFamilyRecorder.ts` coordena capturas e `familySignatures.ts` identifica mudanças relevantes. Editores de mistura, repetidas, saturação e potência preservam a configuração; os componentes puros `MixtureResults`, `RepeatedResults`, `NonlinearResults` e `PowerResults` apresentam o registro.
- **U09/U16:** `savedFamily.ts` resolve atualidade e revisão; `ViewedFamily.tsx` compartilha a consulta transitória entre apresentação, comentários e relatório fora da tela. Um cálculo novo reinicia a consulta e abre Resumo. `familyExportMetadata.ts` preserva solicitação/proveniência e motivos de indefinição nos CSV/XLSX. Nenhum cálculo científico passou ao TypeScript.

A [DT-0030](../decisoes-tecnicas/dt-0030-resultados-persistidos-das-familias.md) e o [plano da ET22](../planos-execucao/concluidos/et22-resultados-das-familias-novas.md) registram os critérios; as variantes metodológicas permanecem nas ET23–ET25.

### ET23 — dados temporais e separação do estimador

`models/mixed/{mod,types,random_intercept}.rs` separa a API, os contratos e o estimador v1, antes das covariâncias/inferências avançadas. `experiment::RowRecord.time_text` é opcional e entra no hash da revisão quando presente. Na interface, `unitIdentities.ts` conserva identidades e rótulos, `DataExportButtons.tsx` exporta unidade/tempo, e `revisionOps.ts` preserva o texto temporal. [Plano e verificação](../planos-execucao/concluidos/et23-modelos-mistos-e-medidas-repetidas-avancados.md).

ET23: a decomposição completa do modelo e os proprietários da interface/persistência estão na [ficha C14](../modulos/c14-medidas-repetidas-avancadas.md).

ET24 concluída localmente. A [ficha de saturação/perfil](../modulos/c14-ajuste-nao-linear.md) registra contratos, estimação e apresentação. O módulo C15 contém potência para regressão, contrastes e efeitos de dois níveis, com simulação e histórico.

ET24: `features/menus/useProblemFocus.ts` compartilha a apresentação/foco de avisos dos Extras; `tool-form` em `app.css` separa grupos, ações e avisos. Só apresentação, sem cálculo ou gravação de resultado.

Integridade ET24: `fixed_design` prepara razões de escala estáveis; `simulation_summary_consistent` no core verifica redundância do resumo sem amostrar. `optima-project/family_power_validation` confere estrutura/gl e chama essa rotina, sem refazer análise. `fitting` representa inferência não linear indisponível explicitamente. Bloco 02 aceito localmente, com reconferência Rust/WASM/navegadores/Windows na §9.7 do plano v0.4; etapa completa ainda aberta.

ET24 bloco 03: `services/engine/taskQueue.ts` coordena duas filas limitadas (cálculo/serviço) compartilhadas pelos adaptadores; `EngineClient` fornece AbortSignal por canal e invalidação de gerações. `wasmClient` reutiliza um worker por fila e encerra apenas a tarefa cancelada; `tauriClient` aguarda o invoke real antes de liberar a vaga. `desktop/jobs::run_engine` impõe uma vaga global por classe antes de criar trabalho bloqueante. `features/analysis/useCalculationTask` vincula potência/saturação ao destino e ciclo de vida. Sem alteração de fórmulas/contratos científicos.

ET24 bloco 04: `services/export/tableBands` compartilha a divisão de colunas entre PDF/Word; `pdfContent` associa títulos/legendas ao cabeçalho repetido e distribui larguras; `docxContent` preserva referência/linhas em 9 pt. `formatSignificant` apresenta extremos sem alterar dados. `PowerAssumptions` separa prosa e tabelas da apresentação; o relatório usa as linhas completas. `LikelihoodProfiles` conserva pontos fonte quando não há curva traçável. Aceite na §9.9 do plano v0.4.

ET24 bloco 05 aceito localmente: `model::{gradient_components,jacobian_into}`, buffers de `optimizer` e preparações de `profile` conservam o multistart; `mixed::Evaluator` compartilha preparação por unidade e separa objetivo de solução/inversa. `power::{advanced,t_test,scale}` usa a semiamplitude como predicado da precisão, com estados parciais v2 validados em `family_power_validation`. Os contadores opcionais `validation_metrics` são exclusivos da feature de observação; `examples/et24_metrics` pode ler fixtures, a biblioteca mantém ausência de I/O. `measure_et24.mjs`, `prepare_et24_metrics_baseline.py` e `compare_et24_work.py` relacionam respostas completas, contagens e ensaios normais, preservando a base anterior em ZIP. Não são um segundo motor científico.

Relatórios: `reportTables` compõe tabelas extensas em partes; `useReportTask` controla uma tarefa cancelável vinculada à origem; `reportWorker`/`workers/report.worker` isolam os mesmos conversores de PDF/Word em contexto temporário. `reportChildren` retém e encerra descendentes da descompressão local do PNG. `tableBands` é compatível com DOM do navegador e LinkeDOM; aliases PostScript em `pdfEngine` preservam famílias e pesos. Nenhuma linha científica é truncada para reduzir custo. Conferências e pendências na §9.10 do plano v0.4.
