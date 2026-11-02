# Plano da v0.4

**Estado:** planejado · **Criado em:** 2026-11-02 · **Versão-alvo:** v0.4.0 (canal experimental)

Plano de versão pedido pelo usuário em 2026-11-02, ao fechar a v0.3: «todas as outras pendências ficam para v0.4». Reúne **tudo o que as etapas ET13–ET21 da v0.3 deixaram sem entregar**, mais as verificações que dependem do usuário ou de equipamento externo, em etapas novas (ET22–ET29). A decisão e o que ficou na v0.3 estão em [decisões aprovadas §18](../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02); o que foi e o que não foi verificado na v0.3, no [relatório da v0.3.0](../../validation/reports/v0.3.0/README.md).

A v0.4 continua no **canal experimental**; a v1.0.0 (canal estável e cobertura completa do catálogo) mantém os critérios do [roteiro](roteiro-produto.md).

## 1. Objetivo

Ao final da v0.4:

1. a interface está reorganizada em menus e num **percurso guiado por blocos** (Voltar/Seguir, opções dependentes reveladas conforme a escolha), com melhor uso do espaço no computador;
2. os resultados de **misturas, modelos mistos, curvas de saturação e potência** ficam **guardados no projeto** (reabrir não recalcula) e entram nos relatórios (HTML, PDF e Word);
3. as famílias F09 têm as variantes avançadas que a v0.3 deixou de fora (covariâncias de medidas repetidas, perfil de verossimilhança, limites superiores em misturas, otimização no simplex, simulação de potência);
4. o Google Drive funciona também no aplicativo Windows, com fila persistente, e foi **verificado com contas reais**;
5. a interface foi revista tela a tela (espaçamento, capturas «depois», WebView2);
6. as verificações externas (Safari real, canal de atualização ponta a ponta, domínio próprio) estão feitas ou têm decisão registrada.

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
| Safari real; canal de atualização ponta a ponta; domínio próprio; caminho da edição simultânea; inventário das funções internas do Protimiza (PD-05) | ET20-T04, T05, T06; ET14-T02 (resto) | ET28 |

## 2.1 Defeitos encontrados na v0.3.0 publicada (2026-11-02)

Relatados pelo usuário ao usar a v0.3.0 com o projeto do [exemplo 14](../../examples/14-meios/README.md) (dados fictícios). **Decisão do usuário (2026-11-02): não haverá v0.3.1**; os dois defeitos são corrigidos **na v0.4, como primeiros itens da ET29** (tarefas T01 e T02), antes da reorganização da interface.

| Defeito | Causa (diagnosticada) | Correção prevista |
|---|---|---|
| **Relatório em PDF sem os resultados; Word sem as figuras** (só aparecem a proveniência e a otimização) | O relatório é montado fora da tela **dentro** da seção «Exportar» dos resultados. A barra de seções (`SectionedResults`) esconde todos os blocos `[data-section]` que não são o ativo, **inclusive os do relatório**, e a conversão para PDF/Word ignora o que está escondido. Os testes de relatório usam «Mostrar todas as seções» e por isso não pegaram o defeito (existe desde a v0.2, quando as seções foram criadas) | Ignorar os blocos dentro de `[data-report-root]` ao aplicar as seções; teste E2E que gera HTML, PDF e Word **com a barra de seções ativa** e confere que resumo, modelo e figuras estão no arquivo |
| **Modo escuro: o item ativo da barra de seções fica ilegível** (texto branco sobre fundo claro) | `.results-nav button.active` usa `color: #fff` fixo em vez do token `--color-on-action` do tema | Usar `--color-on-action`; axe da barra de seções nos seis temas com um item ativo |

## 3. Etapas

Os planos detalhados de cada etapa (`planejados/`) são escritos quando a etapa é ativada; abaixo ficam o escopo, a verificação esperada e as dependências. **Ordem:** ET29 → ET22 → ET23, ET24 e ET25 → ET26 → ET27 → ET28 (ET26 e ET28 dependem do usuário e podem correr em paralelo).

### ET29 — Reorganização da interface e da navegação (primeira da v0.4)

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
- **Depende de:** nada. A ET27 (acabamento) passa a vir depois dela.

### ET22 — Resultados das famílias novas guardados no projeto

- **Escopo:** campos opcionais do experimento para o resultado de cada análise nova (`mixtureResult`, `mixedModelResult`, `nonlinearResult`, `powerResult`), com assinatura de entrada como nas análises atuais; reabrir mostra o resultado guardado **sem recalcular** e avisa quando dados ou opções mudaram; resultados em seções com barra lateral; entrada nos relatórios HTML, PDF e Word; exportação CSV/XLSX das tabelas.
- **Verificação:** Rust (ida e volta do documento, validação das referências), WebAssembly × nativo (SHA-256 idêntico), E2E (salvar → reabrir sem recálculo), exemplos 07, 08, 11 e 12 reabrindo com o resultado.
- **Decisão técnica:** esquema 1 com campos opcionais (como `comments`); migração só se um campo exigir mudança incompatível.
- **Depende de:** nada (primeira da v0.4).

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
- **Verificação:** medição automática (E2E de layout) estendida, axe nos seis temas, inspeção visual registrada.
- **Depende de:** nada.

### ET28 — Verificações adicionais e itens que dependem do usuário

- **Escopo:** casos independentes (statsmodels) para a seleção de modelos de dois níveis em **fracionários e Plackett–Burman**; **Safari real** (Mac) e registro; **canal de atualização ponta a ponta** (publicar, rodar `channels.yml`, atualizar por canal); **domínio próprio** (se o usuário registrar; [DT-0026 §5](../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md)); **decisão do caminho da edição simultânea** ([especificação §9](../arquitetura/edicao-simultanea.md#9-perguntas-para-o-usuário-decisões-que-esta-especificação-não-toma)) e, se decidida, a etapa de implementação do caminho A; inventário das demais funções do Protimiza (PD-05).
- **Verificação:** evidências manuais registradas no relatório da v0.4.0.
- **Depende de:** usuário (Mac, domínio, decisões).

## 4. Dependências do usuário

| Pendência | Etapa | O que o usuário precisa fazer |
|---|---|---|
| Contas do Google para teste | ET26 | Disponibilizar uma ou duas contas de teste e executar o roteiro de verificação |
| Mac com Safari | ET28 | Disponibilizar um Mac ou aceitar que o Safari siga «não verificado» |
| Domínio próprio (PD-13) | ET28 | Decidir se haverá domínio e registrá-lo |
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
| Verificações externas (Safari, contas, domínio) sem data | Registradas como pendentes no relatório; não bloqueiam as etapas locais |
