# Plano da v0.4

**Estado:** **finalizado em 2026-11-02** — pronto para começar pela [ET29](ativos/et29-reorganizacao-da-interface-e-navegacao.md) · **Criado em:** 2026-11-02 · **Versão-alvo:** v0.4.0 (canal experimental)

Plano de versão pedido pelo usuário em 2026-11-02, ao fechar a v0.3: «todas as outras pendências ficam para v0.4». Reúne **tudo o que as etapas ET13–ET21 da v0.3 deixaram sem entregar**, mais as verificações que dependem do usuário ou de equipamento externo, em etapas novas (ET22–ET29). A decisão e o que ficou na v0.3 estão em [decisões aprovadas §18](../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02); o que foi e o que não foi verificado na v0.3, no [relatório da v0.3.0](../../validation/reports/v0.3.0/README.md).

A v0.4 continua no **canal experimental**; a v1.0.0 (canal estável e cobertura completa do catálogo) mantém os critérios do [roteiro](roteiro-produto.md).

## Auditoria exploratória de uso real (2026-11-02)

Complemento solicitado pelo usuário após experimentar a interface inicial da v0.4: [auditoria de experiência de uso por página/bloco](auditoria-ux-v0.4-2026-11-02.md), com **85 fichas de observação/recomendação (50 UX, 14 de sistema visual, seis de temas e 15 de figuras)**, prioridades, recomendações abertas ao agente executor, percursos reais de nove experimentos criados do zero mais uma confirmação gerada, projeto reabrível e [151 screenshots originais em duas rodadas](../imagens/auditoria-ux-v0.4-2026-11-02/README.md).

As recomendações devem orientar a continuação da ET29, a integração das famílias na ET22 e o acabamento da ET27. São achados exploratórios da compilação servida em `http://127.0.0.1:4173/`, com limites explícitos; não representam conclusão dessas etapas nem substituem suas verificações. A auditoria não altera decisões metodológicas ou impõe uma implementação fechada.

**Análise e destino (2026-11-02).** As fichas foram cruzadas com o código; cada uma tem destino e mudança prevista:

