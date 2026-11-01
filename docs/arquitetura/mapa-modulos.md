# Mapa de módulos e arquivos

**Estado:** vigente · **Atualizado em:** 2026-11-01

**Estrutura de implementação planejada; os arquivos de código listados ainda não existem.** Caminhos relativos à raiz do repositório. Este mapa acompanha o [roteiro do produto](../planos-execucao/roteiro-produto.md), as [decisões aprovadas](../produto/decisoes-aprovadas.md) e a [estrutura do repositório](estrutura-repositorio.md). A etapa da v0.1 que cria ou amplia cada módulo está indicada nos [planos de etapa](../planos-execucao/README.md).

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
| C04 | `distributions/{normal,student_t,f,chi_square,quantile,evaluate,studentized_range}.rs` (ET04, ET05); `noncentral`, `multivariate_t` quando houver consumidor | CDF, caudas e quantis necessários; usa C03; implementações progressivas conforme métodos consumidores |
| C05 | `descriptive/{mod,summary,grouped}.rs` (ET02); `quantiles.rs` quando houver consumidor | Dados elegíveis → n, média, dispersão e quantis; usa C01–C03 |
| C06 | `models/{terms,design_matrix,linear,prediction,covariance}.rs` (ET04; a estimabilidade está em `covariance.rs`); `marginal_means.rs` nas etapas seguintes | Dados + especificação → coeficientes, rank, resíduos, covariância, predições e funções estimáveis; usa C01–C04 |
| C07 | `inference/{regression_anova,intervals,one_way_anova}.rs` (ET04, ET05); `one_way_anova` (ET05), `lenth` e `lack_of_fit` (ET06), `factorial_anova`, `welch`, `effect_sizes` quando houver consumidor | Modelos/dados + hipóteses → tabelas, testes, intervalos; usa C04–C06; especifica tipo de soma de quadrados |
| C08 | `diagnostics/{residuals,influence,assumptions}.rs` (ET04, ET05); `adequacy` (ET07) | Modelo + estrutura experimental → diagnósticos calculados e limitações; usa C06–C07 |
| C09 | `comparisons/{groups,tukey,letters}.rs` (ET05; a família é explícita em `tukey.rs`); `contrasts`, `dunnett`, `games_howell`, `adjustments` na v0.2 | Estimativas + covariância + graus de liberdade + família → comparações e letras; usa C04, C06–C07 |
| C10 | `nonparametric/{ranks,kruskal_wallis,dunn}.rs` | Dados independentes elegíveis → postos, testes e ajustes, com empates; usa C01–C04 e ajustes de C09 |
| C11 | `designs/{spec,coding,factorial,fractional,alias,plackett_burman,randomization,generate,recommend,analysis}.rs` (ET06; réplicas e pontos centrais em `generate.rs`); `blocks.rs` na v0.2 | Fatores + orçamento + semente + estrutura → matriz, codificação, ordem, geradores e confundimento; análise de efeitos, curvatura e Lenth; usa C01–C03, C06–C07 |
| C12 | `designs/{central_composite,box_behnken}.rs` (ET07; a matriz personalizada não tem arquivo próprio: a análise `surface/model.rs` aceita qualquer matriz quantitativa e verifica posto e estimabilidade, [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md)) | Fatores, níveis e geometria → planejamento de superfície e metadados; usa C11 e C06 para estimabilidade |
| C13 | `designs/{mixed_levels,mixture,optimal,constraints,augmentation}.rs` | Região admissível + modelo alvo → matriz candidata/expandida e avaliação; usa C03, C06 e C11 |
| C14 | `models/{mixed,repeated_measures,nonlinear,monod}.rs` | Dados dependentes/não lineares + especificação → ajuste, covariância e convergência; usa C03–C06; estimadores específicos documentados |
| C15 | `power/{anova,regression,contrasts,simulation}.rs` | Efeito de interesse + estrutura + erro/precisão → potência/tamanho necessário; usa C03–C07 e C14 quando pertinente |
| C16 | `visualization/{boxplot,residuals}.rs` (ET05; as barras de médias vêm de `comparisons`); `effects` (efeitos principais e interações), Pareto e observado × predito (em `designs/analysis.rs`) (ET06), `surface/{terms,model,equation,grid,contour}.rs` (ET07: ajuste de segunda ordem, equação, malha, extrapolação e curvas de nível) | Resultado + domínio → séries e malhas científicas sem estilo; usa modelos, diagnósticos e comparações |
| C17 | `optimization/{objective,constraints,desirability,search,candidates,confirmation}.rs` | Modelos + alvos + domínio → candidatos, restrições, compromisso, previsão e plano de confirmação; usa C03 e C06 |
| C18 | `interpretation/{mod,facts,rules}.rs` (ET02); `recommendations.rs` com as recomendações de método | Dados/resultados/diagnósticos → mensagens por chave, parâmetros e evidência; não gera traduções nem recalcula testes |
| C19 | `registry/{methods,capabilities,status}.rs`, `errors.rs`, `provenance.rs`, `trace.rs` | Registro de métodos disponíveis, requisitos, versão, evidências e passos opcionais; declara dependências e situação |

