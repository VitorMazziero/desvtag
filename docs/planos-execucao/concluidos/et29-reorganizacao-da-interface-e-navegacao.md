# ET29 — Reorganização da interface e da navegação

| Campo | Valor |
|---|---|
| Estado | **Ativo** (primeira etapa da v0.4) |
| Versão-alvo | v0.4.0 |
| Fases do roteiro | F12 (interface, acessibilidade), F10 (relatórios) |
| Marco | Prepara a v0.4 |
| Depende de | v0.3.0 publicada (feito) |
| Módulos | U01 (`app/`, cabeçalho e menus), U02/U03 (`features/workflow`, percurso guiado), U08/U16 (`features/results`, `features/export`, relatório), U14 (`features/project`, `features/drive`, área de salvamento), U18 (`styles`, tokens), U17 (i18n PT/EN) |
| Ativado em | 2026-11-02 |
| Concluído em | — |

## 1. Objetivo

Corrigir os dois defeitos da v0.3.0 e reorganizar a interface pedida pelo usuário depois de usar a versão publicada: menus em vez de blocos soltos, um **percurso guiado por blocos** com Voltar e Seguir e opções dependentes reveladas conforme a escolha, melhor uso do espaço no computador, tela inicial sem ambiguidade, área de salvamento compacta e relatório que começa pelo que interessa. Evidências «antes» em [`docs/imagens/evidencias-v0.3.0/`](../../imagens/evidencias-v0.3.0/README.md); escopo em [plano da v0.4](../plano-v0.4.md#et29--reorganização-da-interface-e-da-navegação-primeira-da-v04).

## 2. Escopo

**Inclui**

- Defeitos da v0.3.0: relatório (PDF, Word, HTML) sem resultados quando a barra de seções está ativa; item ativo ilegível no modo escuro.
- Menus no cabeçalho: **Arquivo** (novo, abrir, salvar; computador ou Drive), **Extras** (calculadora de potência, curvas de saturação), **Sobre e atualizações** (histórico de versões, motor científico, canal e *Verificar atualizações*).
- Percurso guiado por blocos em todas as etapas (objetivo, fatores e respostas, planejamento e dados, análise, resultados), com barra lateral do percurso no computador e seletor no topo em telas estreitas; «Mostrar tudo» como alternativa.
- Tela inicial com uma ação de começar em cada uma das três opções e «Abrir projeto» separado.
- Espaçamento vertical maior entre blocos e seções; títulos de bloco destacados.
- Valores-p sem sublinhado tracejado.
- Nomes das variáveis nas equações e figuras (`ŷ` → nome da resposta) com alternância notação × nomes.
- Proveniência no fim do relatório, de forma sucinta.

**Não inclui**

- Mudança de cálculo ou de método (nenhum resultado numérico muda). O campo opcional `currentExperimentId` é a extensão aditiva explicitamente prevista na T17, sem mudar o esquema 1.
- Guardar resultados das famílias novas no projeto (ET22).
- Revisão fina tela a tela dos componentes fora das classes comuns (ET27).

## 3. Entradas e referências

- Pedido do usuário em 2026-11-02 ([decisões aprovadas §18](../../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02), itens 6 a 8).
- [DT-0018](../../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md) (resultados em seções), [DT-0023](../../decisoes-tecnicas/dt-0023-espacamento-dos-controles-logo-unico-e-rolagem-entre-etapas.md) (espaçamento, rolagem entre etapas), [DT-0025](../../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md) (Drive), [DT-0026](../../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md) (Word, comentários, canais).
- Exemplo [14](../../../examples/14-meios/README.md) (projeto real do defeito do relatório).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Navegação por blocos | Como dividir cada etapa em blocos e guardar o bloco atual? | Lista declarativa de blocos por etapa com condição de exibição; estado do bloco na interface (não no projeto) | Opções dependentes só depois da escolha; Voltar/Seguir previsíveis; teclado e leitores de tela; «Mostrar tudo» |
| Menus do cabeçalho | Menu suspenso, barra de abas ou painel lateral? | Botões de menu com `aria-haspopup` e painel; folha lateral no celular | Acessibilidade (axe, teclado), 375 px, seis temas |
| Relatório fora da tela | Onde montar o relatório para que nada da interface o altere? | Raiz própria fora do `SectionedResults`; ou filtro `[data-report-root]` | Robustez a mudanças futuras da interface |

## 5. Tarefas

- [x] **T01** — **Defeito (corrigido):** relatório completo com a barra de seções ativa (ignorar `[data-report-root]` ao aplicar as seções, ou montar o relatório fora dela); E2E que gera HTML, PDF e Word **sem** «Mostrar todas as seções» e com o exemplo 14, conferindo resumo, modelo, ANOVA, figuras e otimização.
- [x] **T02** — **Defeito (corrigido):** item ativo da barra de seções com `--color-on-action`; axe da barra com item ativo nos seis temas.
- [x] **T03** — DTs da §4.
- [x] **T04** (menus; o nome do projeto no cabeçalho vem com a T05) — Cabeçalho com os menus **Arquivo**, **Extras** e **Sobre e atualizações**; nome do projeto editável no cabeçalho.
- [x] **T05** — Área de salvamento: Novo/Abrir/Salvar como botões divididos (computador ou Drive), indicador único de estado com painel de detalhes, Drive como indicador discreto, explicações em «Saiba mais», avisos temporários.
- [x] **T06** — **Extras:** calculadora de potência e curvas de saturação saem da tela inicial e da análise do DoE e passam a abrir pelo menu, com os dados do projeto quando fizer sentido (saturação usa um fator e uma resposta do experimento).
- [x] **T07** — Tela inicial: ação de começar em cada opção; «Abrir projeto» e «Projetos recentes» separados; sem «Avançar» solto.
- [x] **T08** — Percurso guiado com blocos nos seis painéis de planejamento e na análise, um só coordenador e par de ações por etapa; estado preservado, memória na sessão e alternativa «Mostrar tudo» (completada pelas T16–T20).
- [x] **T09** — Layout largo no computador (barra do percurso + conteúdo; uso das margens), seletor no topo em telas estreitas; tokens de espaçamento vertical entre blocos e seções.
- [x] **T10** — Valores-p sem tracejado; nomes das variáveis nas equações e figuras com alternância notação × nomes (preferência do dispositivo).
- [x] **T11** — Relatório: proveniência no fim, sucinta (completa nos metadados); HTML, PDF e Word.
- [x] **T12** — Verificação: E2E dos menus, da tela inicial, do percurso (Voltar/Seguir, dependências, «Mostrar tudo»), da área de salvamento (local e Drive simulado) e do relatório; medição em 1920, 1200, 800 e 375 px nos seis temas; axe; verificação nativa no Windows 10; capturas «depois» ao lado das «antes»; reexecução dos percursos da auditoria (§9 do relatório) depois das T14–T22, com as capturas «depois» equivalentes às da auditoria.
- [x] **T13** — Documentação: DTs, guias (resultados, exportação, Drive, planilha de coleta) com as novas telas, ficha U18, CHANGELOG, matriz de cobertura.

### 5.1 Tarefas da auditoria de uso real (2026-11-02)

Análise da [auditoria de uso real](../auditoria-ux-v0.4-2026-11-02.md) (85 fichas) cruzada com o código de `feat/v0.4` (commit `4e60b4c`). A auditoria registra o resultado desejado; abaixo está **como** cada ponto será resolvido no código. Os grupos G01–G10 são os da auditoria (§8.1). Ficam nesta etapa os grupos de **fluxo e confiabilidade** (G01, G02, G04, G05, G09); o sistema visual, os seis temas e as figuras por família (G03, G06, G07, G08, G10) vão para a [ET27](../plano-v0.4.md#et27--acabamento-da-interface-e-da-exportação), que passa a vir logo depois desta. **Ordem: T14 e T15 (P1) primeiro**, depois T16–T22, depois T12 e T13.

**Divergência reconhecida (UX02).** A T07 foi entregue com os três cartões de rádio e um «Avançar» junto deles, não com uma ação de começar por opção, como o plano pedia. A auditoria confirma que o desenho pedido é melhor; a T17 corrige.

- [x] **T14 — Resultado confiável e contexto correto (G01, P1)** (*entregue em 2026-11-02; ver «Entregue» abaixo da tabela*). Nenhum resultado pode parecer corresponder a uma entrada que não o produziu, e nenhuma exclusão pode ser silenciosa.

  | Ficha | Causa no código | Mudança |
  |---|---|---|
  | UX42 (saturação) | `features/analysis/SaturationFit.tsx` guarda `result` em estado e só o troca em «Ajustar curva»; trocar modelo, fator ou resposta não o invalida | Guardar com o resultado a assinatura das entradas (`{factorId, responseId, model, dados}`); quando a assinatura atual difere, mostrar o resultado esmaecido com o aviso «resultado de Monod; ajuste de novo para Hill» (`role="status"`) e o botão de recalcular em destaque, ou limpar o resultado. Mesmo padrão do aviso `stale` dos resultados principais |
  | UX44 (potência) | `features/home/PowerCalculator.tsx`: mesma retenção de `result`; α = 2 vai ao motor e volta como erro sem código conhecido, mostrado como «Erro desconhecido do motor» | Assinatura das entradas como acima. Validação de domínio **antes** de chamar o motor (0 < α < 1, 0 < potência < 1, σ > 0, n ≥ 2, diferença ≠ 0), com mensagem junto do campo (`aria-invalid`, `aria-describedby`). No motor, garantir códigos específicos (`power.invalid_alpha` etc.) e textos em `diagnostics.json`; `engineErrorMessages` nunca deve cair no genérico para entrada inválida |
  | UX40 (mistura) | O motor emite `model.rank_deficient` com o parâmetro `aliased` (`models/linear.rs`), mas `MixtureAnalysis.tsx` renderiza o aviso sem os parâmetros, deixando `{{aliased}}` literal | Renderizar todos os avisos por `issueMessage(t, issue)` (que interpola); varredura em todo `features/` por `t(\`…${issue.code}\`)` sem parâmetros; teste unitário que falha se alguma tradução mostrada contiver `{{`. Explicar abaixo da tabela quais termos não são estimáveis e que o modelo ajustado é o estimável |
  | UX31 (texto falso) | `results.json` `summary.nextStepNoGroups` e `common.json` `home.availability.limited` ainda dizem que ANOVA/Tukey «ainda não foi entregue» | Reescrever em PT/EN apontando o caminho real («para comparar grupos, use Comparar tratamentos ou cadastre um fator e escolha a comparação na análise»); revisão de todas as mensagens de capacidade (`availability.ts` e textos `limited`); teste que procura «ainda não foi entregue»/«not yet delivered» nas traduções |
  | UX20 (ótimo) | `features/design/OptimalPanel.tsx` usa só fatores numéricos (`candidates = …kind === "numeric"`) sem avisar; `applyOptimal` deixa as colunas categóricas vazias na grade | Listar no painel os fatores **usados** e os **excluídos**, com o motivo («fator categórico: o ótimo D/I desta versão só trata fatores numéricos»). Ao usar nos dados, se houver categóricos, pedir uma decisão: repetir a proposta para cada nível (cruzamento), aplicar com a coluna vazia marcada como pendente, ou cancelar. A solução metodológica completa (ótimo com fatores categóricos) fica na ET25 |
  | UX23 (importação) | `features/import/mapping.ts` sugere **a última coluna numérica** como resposta (`i === lastNumeric`), ignorando que «Biomassa» já existe como resposta | Sugerir papéis pelo contexto: coluna cujo nome coincide com uma resposta já cadastrada → resposta; com um fator → fator; só então a heurística da última coluna. No resumo da prévia, destacar «resposta: Biomassa» e listar colunas que serão criadas ou substituídas; teste unitário com o CSV da auditoria |
  | UX25 (unidade) | O papel «unidade experimental» só existe numa coluna escondida em «Opções avançadas» (`showUnitColumn`); um **fator** chamado Unidade não é reconhecido; `pairing.ts` pede «informe a unidade» sem levar ao controle | Seletor explícito no painel de medidas repetidas: «Unidade experimental: [coluna da grade ▾ / fator Unidade]»; usar um fator como identificador de unidade sem copiá-lo; contagem de unidades, pares completos e incompletos antes do cálculo; a mensagem de erro traz o botão «Mostrar a coluna de unidade» que abre o bloco e foca a coluna |
  | UX26 (textos do método) | A introdução de `AnalysisSetup`/`MethodChoice` e o texto de α são fixos (DIC/Tukey, «todas as comparações de pares») | Textos derivados do método e do modelo escolhidos (chaves por procedimento: Tukey, Dunnett, Games–Howell, Bonferroni, Holm, Kruskal–Wallis/Dunn; DIC × DBC × multifatorial); um resumo «será comparado … sob o modelo …» antes do botão de calcular |
  | UX33 (equação codificada) | Na T10 a equação **codificada** passou a usar os nomes dos fatores (`SurfaceResults.tsx`, `equationFactors`), o que convida a inserir 30 e 6 onde vale 0 e 0 | A equação codificada usa sempre símbolos codificados (`x₁, x₂`, ou o nome com marca de codificação) e traz ao lado a transformação de cada fator («x₁ = (Temperatura − 30 °C) / 5 °C»); a opção nomes × notação passa a valer só para a equação em unidades reais e para `ŷ`. Botão «Copiar» por equação com o texto inequívoco |

  **Verificação:** um E2E por ficha reproduzindo o passo da auditoria (§9) e o estado corrigido; o teste de `{{` e o de textos de capacidade nas traduções.

  **Entregue (2026-11-02).** UX42/UX44: `SaturationFit` e `PowerCalculator` guardam a assinatura das entradas do resultado e mostram o aviso «outros valores» (`data-stale`, `saturation-stale`, `power-stale`); a potência é conferida antes do motor em `features/home/powerValidation.ts` (campo com `aria-invalid` e texto do código `power.*`). **Causa adicional descoberta:** 80 dos 192 códigos de problema do motor não tinham texto em `diagnostics.json` (toda a família `power.*`, `nonlinear.*`, `mixed.*`, `mixture.*`, `paired.*`, `export.*` e os erros de `design.*`), o que dava «Erro desconhecido do motor»; todos têm texto em PT/EN e o teste `i18n/diagnostics.coverage.test.ts` lê os fontes Rust e falha se surgir um código sem tradução. Quatro códigos tinham sufixo de plural do i18next e foram renomeados no motor (`data.too_few_observations`, `design.rcbd_too_few_levels`, `design.rcbd_too_many_levels`, `design.optimal_interactions_need_more_factors`); o parâmetro `kind` (tratamento/bloco) é traduzido em `issueMessage`. UX40: `MixtureAnalysis` usa `issueMessage` (interpola `aliased`), com teste de interpolação. UX31: textos de «próximo passo» e de disponibilidade reescritos, com teste que proíbe «ainda não foi entregue». UX23: `guessMapping(rows, header, known)` dá prioridade a colunas com o nome (sem acento, caixa e unidade) de respostas e fatores cadastrados; teste unitário. UX20: aviso dos fatores categóricos deixados de fora, confirmação ao usar o planejamento com colunas vazias e lembrete depois de aplicar (**o cruzamento com os níveis categóricos fica na ET25**, como previsto). UX33: equação codificada com `z₁, z₂…`, transformação `z₁ = (Temperatura − centro) / semiamplitude` e botões «Copiar». UX26: introdução e texto de α por procedimento (`analysis.compare.introFor.*`, `alphaHelpFor.*`). UX27: fator único já vem escolhido. UX25: seletor «Unidade experimental» (coluna da grade ou um fator) em medidas repetidas, com resumo de pares completos/incompletos; o fator-unidade sai dos efeitos fixos do modelo misto. **Fica para depois:** o resumo «será comparado … sob o modelo …» antes do botão (T20) e o papel «unidade» na planilha de importação (T19).

- [x] **T15 — Integridade da composição gráfica (G02, P1).** Nenhuma marca fora da área de dados, nenhuma nota cortada, nenhuma série ambígua — na tela e nos arquivos.

  | Ficha | Causa provável no código | Mudança |
  |---|---|---|
  | FG08 (Q–Q) | Em `services/charts/scatter.ts` a reta de referência é desenhada pela extensão dos quantis teóricos, sem recorte | Recortar a reta à caixa de dados (cálculo da interseção com os limites dos eixos) e aplicar `clip-path` à área de dados em **todas** as figuras de `services/charts` |
  | FG01 (Pareto) | `services/charts/pareto.ts` reserva altura fixa para a nota; com fonte 1,2 o texto passa da largura e é cortado | Medir e quebrar a nota em linhas pela largura disponível e pela escala de fonte (função comum `wrapText` em `svg.ts`), aumentando o `viewBox` em vez de reduzir o texto; redação «barra que ultrapassa a linha crítica»; cor da linha crítica por papel (`reference`) do tema |
  | FG03 (interações) | `services/charts/effects.ts` posiciona os rótulos dos níveis pela extremidade de cada curva sem evitar colisão | Legenda com amostra de linha/símbolo por nível ou rótulos com afastamento mínimo (algoritmo simples de separação vertical); níveis reais no eixo (ver T18/UX34) |
  | FG14/FG15, DS13 | Cada figura calcula margens próprias; aumentar a fonte só amplia os glifos | Função comum de layout de figura em `services/charts/svg.ts` (título, área de dados, eixos, legenda, nota dimensionados pelo conteúdo e pela escala de fonte); aplicar às famílias existentes |

  **Verificação:** teste unitário que, para cada família, confere que nenhum elemento de dados (`line`, `path`, `circle`) tem coordenadas fora da área de dados e que as notas cabem no `viewBox` com fonte 0,85, 1 e 1,2; PNG e PDF exportados conferidos para Pareto e Q–Q.

- [x] **T16 — Navegação única e previsível (G04: UX08–UX11, UX30, UX39; DS06).**
  - **Um só nível de blocos (UX08).** Hoje a etapa «Planejamento e dados» tem dois `GuidedBlocks` aninhados (`data-blocks` e `twolevel-blocks`) com dois pares Anterior/Seguir e dois contadores. Mudança: cada painel de planejamento (`TwoLevelPanel`, `CrdPanel`, `RcbdPanel`, `MixedPanel`, `MixturePanel`, `OptimalPanel`) passa a **exportar seus blocos** (um hook `useDesignBlocks(...)` que devolve `Block[]`) em vez de renderizar o próprio `GuidedBlocks`; a etapa monta uma lista única: Tipo de planejamento → blocos do painel → Matriz → Dados e respostas. Remove-se a prop `primary` e o modo `inner`.
  - **Etapa e bloco no mesmo par de ações.** No último bloco da etapa, «Seguir ›» vira «Avançar para Análise ›» (a ação da etapa) e o par «Voltar/Avançar» do rodapé some quando há blocos; no primeiro bloco, «‹ Anterior» volta à etapa anterior. Um só contador («Bloco 2 de 5 — Planejamento»).
  - **Bloqueios que levam ao requisito (UX09).** `workflow.blocked.*` e o aviso de dados passam a dizer o que falta **e** oferecer o botão que leva ao bloco certo (por exemplo «Cadastrar uma resposta» → bloco Respostas). O aviso de observações só aparece no bloco de dados.
  - **«Mostrar tudo» sem títulos duplicados (UX10).** `GuidedBlocks` só desenha `guided-title` quando o conteúdo não tem título próprio (prop `titled` por bloco). O rótulo diz o alcance: «Mostrar todos os blocos (em todas as etapas)».
  - **Retomar onde se estava (UX11).** Lembrar o bloco atual por experimento e etapa (`sessionStorage`, chave `optima.block.<experimento>.<etapa>`); com a matriz já gerada, a etapa de dados abre em «Dados e respostas».
  - **Resultado novo abre no resumo (UX30).** `SectionedResults` lembra a seção por **assinatura de resultado**: quando `state.result.signature` muda (cálculo novo), a seção ativa volta a «Resumo»; a memória global `optima.activeSection` só vale para o mesmo resultado.
  - **Estado de etapa coerente (UX39).** `features/workflow/guards.ts`: com mistura ajustada na própria Análise, «Resultados» não pode aparecer como concluída e bloqueada ao mesmo tempo; até a ET22 unificar, a etapa Resultados mostra a análise de mistura (o mesmo componente) em vez de ficar desabilitada.
  - **Largura útil (DS06).** Barra das etapas recolhível no computador (ícone e número quando recolhida); as seções dos resultados viram abas horizontais acima do conteúdo quando a barra das etapas está aberta, para não somar duas colunas de navegação.

- [x] **T17 — Tela inicial, arquivo e experimentos (G04/G09: UX02–UX07; DS10).**
  - **Uma ação por intenção (UX02, UX03).** `StartActions.tsx`: cada cartão vira um botão «Começar: Planejar experimento» etc., que escolhe o caminho e vai direto à etapa seguinte; sai o «Avançar» separado e o selo «Disponível nesta versão» (fica só quando algo estiver indisponível). Uma linha de exemplo de entrada/saída por cartão. Estado vazio de «Projetos recentes» em uma linha, com «Abrir exemplo» (projetos de `examples/` empacotados).
  - **Destinos de arquivo explícitos (UX04).** O menu «Mais» vira «Arquivo ▾» com seções «Neste computador» e «Google Drive», e o botão principal diz o destino atual («Salvar (baixar .enzitag)» no navegador; «Salvar» no Windows).
  - **Estado do arquivo compreensível (UX05).** O indicador único passa a três estados curtos: «Baixado às 19:37 — edições novas não estão no arquivo», «Alterações não salvas», «Salvo no Drive às …», com a recuperação local explicada no painel de detalhes.
  - **Vários experimentos (UX06, UX07).** `ExperimentBar` vira um seletor (lista suspensa com busca quando houver mais de cinco), com o original e a confirmação ligados («Confirmação de D»); o nome do experimento é editado no próprio item (sem o campo largo repetido). O documento guarda o experimento ativo (`currentId`, campo opcional) e reabrir volta a ele.

- [x] **T18 — Fatores, escolha e geração do planejamento (G05/G04: UX12–UX19; DS05, DS07).**
  - **Tipo inicial pela intenção (UX12).** `newFactor` em `state/project.ts`: no caminho «Planejar», o fator novo nasce **quantitativo**; em «Comparar tratamentos», categórico; texto curto de impacto do tipo.
  - **Cartões com contexto (UX13, DS05).** `FactorEditor`/`ResponseEditor`: título do cartão com o nome («Fator 2 — pH»); rótulos acessíveis completos («Unidade de pH»); «Remover» como ação secundária pequena (ícone + texto), não faixa de largura total.
  - **Níveis discretos de fatores numéricos (UX14).** O campo «Níveis» aparece também para fatores quantitativos (opcional, para níveis mistos e DIC/DBC com doses); `MixedPanel` aceita fator numérico com níveis informados; a orientação aponta para o campo que existe.
  - **Escolha do planejamento informada (UX15, UX17).** O seletor de família mostra, para a configuração atual, se cada família é **compatível** e o que exige («precisa de fator categórico com níveis»); Plackett–Burman com 2 fatores aparece com a ressalva de custo × informação ou só sob «mostrar alternativas».
  - **Texto e níveis da superfície (UX16).** A introdução do painel muda com o objetivo (triagem × superfície); para compostos centrais mostra os **extremos reais** que serão executados (±α em unidades) e avisa quando passam dos níveis informados.
  - **Composição do total (UX18).** Bloco de geração com «combinações × repetições + centrais = total» e explicação de réplica × repetição de leitura; a semente fica em «Reprodutibilidade» (recolhível).
  - **Da proposta à coleta (UX19).** Depois de gerar (e de «Usar este planejamento nos dados» no ótimo), botão «Preencher as respostas ›» que leva ao bloco de dados; a matriz e a grade mostram o mesmo número de ensaio.

- [x] **T19 — Grade de dados e importação (G05: UX21, UX22, UX24).**
  - `DataGrid`: colunas de fatores gerados com fundo distinto e somente leitura até «editar condição» (com aviso de que altera a proposta); respostas em destaque; «Remover linha» num menu de linha; cabeçalho da coluna de ações correto.
  - Erros: o resumo «n célula(s) com erro» vira lista com «ir para» cada célula; ausente intencional (vazio) diferente de inválido.
  - «Analisar dados existentes» permite começar **pelo arquivo**: botão «Importar arquivo» já na etapa de fatores e respostas; o cadastro sai da revisão das colunas; preencher respostas da matriz continua no modo «planilha de coleta».

- [x] **T20 — Configuração das análises (G04/G05: UX27–UX29).**
  - Com um único fator categórico elegível, ele já vem escolhido (`AnalysisSetup`), sem «—».
  - Contrastes: editor por nível («A: [ 1 ] B: [ −0,5 ] C: [ −0,5 ]») em vez de lista textual, com a soma conferida e a leitura «A − média(B, C)».
  - Configuração em blocos (resposta → método → modelo/blocos → contrastes → resumo); pareados e modelo misto oferecidos a partir da estrutura dos dados («há unidade medida mais de uma vez?»), e no modelo misto o fator usado como unidade sai da lista de efeitos fixos por padrão.

- [x] **T21 — Relatório, comentários e identidade da versão (G09: UX01, UX46–UX48).**
  - **Relatório sem instruções de interface (UX47).** Marcar com `data-report-skip` as ajudas interativas (por exemplo «Desmarque um efeito…» do `DesignModelPanel`/`ModelPanel`) e trocar por um parágrafo de método no relatório («modelo final: …; termos retirados: …»); evitar título órfão no fim da página (`keepNext`/`headlineLevel` no PDF e no Word).
  - **Exportação previsível (UX46).** O painel Exportar mostra «Vai exportar: análise X, idioma Y, figuras com a aparência Z» e separa preferências do dispositivo (idioma, CSV, paleta) da aparência por figura.
  - **Comentários com nomes reconhecíveis (UX48).** `useTargetLabel` e o seletor do `CommentsPanel` usam método + resposta + modelo/revisão + hora («Fatorial de Biomassa, modelo reduzido, rev. v4, 19:20»), mantendo o id em `title`.
  - **Versão em teste identificável (UX01).** `vite.config` injeta a versão do pacote e o commit (`__BUILD_COMMIT__`); «Sobre e atualizações» mostra interface, motor e compilação; durante a v0.4 a versão do pacote passa a `0.4.0-dev`.

- [x] **T22 — Telas pequenas e modais (G04/G10: UX49, UX50; DS12).**
  - Em < 800 px: etapas num seletor compacto no topo, experimento ativo numa linha, barra do arquivo recolhida num botão «Arquivo».
  - Tabelas largas com indicação de continuação horizontal (sombra na borda) e primeira coluna fixa (`position: sticky`).
  - Modais das Extras: título curto, rolagem só dentro do modal (`body` sem rolagem com `dialog[open]`), entradas e ação no topo e resultado abaixo; em < 600 px o modal ocupa a tela inteira.

## 6. Entregas

Relatórios completos com a barra de seções ativa; modo escuro legível; cabeçalho com menus; área de salvamento compacta; percurso guiado por blocos; tela inicial clara; layout largo; equações com nomes das variáveis; relatório que começa pelos resultados.

## 7. Critérios de conclusão

1. Relatórios HTML, PDF e Word do exemplo 14 trazem resumo, modelo, ANOVA, figuras e otimização **com a barra de seções ativa**.
2. Nenhuma opção dependente aparece antes da escolha de que depende; Voltar e Seguir funcionam por teclado; «Mostrar tudo» mostra a etapa inteira.
3. Potência e curvas de saturação abrem pelo menu «Extras»; histórico, motor e atualizações, pelo menu «Sobre e atualizações».
4. A área de salvamento cabe numa linha no computador; estado único e detalhes sob demanda.
5. axe sem violações nos seis temas; 375 px sem rolagem horizontal; E2E em cinco navegadores e verificação nativa no Windows 10 verdes.
6. Capturas «depois» arquivadas ao lado das «antes».
7. Fichas P1 da auditoria (G01 e G02: UX20, UX23, UX25, UX26, UX31, UX33, UX40, UX42, UX44, FG01, FG03, FG08) resolvidas, cada uma com teste que reproduz o passo da auditoria; as demais fichas resolvidas ou registradas com destino (ET27, ET22–ET25).

## 8. Verificação

vitest; E2E em Chromium, Firefox, WebKit, Chrome e Edge; axe; medição automática de layout; verificação nativa no Windows 10 (WebView2 por CDP, incluindo o relatório em Word e PDF); inspeção visual registrada.

## 9. Documentação a criar ou atualizar

DTs; guias de resultados, exportação, Drive e planilha de coleta; ficha U18; [mapa de módulos](../../arquitetura/mapa-modulos.md); CHANGELOG; matriz de cobertura; README das evidências com as capturas «depois».

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Percurso guiado esconder opções que usuários experientes querem ver | «Mostrar tudo» por etapa, lembrado no dispositivo |
| Mudança grande quebrar os E2E existentes (rótulos e ordem) | Migrar os E2E por etapa, mantendo os mesmos `data-testid`; rodar a suíte inteira a cada tarefa |
| Menus pouco acessíveis | Padrão de botão de menu com teclado e axe desde a T04 |
| Relatório voltar a depender da interface | T01 com teste que gera o relatório nas condições reais (barra ativa) |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado a partir dos pedidos do usuário e dos defeitos da v0.3.0. Etapa não iniciada. |
| 2026-11-02 | **Ativada** pelo usuário («Sim, começar ET29») na ramificação `feat/v0.4`. |
| 2026-11-02 | **T01 e T02 entregues.** Causa do relatório vazio: a barra de seções ativa escondia, por `hidden`, os blocos `data-section` do relatório montado fora da tela dentro da seção «Exportar»; agora `SectionedResults` ignora os blocos dentro de `[data-report-root]`. Teste `report-sections.spec.ts` (HTML, PDF e Word com a barra ativa iguais aos de «mostrar todas»; exemplo 14; axe da barra nos 6 temas): **falha sem a correção** (verificado) e passa com ela em Chromium, Firefox e WebKit. O item ativo usa `--color-on-action`. |
| 2026-11-02 | **T10 e T11 entregues**: equações com os nomes das variáveis (opção para ŷ e x₁, x₂ com legenda), valores-p sem tracejado, proveniência sucinta no fim do HTML, PDF e Word (completa nos metadados). **T04 (menus) e T06 entregues**: menus «Extras» (potência e curvas de saturação em janelas modais) e «Sobre e atualizações» (histórico, motor e atualizações); `Menu` e `Modal` novos em `features/menus`. Testes E2E adaptados com `tests/e2e/menus.ts`. |
| 2026-11-02 | **T05, T07, T08 (parcial) e T09 entregues.** Área do arquivo em uma linha (nome, Novo, Abrir, Salvar, menu «Mais» com Salvar como/cópia e Google Drive, um único indicador de estado com os detalhes sob demanda); tela inicial com o «Avançar» junto das três opções e «Abrir projeto» à direita; componente `GuidedBlocks` (um bloco por vez, Anterior/Seguir, lista lateral, bloco liberado só quando o anterior está pronto, blocos montados e só escondidos, «Mostrar tudo» compartilhado) aplicado às etapas; barra lateral das etapas e conteúdo lado a lado (largura máxima 1480 px), espaçamento entre blocos de 40 px. Por padrão os E2E veem tudo (`storageState`); `guided-flow.spec.ts` cobre o modo guiado (axe nos seis temas). 155 E2E em Chromium verdes. |
| 2026-11-02 | **Análise da auditoria de uso real** (85 fichas) cruzada com o código: tarefas **T14–T22** acrescentadas (§5.1), com a causa no código e a mudança de cada ficha; T14 e T15 (P1) primeiro. Sistema visual, temas e figuras por família (G03, G06, G07, G08, G10) passam ao escopo da ET27, que vem logo depois desta. |
| 2026-11-02 | **T14 entregue** (itens de confiabilidade da auditoria): ver «Entregue» na T14. Unitários 396+ verdes, E2E de potência e saturação estendidos; suíte completa em Chromium conferida antes do commit. |

## 12. Desvios e descobertas

- **T07 entregue diferente do pedido (2026-11-02).** A tela inicial ficou com três cartões de rádio e um «Avançar» junto deles, em vez de uma ação de começar por opção. A auditoria (UX02) confirma o desenho pedido; a correção está na T17.
- **Blocos aninhados (2026-11-02).** O planejamento de dois níveis tem um `GuidedBlocks` próprio dentro do da etapa, o que produz dois pares Anterior/Seguir (UX08). A T16 troca por uma lista única de blocos.

## 13. Auditoria de experiência de uso (2026-11-02)

A pedido do usuário, foi acrescentada a [auditoria por página/bloco no app real](../auditoria-ux-v0.4-2026-11-02.md), com **85 fichas de observação/recomendação (50 UX, 14 de sistema visual, seis de temas e 15 de figuras)**, percursos reproduzíveis, projeto salvo e [151 screenshots originais em duas rodadas](../../imagens/auditoria-ux-v0.4-2026-11-02/README.md). Usar como entrada para continuar T08, verificar T12 e orientar o acabamento, sem limitar a solução aos exemplos ou à estrutura atual.

A auditoria separa defeitos observados, oportunidades de apresentação e limitações já destinadas à ET22–ET26. Não modifica o estado das tarefas existentes nem certifica a etapa. As diferenças entre requisitos/checklists e a interface servida estão registradas como diferenças observadas, sem diagnóstico presumido da compilação.

## 14. Implementação da continuação (T15–T22)

A [DT-0027](../../decisoes-tecnicas/dt-0027-percurso-unificado-e-composicao-das-figuras.md) registra a decisão anterior ao código. Os painéis declaram blocos com metadados registrados num coordenador comum, em vez de mover seus estados para um hook único: há uma só lista/ações, sem navegação interna, e as entradas permanecem montadas. O comportamento pedido na T16 foi mantido.

- **T15:** recorte de dados em todas as sete famílias SVG, interseção da reta Q–Q, quebra por largura de título/notas com expansão da figura, margem do Pareto pelos nomes, legenda de interações por linha e nível real. Testes de composição em fonte 0,85/1/1,2; PNG/PDF Pareto e Q–Q.
- **T16/T08:** navegação única dos seis planejamentos e da análise, anterior/avanço entre etapas, blocos lembrados por projeto/experimento, retorno à grade quando há matriz; seção ativa por resultado, cálculo novo no Resumo. Mistura mantém o ajuste em memória entre Análise/Resultados com aviso de que a persistência segue na ET22.
- **T17:** ação própria nos cartões e exemplo empacotado; Arquivo com destinos; horário e edições posteriores; seletor/busca e origem da confirmação; seleção ativa opcional no projeto com fallback para arquivos antigos.
- **T18:** tipo inicial pela intenção; cartão com nome e unidade acessível; níveis também numéricos; requisitos/compatibilidade por família; ressalva PB com dois fatores; faixas reais da superfície pelo motor; semente recolhida; ação direta de coleta.
- **T19:** condições geradas protegidas até habilitação explícita, respostas destacadas, ações de linha em menu compacto, erro focável, importação desde Variáveis sem resposta provisória e papel Unidade no mapeamento.
- **T20:** configuração em blocos; contraste por nível com soma conferida e expressão; estrutura independente/repetida; unidade fora dos efeitos fixos por padrão; revisão de resposta/procedimento/modelo/α antes de calcular.
- **T21:** ajudas interativas fora do relatório e descrição do método/modelo/termos; proteção de títulos; resumo de exportação; comentários reconhecíveis; versão do pacote e commit na compilação/Sobre.
- **T22:** seletores compactos, Arquivo recolhido, tabelas roláveis com primeira coluna fixa; modal com rolagem isolada, campos limitados à largura e tela inteira em tamanho pequeno.

**Comentários adicionais do usuário no navegador:** separação do botão de recolher, centros verticais do seletor/ações do experimento, respiro introdução→blocos e largura da grade. Os blocos passaram para cima do conteúdo; bloco único não repete navegação; ações da linha usam «⋯». Medições nos seis temas a 1064×892 em `et29-review.spec.ts`. O refinamento de espaços solicitado foi executado nesta etapa, preservando os demais itens da ET27.

Registro por tarefa, resultados das verificações e limites no [relatório de execução](../../../validation/reports/et29/README.md); capturas no [README das evidências](../../imagens/evidencias-v0.4-et29/README.md). T12 encerrada: rodada completa, investigação dos casos falhos e delta final 115/115, com avaliação nativa no Windows 10; quantidades e limites no relatório.

## 15. Fechamento

ET29 concluída em 2026-11-02. T01–T22 verificadas conforme o relatório; limitações destinadas às ET27/ET22–ET25 permanecem explicitamente fora desta entrega. A execução da v0.4 continua pela ET27, autorizada no objetivo da sessão.