| Grupos da auditoria | Destino | Onde está a mudança no código |
|---|---|---|
| G01 resultado e contexto (P1), G02 integridade das figuras (P1) | ET29 T14 e T15 — **primeiro** | [ET29 §5.1](ativos/et29-reorganizacao-da-interface-e-navegacao.md#51-tarefas-da-auditoria-de-uso-real-2026-11-02) |
| G04 navegação, G05 fluxo de dados e análises, G09 projeto, relatório e versão | ET29 T16–T22 | idem |
| G03 base visual, G06 seis temas, G07 figuras por família, G08 otimização e confirmação, G10 conferência transversal | [ET27](#et27--acabamento-da-interface-e-da-exportação), que passa a vir **logo depois da ET29** | ET27 abaixo |
| Limitações de método já previstas (UX39 parte de mistura, UX41, UX43, UX45; ótimo com fatores categóricos de UX20; papéis «unidade» e «tempo» de UX25) | [ET22](#et22--resultados-das-famílias-novas-guardados-no-projeto)–[ET25](#et25--misturas-e-planejamentos-ótimos-avançados) | escopo dessas etapas, com nota abaixo |

## 1. Objetivo

Ao final da v0.4:

1. a interface está reorganizada em menus e num **percurso guiado por blocos** (Voltar/Seguir, opções dependentes reveladas conforme a escolha), com melhor uso do espaço no computador;
2. os resultados de **misturas, modelos mistos, curvas de saturação e potência** ficam **guardados no projeto** (reabrir não recalcula) e entram nos relatórios (HTML, PDF e Word);
3. as famílias F09 têm as variantes avançadas que a v0.3 deixou de fora (covariâncias de medidas repetidas, perfil de verossimilhança, limites superiores em misturas, otimização no simplex, simulação de potência);
4. o Google Drive funciona também no aplicativo Windows, com fila persistente, e foi **verificado com contas reais**;
5. a interface foi revista tela a tela (espaçamento, capturas «depois», WebView2);
6. o canal de atualização foi verificado ponta a ponta pelos dois canais e a decisão sobre a edição simultânea está registrada. **Domínio próprio e Safari real ficam fora** por decisão do usuário (GitHub Pages; sem Mac).

## 2. Itens pendentes e etapa responsável

| Item pendente | Origem (v0.3) | Etapa |
|---|---|---|
| Menus («Sobre e atualizações», «Extras» com potência e curvas de saturação), percurso guiado por blocos com Voltar/Seguir e opções dependentes, uso do espaço lateral, mais espaçamento, tela inicial sem «Avançar» ambíguo, valores-p sem tracejado, nomes das variáveis nas equações, proveniência no fim do relatório, **reorganização da área de salvamento** (menu «Arquivo», indicador único de estado, Drive discreto) | Pedido do usuário (2026-11-02), depois da v0.3.0 | [ET29](#et29--reorganização-da-interface-e-da-navegação-primeira-da-v04) (**primeira**) |
| Guardar no projeto os resultados de misturas, modelos mistos, saturação e potência (campos opcionais, esquema 1), mostrá-los em seções e levá-los aos relatórios | ET15-T09, ET17-T07, ET18-T07 | [ET22](#et22--resultados-das-famílias-novas-guardados-no-projeto) |
| Modelo misto: testes F de vários graus de liberdade, médias marginais e comparações; AR(1) e covariância não estruturada; papéis de coluna «unidade» e «tempo»; figuras de perfis | ET17-T04, T05, T07 | [ET23](#et23--modelos-mistos-e-medidas-repetidas-avançados) |
| Ajuste não linear: intervalos por perfil de verossimilhança; NIST StRD não linear; limites e valores iniciais editáveis; potência por simulação e para regressão, contrastes e efeitos de dois níveis | ET18-T02, T03, T05, T07 | [ET24](#et24--ajuste-não-linear-e-potência-avançados) |
| Misturas: limites superiores, traço de Cox, otimização restrita ao simplex; ótimos: blocos na ampliação, gráfico de variância de predição; estimabilidade em fracionários de níveis mistos | ET15-T04, ET16-T06, descobertas da ET15 | [ET25](#et25--misturas-e-planejamentos-ótimos-avançados) |
| Drive no Windows (loopback + PKCE + cofre), fila persistente, arquivo compartilhado real; **verificação com contas reais (usuário)** | ET19-T03, T05, T06, T08 | [ET26](#et26--google-drive-completo-e-verificado) |
| Revisão tela a tela dos componentes fora das classes comuns, capturas «depois», conferência no WebView2, documentação da ET21; capturas em inglês e temas no WebView2; família de fonte e hachura no PDF; editar um comentário enviado | ET21-T01, T04, T06, T07; ET12-T10; DT-0020; ET20 | [ET27](#et27--acabamento-da-interface-e-da-exportação) |
| Seleção de modelos de dois níveis: casos independentes para fracionários e Plackett–Burman | ET14-T03 (limite) | [ET28](#et28--verificações-adicionais-e-itens-que-dependem-do-usuário) |
| Canal de atualização ponta a ponta pelos dois canais; caminho da edição simultânea; inventário das funções internas do Protimiza (PD-05) | ET20-T06; ET14-T02 (resto) | ET28 |
| ~~Domínio próprio~~ (**não será usado**: GitHub Pages) e ~~Safari real~~ (**não será verificado**: sem Mac; o WebKit do Playwright continua no CI) | ET20-T04, T05 | — (decisão do usuário, 2026-11-02) |

## 2.1 Defeitos encontrados na v0.3.0 publicada (2026-11-02)

Relatados pelo usuário ao usar a v0.3.0 com o projeto do [exemplo 14](../../examples/14-meios/README.md) (dados fictícios). **Decisão do usuário (2026-11-02): não haverá v0.3.1**; os dois defeitos são corrigidos **na v0.4, como primeiros itens da ET29** (tarefas T01 e T02), antes da reorganização da interface.

| Defeito | Causa (diagnosticada) | Correção prevista |
|---|---|---|
| **Relatório em PDF sem os resultados; Word sem as figuras** (só aparecem a proveniência e a otimização) | O relatório é montado fora da tela **dentro** da seção «Exportar» dos resultados. A barra de seções (`SectionedResults`) esconde todos os blocos `[data-section]` que não são o ativo, **inclusive os do relatório**, e a conversão para PDF/Word ignora o que está escondido. Os testes de relatório usam «Mostrar todas as seções» e por isso não pegaram o defeito (existe desde a v0.2, quando as seções foram criadas) | Ignorar os blocos dentro de `[data-report-root]` ao aplicar as seções; teste E2E que gera HTML, PDF e Word **com a barra de seções ativa** e confere que resumo, modelo e figuras estão no arquivo |
| **Modo escuro: o item ativo da barra de seções fica ilegível** (texto branco sobre fundo claro) | `.results-nav button.active` usa `color: #fff` fixo em vez do token `--color-on-action` do tema | Usar `--color-on-action`; axe da barra de seções nos seis temas com um item ativo |

## 3. Etapas

Os planos detalhados de cada etapa (`planejados/`) são escritos quando a etapa é ativada; abaixo ficam o escopo, a verificação esperada e as dependências. **Ordem:** ET29 → ET27 → ET22 → ET23, ET24 e ET25 → ET26 → ET28 (ET27 subiu para logo depois da ET29 com a análise da auditoria, 2026-11-02) (ET26 e ET28 dependem do usuário e podem correr em paralelo).

### ET29 — Reorganização da interface e da navegação (primeira da v0.4)

**Plano detalhado:** [ativos/et29-reorganizacao-da-interface-e-navegacao.md](ativos/et29-reorganizacao-da-interface-e-navegacao.md) (tarefas T01–T22; T14–T22 vêm da [auditoria de uso real](auditoria-ux-v0.4-2026-11-02.md)).

Pedido do usuário em 2026-11-02, depois de usar a v0.3.0 publicada: «vamos implementar essas alterações na interface como primeiros itens na v0.4». Capturas «antes» em [`docs/imagens/evidencias-v0.3.0/`](../imagens/evidencias-v0.3.0/README.md). **É a primeira etapa a executar**, antes da ET22.

- **Primeiro, os defeitos da v0.3.0 ([§2.1](#21-defeitos-encontrados-na-v030-publicada-2026-11-02)):**
  - **T01 — Relatório completo com a barra de seções ativa** (PDF, Word e HTML com resumo, modelo, ANOVA, figuras e otimização), com teste E2E que gera os três formatos **sem** «Mostrar todas as seções» e com o exemplo 14.
  - **T02 — Item ativo legível no modo escuro** (token `--color-on-action`), com axe da barra de seções nos seis temas.
- **Depois, a reorganização (T03 em diante):**
  1. **Menus em vez de blocos soltos na página.** «Histórico de versões», «Motor científico» e a área de atualização (canal e *Verificar atualizações*) saem do fluxo e vão para um menu próprio no cabeçalho (por exemplo «Sobre e atualizações»). Um menu **«Extras»** reúne as ferramentas que não fazem parte do percurso de um planejamento: a **calculadora de potência e tamanho de amostra** e o **ajuste de curvas de saturação** (Monod, Haldane, Hill), que hoje aparece na etapa de análise de um DoE e tem outro objetivo.
  2. **Percurso guiado por blocos.** Em vez de uma página longa que se desce até achar a opção, cada etapa mostra **um bloco por vez** (por exemplo: tipo de planejamento → níveis → objetivo → opções → geração), com **Voltar** e **Seguir** por bloco e um indicador lateral da etapa e do bloco atual. **Opções que dependem de uma escolha anterior só aparecem depois dela.** Quem quiser ver tudo de uma vez mantém a opção «Mostrar tudo», como na barra de seções dos resultados.
  3. **Uso do espaço lateral no computador** (web e Windows, a maioria do uso): barra lateral fixa com o percurso (etapas e blocos) à esquerda e o conteúdo ao centro, em vez de uma coluna estreita com margens vazias; em telas estreitas a barra vira um seletor no topo.
  4. **Mais espaço entre blocos e seções** (tokens de espaçamento vertical maiores entre painéis e entre seções; títulos de bloco mais destacados).
  5. **Tela inicial:** o botão «Avançar» genérico se confunde com «Projetos recentes» e com as opções. Cada uma das três opções (planejar, analisar dados existentes, comparar tratamentos) ganha a **própria ação de começar**, e «Abrir projeto» fica separado e explícito; nada de «Avançar» solto abaixo de tudo.
  6. **Valores-p** sem o sublinhado tracejado (`.term-weak`): o destaque de «não significativo» passa a ser só texto.
  7. **Nomes das variáveis nas equações e figuras:** `ŷ` passa a ser o nome da resposta (por exemplo «Biomassa»), como os `x` já viraram os nomes dos fatores; uma opção de visualização alterna entre **notação (y, x₁, x₂)** e **nomes das variáveis**.
  8. **Relatórios:** a tabela de proveniência (versões, identificadores, configuração) sai do início e vai para o **fim**, de forma sucinta (as informações completas continuam no arquivo, por exemplo nos metadados); o relatório começa pelo que interessa ao usuário.
  9. **Área de salvamento e arquivo do projeto.** Hoje a barra do projeto empilha o nome, quatro botões, o painel do Drive aberto com três parágrafos de explicação e quatro linhas de estado («Sem alterações pendentes», recuperação automática, arquivo baixado, ligação com o Drive). Reorganizar em:
     - um **menu ou barra «Arquivo»** compacto no cabeçalho, com **Novo**, **Abrir** (do computador ou **do Drive**) e **Salvar** (no computador ou **no Drive**) como botões divididos, em vez de dois grupos de botões separados;
     - o **nome do projeto** editável no próprio cabeçalho;
     - **um único indicador de estado** (salvo / alterações pendentes / salvando), com os detalhes (recuperação automática, último arquivo, arquivo ligado do Drive) num painel que se abre ao clicar;
     - a **conexão com o Drive** como indicador discreto (conectado / desconectado, com Conectar e Desconectar no menu), e as explicações longas num «Saiba mais» em vez de sempre visíveis;
     - mensagens de resultado (por exemplo «arquivo criado na pasta EnziTAG Optima») como aviso temporário que não desloca o conteúdo.
- **Verificação:** E2E do percurso guiado (Voltar/Seguir, opções dependentes, «Mostrar tudo»), dos menus, da tela inicial e da área de salvamento (local e Drive simulado, estados e avisos); medição de espaçamento e largura em 1920, 1200, 800 e 375 px nos seis temas; axe; capturas antes e depois arquivadas.
- **Decisão técnica:** DT nova para a navegação por blocos e os menus (estado do bloco atual é da interface, não do projeto).
- **Tarefas da auditoria (T14–T22, 2026-11-02):** T14 resultado confiável e contexto correto (saturação e potência desatualizadas, `{{aliased}}` literal na mistura, texto falso sobre ANOVA/Tukey, fatores excluídos no ótimo, resposta errada na importação, unidade experimental, textos do método, equação codificada); T15 integridade das figuras (Q–Q fora da área, nota do Pareto cortada, rótulos das interações, layout comum de figura); T16 navegação única (sem blocos aninhados, último bloco leva à etapa seguinte, bloqueios com caminho, retomar o bloco, resultado novo abre no resumo); T17 tela inicial, arquivo e experimentos; T18 fatores e planejamento; T19 grade e importação; T20 configuração das análises; T21 relatório, comentários e versão em teste; T22 telas pequenas e modais.
- **Depende de:** nada. A ET27 (acabamento) passa a vir logo depois dela.

### ET22 — Resultados das famílias novas guardados no projeto

- **Escopo:** campos opcionais do experimento para o resultado de cada análise nova (`mixtureResult`, `mixedModelResult`, `nonlinearResult`, `powerResult`), com assinatura de entrada como nas análises atuais; reabrir mostra o resultado guardado **sem recalcular** e avisa quando dados ou opções mudaram; resultados em seções com barra lateral; entrada nos relatórios HTML, PDF e Word; exportação CSV/XLSX das tabelas.
- **Verificação:** Rust (ida e volta do documento, validação das referências), WebAssembly × nativo (SHA-256 idêntico), E2E (salvar → reabrir sem recálculo), exemplos 07, 08, 11 e 12 reabrindo com o resultado.
- **Decisão técnica:** esquema 1 com campos opcionais (como `comments`); migração só se um campo exigir mudança incompatível.
- **Da auditoria:** a análise de mistura e o resultado de saturação/potência devem aparecer na etapa Resultados como as demais análises (UX39, UX42–UX45); a assinatura de entrada que a T14 da ET29 cria para saturação e potência passa a ser a guardada no projeto.
- **Depende de:** ET29 (ordem; usa a nova navegação para as seções e os relatórios) e ET27.

### ET23 — Modelos mistos e medidas repetidas avançados

- **Escopo:** testes F de vários graus de liberdade (Kenward–Roger ou Satterthwaite multivariado, a avaliar), médias marginais estimadas e comparações a partir do modelo misto; covariâncias AR(1) e não estruturada; papéis de coluna «unidade» e «tempo» como tipos próprios; figuras de perfis individuais e médios.
- **Verificação:** `statsmodels` (`MixedLM`), implementação independente de AR(1) e, se instalado, R (`nlme`/`lme4`); estados de não convergência explícitos.
- **Depende de:** ET22 (guardar o resultado).

### ET24 — Ajuste não linear e potência avançados

- **Escopo:** intervalos por perfil de verossimilhança (com a verificação de que o perfil é unimodal); NIST StRD não linear (arquivos a obter); limites e valores iniciais editáveis na interface; potência por **simulação** e para regressão, contrastes e efeitos de dois níveis.
- **Verificação:** NIST StRD (valores certificados), SciPy, simulação com semente registrada e erro de Monte Carlo informado.
- **Depende de:** ET22.

### ET25 — Misturas e planejamentos ótimos avançados

- **Escopo:** misturas com **limites superiores** (poliedro) e traço de Cox; **otimização restrita ao simplex**; planejamentos ótimos com **blocos** na ampliação e **gráfico de variância de predição**; estimabilidade em fracionários de níveis mistos.
- **Verificação:** referências independentes em Python (busca exaustiva em problemas pequenos, `scipy.optimize`), exemplos novos.
- **Depende de:** ET22 (misturas guardadas).

### ET26 — Google Drive completo e verificado

- **Escopo:** autorização no aplicativo Windows (loopback + PKCE, credenciais no cofre do sistema; o segredo do cliente desktop só no segredo do GitHub); **fila persistente** de gravações pendentes; teste com arquivo compartilhado de verdade; compartilhar por leitura e criar cópia.
- **Verificação:** simulado (unidade e E2E) e **contas reais do usuário**. **Já feito:** conexão com uma **conta real do Google** e **Salvar no Drive** (criação de «Teste_Drive.enzitag» na pasta «EnziTAG Optima») verificados pelo usuário na versão web publicada em 2026-11-02. **Falta:** abrir do Drive pelo Picker, salvar de novo (atualizar o mesmo arquivo), expiração do token, desconectar e revogação, falta de permissão e duas cópias concorrentes (conflito), registradas como evidência manual.
- **Depende de:** usuário (contas de teste) e [DT-0025](../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md).

### ET27 — Acabamento da interface e da exportação

- **Escopo:** ET21-T01/T04/T06/T07 (inventário completo, componentes fora das classes comuns, capturas «depois» nos seis temas, PT/EN, 800 e 375 px, WebView2, DT e ficha U18); capturas em inglês e inspeção dos temas no WebView2 (ET12-T10); família de fonte e hachura no PDF ([DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)); **editar** um comentário já enviado; aviso sobre Option+Tab para usuários de Safari.
- **Escopo acrescentado pela [auditoria de uso real](auditoria-ux-v0.4-2026-11-02.md) (2026-11-02)** — grupos G03, G06, G07, G08 e G10. A ET27 passa a vir **logo depois da ET29**, antes das etapas de métodos, para que a base visual seja corrigida uma vez antes de as novas famílias criarem mais telas.
  - **Base tipográfica e de espaço (G03: DS01–DS03, DS07, DS08, DS13).** Em `themes/tokens.css`, papéis tipográficos nomeados (`--type-title`, `--type-subtitle`, `--type-label`, `--type-result`, `--type-help`) com tamanho, peso e entrelinha; cada tema os ajusta **opticamente** (Garamond, Geist, Host Grotesk etc.), em vez de todos usarem os mesmos números. Escala de espaçamento por relação: rótulo–campo 4–8 px, controles irmãos 8–12 px, grupos 16–24 px, seções 24–40 px (`--space-block` já criado na T09). Largura máxima de parágrafo (~70 caracteres) em ajudas e conclusões; texto alinhado à esquerda na interface; justificado só no relatório, com hifenização e conferência. Redação em camadas: cada bloco abre com finalidade e ação; método e algoritmo num «Saiba mais» (`<details>`); avisos que mudam a decisão (extrapolação, não estimável, excluídos, desatualizado) num componente de aviso próprio junto do resultado. Revisão das ajudas longas listadas em UX03, UX16, UX28, UX32, UX43, UX45.
  - **Números e tabelas (G05 visual: DS09, UX32, UX37).** Precisão de apresentação única (`i18n/format.ts`: significativos por papel — estatística 4, valor-p regra própria, médias pela unidade), valor completo no `title`; «≈ 0 (< 10⁻¹²)» para resíduos numéricos e «não disponível: 0 g.l.» em vez de números sem sentido; colunas numéricas alinhadas por casa decimal (`font-variant-numeric: tabular-nums`, alinhamento à direita); intervalos sem quebra (`white-space: nowrap`); «não aplicável», «não estimável» e «ausente» com marcas distintas; resumo sem repetir a lista de termos ativos.
  - **Botões, ações e estados (DS04, DS05, DS11, DS14).** Hierarquia ação principal × alternativa × manutenção × remoção com classes (`button`, `button secondary`, `button quiet`, `button danger-quiet`); ações por figura (formatos, personalizar, comentários) num único menu «Figura ▾»; geometria das abas de seção alinhada à dos botões de cada tema; estados selecionado, foco, desabilitado, aviso e pendência distinguíveis por texto e forma, não só por cor.
  - **Seis temas (G06: TM01–TM06).** Em cada `themes/<tema>.css`: Soft Light — reforçar limites de campos e reduzir azul repetido; Modern Dark — progressão de luminância fundo/painel/campo (sem preto absoluto), menos contornos claros, papéis de cor científica legíveis no escuro; Professional — compensação óptica dos títulos serifados e redundância traço/símbolo nas figuras; Industrial — sombras só em controles interativos, monoespaçada só em identificadores; Organic — planos com contraste discreto entre chão, cartão e campo; Clay — volume e rosa só na ação principal, raios menores em grades e figuras, pontos científicos com contorno. Conferência individual por tema (capturas «depois» ao lado das da auditoria).
  - **Figuras por família (G07: FG02, FG04–FG07, FG09–FG14).** Sobre a gramática comum criada na T15 da ET29: efeitos e interações com **níveis reais e unidades** (FG02/UX34); observado × predito com eixos iguais, reta de identidade evidente e resposta/unidade nos eixos (FG04); médias e boxplot com n e observações individuais quando n é pequeno, letras afastadas do intervalo e explicação do IC × comparação ajustada (FG05/FG06); resíduos com zero distinto e identificação do ponto ao passar o cursor (FG07); contorno com **escala de cor** ao lado e marcadores separados dos ticks (FG09); superfície 3D com malha visual mais rala que a de cálculo, ticks numéricos e rótulos fora da superfície (FG10); ternário maior, com graduações de fração, escala completa, vírgula decimal em PT e as mesmas ações das demais figuras (FG12/UX41); saturação nas cores do tema, unidades nos eixos e legenda da faixa de confiança (FG13/UX43); papéis de cor científica (`series`, `reference`, `uncertainty`, `grid`) nos tokens dos temas (FG14). Exportação: prévia que mostra a aparência neutra do arquivo (DT-0021) e conferência no tamanho final (FG15).
  - **Otimização e confirmação (G08: UX36–UX38, FG11).** `GoalsEditor` em decisões (objetivo → faixa/alvo → importância → limites obrigatórios), com uma frase-resumo do critério; candidatos com **empates** explícitos («5 candidatos com desejabilidade 1: escolha pela resposta prevista ou pela condição»), total encontrado × exibido, e ordenação explicada; mapa de desejabilidade com o número de cada candidato e a escala 0–1; uma só tabela que leva à proposta de confirmação; confirmação com a origem clicável e observado − previsto com unidade.
  - **Conferência transversal (G10).** Seis temas × PT/EN × 375/800/1200/1920 px × fonte 0,85/1/1,2, teclado e zoom de texto 200 %, na tela e nos arquivos exportados; capturas «depois» equivalentes às da auditoria em `docs/imagens/`.
- **Verificação:** medição automática (E2E de layout) estendida, axe nos seis temas, inspeção visual registrada; testes de figura (elementos dentro da área de dados, notas dentro do `viewBox`) em todas as famílias; capturas «depois» de cada tema e de cada família de figura ao lado das da auditoria.
- **Depende de:** ET29 (navegação e layout de figura comum da T15).

### ET28 — Verificações adicionais e itens que dependem do usuário

- **Escopo:** casos independentes (statsmodels) para a seleção de modelos de dois níveis em **fracionários e Plackett–Burman**; **canal de atualização ponta a ponta** pelos dois canais (com a v0.4.0 publicada: atualizar um 0.3.0 pelo canal experimental e confirmar que o estável não oferece versões); **decisão do caminho da edição simultânea** ([especificação §9](../arquitetura/edicao-simultanea.md#9-perguntas-para-o-usuário-decisões-que-esta-especificação-não-toma)) e, se decidida, a etapa de implementação do caminho A; inventário das demais funções do Protimiza (PD-05).
- **Verificação:** evidências manuais registradas no relatório da v0.4.0.
- **Depende de:** usuário (decisão da edição simultânea; capturas do Protimiza, se quiser cobertura integral).

## 4. Dependências do usuário

| Pendência | Etapa | O que o usuário precisa fazer |
|---|---|---|
| Contas do Google para teste | ET26 | Disponibilizar uma ou duas contas de teste e executar o roteiro de verificação |
| ~~Mac com Safari~~ | — | **Decidido (2026-11-02):** não haverá Mac; o Safari real segue «não verificado» e o WebKit do Playwright continua no CI |
| ~~Domínio próprio (PD-13)~~ | — | **Decidido (2026-11-02):** não será usado; o endereço é o do GitHub Pages |
| Caminho da edição simultânea (PD-14) | ET28 | Responder às perguntas da §9 da especificação |
| Arquivos NIST StRD não lineares | ET24 | Autorizar o download ou fornecê-los |
| Funções internas do Protimiza (PD-05) | ET28 | Enviar capturas das telas ainda não vistas, se quiser cobertura integral |

## 5. Princípios que continuam valendo

Os da [v0.3](plano-v0.3.md#5-princípios-que-continuam-valendo): cálculo só no núcleo Rust, referência independente para todo método novo, esquema do projeto aditivo, PT/EN, seis temas, teclado, axe e 375 px em cada tela nova, Windows 10 Pro e `windows-latest` como plataformas verificadas. **Windows 11 não será validado** (decisão do usuário).

## 6. Critérios de lançamento da v0.4.0

1. ET22–ET29 concluídas, ou itens não entregues registrados com destino e aprovados pelo usuário.
2. Todo método novo com caso de validação independente e paridade WebAssembly × nativo; resultados novos guardados no projeto sem recálculo ao reabrir.
3. Projetos da v0.1 a v0.3 abrem sem perda.
4. CI verde (Rust, web, E2E em cinco navegadores, Tauri Linux e Windows); verificação nativa no Windows 10, **incluindo os fluxos novos**.
5. Instalador assinado para o atualizador, instalado, executado e desinstalado; atualização a partir da v0.3 verificada **pelos dois canais**.
6. Relatório de validação da v0.4.0 com o que foi e o que não foi verificado.
7. Publicação (etiqueta, release e Pages) **somente por decisão expressa do usuário**.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Guardar resultados novos exigir mudança incompatível do esquema | Campos opcionais; decisão técnica e migração testada antes de qualquer mudança incompatível |
| Covariâncias AR(1) e não estruturada com convergência frágil | Estados de não convergência explícitos; limites e inicialização documentados |
| Perfil de verossimilhança e simulação lentos no navegador | Execução em *worker* com cancelamento e medição prévia dos limites |
| Drive no Windows depender de credenciais e do cofre do sistema | Segredos só no GitHub; cofre abstraído atrás de uma interface testável |
| Verificações com conta real do Google sem data | Registradas como pendentes no relatório; não bloqueiam as etapas locais |
| Reorganização da interface (ET29) quebrar os E2E das etapas seguintes | ET29 primeiro; `data-testid` mantidos; suíte inteira a cada tarefa |

## 8. Início das implementações

O plano está **finalizado**. As implementações começam pela **ET29** assim que o usuário der o «go» para ativá-la: o plano detalhado sai de `planejados/` para `ativos/`, e as tarefas seguem a ordem T01 (relatório completo) → T02 (modo escuro) → T03–T13 (reorganização). Nada da v0.4 depende de ação do usuário para começar; as dependências do usuário (§4) só afetam a ET26 (contas do Google) e a ET28 (edição simultânea, Protimiza). O trabalho é feito numa ramificação própria (`feat/v0.4`) com PR para `main`; publicação só com decisão expressa do usuário (§6, critério 7).