Os arquivos com múltiplos métodos, como `adjustments.rs`, podem ser subdivididos se crescerem; o arquivo de entrada continua identificável. Não expor matriz/algoritmo interno de um ajuste como contrato público se uma estrutura estável de resultado for suficiente.

## Documento e execução

| ID | Caminhos previstos | Responsabilidade |
|---|---|---|
| P01 | `app/crates/optima-project/src/{document,experiment,analysis,revision}.rs` (`annotation` e `attachment` não criados: sem uso na v0.1) | Documento com vários experimentos, revisões e análises imutáveis vinculadas aos dados |
| P02 | `app/crates/optima-project/src/{archive,manifest,schema,integrity}.rs` | Codificação/decodificação `.enzitag` em bytes, versão de esquema e integridade; sem abrir arquivos do sistema |
| P03 | `app/crates/optima-project/src/migrations/mod.rs` | Migrações explícitas e preservação de resultados; `v001.rs` e seguintes só quando houver mudança real de esquema |
| E01 | `app/crates/optima-engine/src/{request,response,dispatch,capabilities}.rs` | API comum: validar, resumir, gerar planejamento, ajustar, comparar, diagnosticar, predizer, otimizar e operar documento |
| E02 | `app/crates/optima-engine/src/{jobs,cancellation,events}.rs` | Identidade da tarefa, checkpoints de cancelamento e progresso; sem scheduler específico de plataforma |
| E03 | `app/crates/optima-wasm/src/lib.rs` | Transporte do texto JSON do engine para JS; mesma semântica de erros e resultados. `conversion.rs`/`errors.rs` só se surgir necessidade (ET01 não precisou) |
| E04 | `app/desktop/src-tauri/src/{commands,jobs,files}.rs` (ET03); `auth.rs` (Drive) e `updater.rs` (ET10) depois | Transporte nativo, tarefas fora da thread da UI, salvamento seguro e recursos Windows |

## Interface compartilhada e integrações

Todos os caminhos abaixo começam em **`app/web/src/`**, salvo indicação contrária.

| ID | Arquivos de entrada e suporte | Responsabilidade |
|---|---|---|
| U01 | `app/App.tsx` (`AppShell` e `Router` não criados: [DT-0007](../decisoes-tecnicas/dt-0007-decisoes-et02-interface.md)), `features/home/{index.ts,availability.ts,RecentProjects,StartActions}` | Estrutura principal, projetos recentes e três entradas |
| U02 | `features/workflow/{index.ts,Workflow.tsx,steps.ts,guards.ts}` | Cinco etapas, navegação contextual e etapas satisfeitas/invalidadas |
| U03 | `features/experiment/{index.ts,FactorEditor.tsx,ResponseEditor.tsx}` (ET02); `StructureEditor.tsx` na ET03 | Fatores, respostas, unidades experimentais, blocos, tempos e réplicas |
| U04 | `features/data/{index.ts,DataGrid.tsx,columnRoles.ts,editing.ts}` | Tabela, edição e erros por célula; alterações geram revisão e invalidam resultados dependentes |
| U05 | `features/import/{index.ts,ImportWizard.tsx,ImportButton.tsx,mapping.ts}`; `services/import/csv.ts` (XLSX pelo motor: `app/crates/optima-project/src/xlsx.rs`; colagem em `features/data/editing.ts`) | Leitura e normalização, prévia e confirmação de papéis; não calcula estatística |
| U06 | `features/design/{index.ts,DesignPanel.tsx,RunMatrix.tsx,designRows.ts,matrixCsv.ts}` (ET06; `DesignPanel` reúne seletor, opções e contagem) | Escolha, condições, contagem de ensaios e matriz; recebe capacidades do motor |
| U07 | `features/analysis/{index.ts,AnalysisSetup.tsx,buildRequest.ts}` (ET02); `ModelTerms.tsx` e `ComparisonSetup.tsx` nas etapas dos modelos e das comparações | Hipóteses, modelos alternativos, comparações e configurações avançadas |
| U08 | `features/results/{index.ts,ResultsView.tsx,DescriptiveTable.tsx,Interpretation.tsx}` (ET02); `ComparisonResults`/`ComparisonTables` (ET05) e `DesignResults` (ET06); `DiagnosticPanel` nas etapas seguintes | Tabelas e explicações curtas localizadas a partir de resultados do motor |
| U09 | `features/results/{ChartFigure.tsx,SurfaceView.tsx,SurfaceResults.tsx}` e `services/charts/{svg,means,boxplot,scatter,pareto,effects,contour,surface3d,surfaceGeometry}.ts` (ET05–ET07; `ChartView`, `ChartEditor` e `LetterLayer` não foram criados: o renderizador SVG próprio cobre tela e exportação, [DT-0010](../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md), [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md)); `ChartEditor` na ET09 | Aparência e renderização, rótulos e letras, projeções 2D/3D; sem inferência em JavaScript |
| U10 | `features/optimization/{index.ts,ObjectivesEditor.tsx,ConstraintsEditor.tsx,CandidateTable.tsx}` | Objetivos, restrições, desejabilidade e candidatos retornados pelo motor |
| U11 | `features/project/{index.ts,ProjectTree.tsx,HistoryView.tsx,SaveStatus.tsx}` (ET03); `state/{project,preferences}.ts` e `state/ProjectContext.tsx` (ET02), `state/jobs.ts` (ET08) | Experimentos, revisões, seleção e preferências; não replica resultados em estados independentes |
| U12 | `services/engine/{index,EngineClient,contracts.generated,wasmClient,tauriClient}.ts`, `services/engine/EngineContext.tsx`; `workers/engine.worker.ts` | Contrato único e escolha de adaptador; Worker navegador, comandos no desktop |
| U13 | `services/storage/{StorageProvider,browserFile,desktopFile,recovery,autosave,context,bytes,index}.ts` (`revisionStore` não criado: as revisões estão no documento) | Abrir/salvar bytes e recuperar sessões; serialização do projeto pertence a P02 |
| U14 | `services/drive/{auth.web,auth.desktop,client,folder,sync,conflicts}.ts`; `features/drive/{DrivePicker,ConnectionStatus,ConflictDialog}.tsx` | Login opcional, seleção por arquivo, reconexão, sincronização e conflitos |
| U15 | `features/sharing/{index.ts,OpenShared.tsx,CommentsPanel.tsx}` | Compartilhar/abrir/cópia e comentários em revisão identificada; sem presumir edição simultânea |
| U16 | `services/export/{figure,table,report,provenance}.ts`; `features/export/ExportDialog.tsx` | Figuras SVG/PDF/PNG, tabelas CSV/XLSX, relatórios HTML/PDF e, depois, DOCX |
| U17 | `i18n/{index,format}.ts`, `i18n/locales/{pt-BR,en}/{common,results,diagnostics}.json` (`methods.json` quando houver textos de métodos) | Textos, formatação e idioma da exportação; preserva dados internos |
| U18 | `themes/{tokens,fonts,soft-light,modern-dark,professional}.css`; `features/settings/{index.ts,ThemeSelector,LanguageSelector,UpdateSettings}.tsx`; `state/preferences.ts` | Três temas, acessibilidade, preferências e atualização |
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
