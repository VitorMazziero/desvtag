# Histórico de mudanças

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O produto segue versionamento semântico; a `0.x` é o **canal experimental**.

## Pendências e escopo da verificação

- Aceite do Google Drive com contas reais em web e Windows, publicação da nova URL e verificação dos canais de atualização. As decisões sobre edição simultânea e cobertura do Protimiza seguem no [plano da v0.4](docs/planos-execucao/plano-v0.4.md).
- Windows 11: a validação não será realizada (decisão do usuário, 2026-11-02).

## [0.4.1] — em preparação

- A tela inicial deixa de ter o cartão «Projetos recentes». Os exemplos (01–04 e 06–19) abrem por **Extras → Exemplos**, em uma janela com título e descrição de cada um. No Windows, os projetos recentes passam para o menu **Arquivo**.

## [0.4.0] — 2026-11-08

- A identidade da versão passa a ser **DesvTAG**. O cabeçalho, a aba do navegador, Sobre e os novos relatórios e exportações usam a nova marca. Novos arquivos de projeto usam `.desvtag`, e a abertura de arquivos históricos `.enzitag` continua disponível. Sobre credita o desenvolvimento a Vítor Teixeira Mazziero.
- Sessões não salvas da v0.3 restauram também a análise arquivada, com os campos de navegação ausentes preenchidos na abertura.
- Dunnett reaproveita a integral comum às comparações. No ensaio WASM de 64 tratamentos, o tempo caiu de 51,3 s para 31 ms no caso balanceado e de 44,5 s para 151 ms no desbalanceado.
- Dunnett refina a quadratura para controles pequenos frente aos tratamentos. O ajuste corrige valores-p ajustados e intervalos simultâneos em desbalanceamento extremo.

### Integridade dos planejamentos ótimos (ET25)

- Trocas D/I em desenhos saturados avaliam a informação do desenho substituído quando a remoção isolada é singular.
- A avaliação pública de desenhos recusa dimensões incorretas, valores não finitos e pontos fora da região. Pontos admissíveis fora da malha continuam aceitos.
- O resultado distingue término sem troca melhor de limite de passagens e informa tentativas, sucessos, falhas, recuperações e avaliações. Resultados anteriores continuam legíveis.
- Campos numéricos do painel seguem a altura comum dos controles. Cartões, rótulos e explicações das restrições se adaptam a telas estreitas e texto ampliado.

### Misturas e planejamentos ótimos avançados (ET25)

- Misturas aceitam limites superiores e incluem traços de Cox e otimização de desejabilidade no simplex restrito.
- Ampliação de superfícies preserva blocos. Planejamentos D/I aceitam fatores categóricos e apresentam variância de predição e diagnóstico de estimabilidade e confundimento.
- Novos exemplos incluem mistura limitada e ótimo de níveis mistos em blocos. Os projetos preservam revisões, previsões e referências para relatórios e figuras.

### Google Drive (ET26)

- O Windows autoriza no navegador e guarda a credencial no cofre do sistema. A fila de gravação persiste entre sessões e retoma o envio quando a conexão volta.
- É possível abrir arquivos compartilhados, compartilhar para leitura, salvar cópia e recuperar alterações em caso de conflito ou arquivo remoto removido.
- Os fluxos foram verificados com simulação em web e Windows. O aceite com contas reais segue o [roteiro da ET26](docs/planos-execucao/ativos/et26-google-drive-completo-e-verificado.md#10-roteiro-de-aceite-com-contas-reais-t07--t08).

### Interface e exportação (ET24)

- Tela inicial adapta cartões e recentes à largura disponível e ao tamanho do texto; resumo de potência prioriza o resultado e separa prosa de números.
- Perfis inconclusivos sem pontos suficientes preservam os dados fonte sem desenhar painéis vazios; aviso de inferência indisponível aparece no resumo.
- Relatórios preservam todas as linhas e colunas; PDF/Word dividem tabelas largas em partes com referências de linha, fonte de pelo menos 9 pt e cabeçalhos legíveis. PDF mantém títulos e legendas com a primeira linha.
- Apresentação de números extremos usa notação científica; valores completos permanecem nos arquivos de dados e nas dicas. Plurais de potência corrigidos em português e inglês.

### Execução e cancelamento (ET24)

- Cancelamento por canal preserva operações independentes de arquivo; duas filas limitam concorrência e permitem recuperar o worker após falha.
- Windows limita globalmente a execução por classe e aguarda o término real do cálculo antes do próximo, mesmo após descartar a resposta cancelada.
- Potência e saturação mostram falhas de execução, preservam o histórico e cancelam ao fechar ou trocar de destino.

### Integridade científica (ET24)

- Ajuste não linear exato preserva estimativas e curva e informa inferência indisponível, com correlação vazia serializável.
- Potência avançada preserva resultados em mudanças extremas de unidade; arquivos recusam contagens, erros/intervalos de Monte Carlo e graus de liberdade contraditórios, sem recalcular ao abrir.
- Tabelas de resultados com rolagem recebem foco pelo teclado.

### Desempenho e limites de execução (ET24)

- Perfis não lineares reutilizam inícios e buffers. A estimação REML reutiliza a preparação por unidade e calcula a inversa completa onde ela é necessária.
- A busca por precisão usa a semiamplitude. Uma precisão válida permanece disponível quando a potência analítica ou a simulação fica indisponível.
- Novos ajustes não lineares e mistos avançados têm limites de dimensão e trabalho. O aplicativo distingue um ajuste incompleto de um ajuste concluído com inferência parcial. Projetos históricos acima dos novos limites abrem com seus resultados salvos.
- PDF e Word são gerados em worker, com cancelamento. Relatórios extensos montam as tabelas em partes e preservam as células.
- Graus polinomiais fora da faixa suportada recebem erro explícito.

### Não linear avançado (ET24)

- Corrigidas caudas não centrais para efeitos extremos e orçamento explícito: falha numérica preserva o resultado anterior; espaçamento entre campos, ação e avisos dos Extras reconferido nos três navegadores.
- Inícios/limites positivos editáveis, validação por campo e domínio validado no Rust; opções/resultados preservados no histórico.
- Perfis de verossimilhança gaussianos com IC LR assintótico, estados de cada extremo, pontos fonte e figuras exportáveis. Unimodalidade conferida na região examinada; faixa delta/Wald da curva identificada separadamente.
- Referência NIST Misra1d e quatro perfis independentes, incluindo Monod/Haldane/Hill, com paridade WASM. [Verificação e aceite local](validation/reports/et24/README.md).

- Dois exemplos criados pelo aplicativo e preservados no formato de projeto: NIST Misra1d com perfil e potência de contraste com simulação.

### Medidas repetidas avançadas (ET23)

- Colunas e papéis de unidade/tempo em importação, grade, CSV/XLSX e revisões; identidades sem colisões e ordem temporal explícita.
- Extensão científica v2 no Rust: REML CS/AR(1)/UN, hipóteses conjuntas e graus de liberdade de Fai–Cornelius, médias marginais/ajustes, referências de covariáveis e perfis com IC. UN marginal não recebe ICC/BLUP redundantes; falhas não trocam a estrutura pedida.
- Configuração, resultados históricos, fontes das figuras e relatórios persistidos; nomes dos alvos de comentários compartilhados entre tela e relatório. Exemplo sintético 15 produzido pelo app real.
- Sete casos independentes NumPy/SciPy, testes de entradas adversas, WASM/nativo e percursos nos três navegadores/seis temas. [Evidências e limites da verificação](validation/reports/et23/README.md).

### ET29 — interface e confiabilidade

- Percurso com um só conjunto de blocos e ações por etapa, memória de navegação na sessão e cálculo novo abrindo o Resumo; painéis de todas as famílias divididos em configuração, geração e matriz.
- Objetivo tem blocos selecionáveis que habilitam um único botão **Começar**. A área Arquivo mostra destino e horário de salvamento. O seletor de experimentos preserva a seleção em projetos compatíveis.
- Condições geradas protegidas, grade com largura útil e ações compactas, importação desde Variáveis, contraste por nível e revisão do método/modelo antes do cálculo.
- Recorte de marcas e reta Q–Q; títulos/notas que ganham espaço; Pareto com margem pelos nomes e interações com legenda própria e níveis reais. Relatórios sem ajuda interativa, com método/termos, identidade de versão/commit e comentários reconhecíveis.
- Espaçamentos e alinhamentos revistos a partir dos comentários no navegador; etapas compactas, tabelas roláveis e modais com rolagem isolada em telas pequenas.
- Resultados antigos sinalizados, validação da potência, mensagens do motor traduzidas, contexto na importação, equação codificada e seletor de unidade experimental.

Registro de implementação, avaliação por tarefa e limites no [relatório da ET29](validation/reports/et29/README.md).

### Acabamento visual, figuras e confirmação (ET27)

- Hierarquia e espaçamento ajustados nos seis temas; números com valor completo acessível e estados de indefinição distintos; tabelas sem quebra de números/intervalos.
- Menu Figura com prévia neutra, exportação e personalização; fontes Serif/Mono incorporadas e hachura vetorial preservada no PDF. Ternário e saturação usam as mesmas ações.
- Figuras com unidades, observações/n, eixos iguais no observado×predito, escala de cor e malha 3D legível. Otimização explicita critério, contagem/empates e candidatos no mapa 0–1; uma tabela também seleciona a confirmação.
- Origem da confirmação consultável na revisão original e diferença observado−previsto calculada pelo motor. Comentários editáveis com histórico preservado e horário da edição.

Avaliação ampliada e nativa concluída, com falhas iniciais, reconferências e limites registrados no [relatório da ET27](validation/reports/et27/README.md).

### Resultados guardados das famílias novas (ET22)

- Mistura, pareado/modelo misto, saturação e potência guardam entradas, revisão, assinatura, proveniência e resultados; abrir o projeto não recalcula. Configurações em edição ficam separadas dos registros calculados, inclusive quando inválidas.
- A etapa Resultados permite alternar entre famílias e consultar cálculos anteriores. Figuras, tabelas, comentários e relatórios usam o registro consultado e seus nomes/unidades históricos. Um novo cálculo abre no Resumo.
- HTML/PDF/Word completos, CSV/XLSX com precisão do motor e motivos de indefinição; coeficientes, componentes de variância e efeitos previstos por unidade. Exemplos 07/08/11/12 passam a trazer resultados.
- Resposta tardia permanece no experimento de origem; época do projeto evita gravar em um projeto substituído. O instante de criação da interface usa a hora real. A inicialização preserva a recuperação anterior até o usuário decidir.

Verificação por requisito, regressões, falhas corrigidas e Windows 10/WebView2 no [relatório da ET22](validation/reports/et22/README.md).

## [0.3.0] — 2026-11-02

> **Publicada em 2026-11-02**: versão web (https://vitormazziero.github.io/enzitag-optima/), etiqueta `v0.3.0` e release do instalador (publicado pelo usuário). A **atualização no aplicativo a partir da 0.2.0 foi verificada** pelo usuário. [Registro de publicação](docs/distribuicao/publicacao.md#registro-da-publicação-da-v030-2026-11-02).

Ver o [plano da v0.3](docs/planos-execucao/plano-v0.3.md) e o [relatório de validação](validation/reports/v0.3.0/README.md). O escopo foi fechado em 2026-11-02: o que não foi entregue vai para a [v0.4](docs/planos-execucao/plano-v0.4.md).

**Limitação conhecida:** os resultados de misturas, modelos mistos, curvas de saturação e potência são **calculados ao pedir** e **não são guardados no projeto** nem entram nos relatórios; os dados e as opções ficam guardados, e a análise é refeita ao pedir. Fica para a v0.4.

### Seleção de modelos de efeitos de dois níveis (ET14-T03) e conferência do CCD (ET14-T02)

- Na análise de um planejamento de dois níveis, a seção **Modelo** compara o modelo completo (efeitos principais e todas as interações de dois fatores), o atual e o recomendado (eliminação regressiva com hierarquia), com os mesmos critérios da seleção de superfícies (`R²` ajustado e predito, AICc, BIC, falta de ajuste). Validado contra o `statsmodels` em 4 fatoriais completos; **sem caso independente para fracionários**. [Método](docs/metodos/selecao-de-modelos.md).
- A opção «CCD» do serviço de referência, conferida nas capturas, é o **fatorial completo com pontos centrais** (`r·2^k + cp`, sem pontos axiais); o aplicativo reproduz as contagens (27 e 19 ensaios para 4 fatores) e a matriz.

### Exemplos novos

- Também [09 — níveis mistos](examples/09-niveis-mistos/README.md), [10 — planejamento D-ótimo](examples/10-planejamento-otimo/README.md), [11 — medidas repetidas](examples/11-medidas-repetidas/README.md), [12 — potência](examples/12-potencia-e-tamanho-de-amostra/README.md) e [13 — planilha de coleta](examples/13-planilha-de-coleta/README.md), todos conferidos contra NumPy, SciPy ou `statsmodels` e abertos em teste E2E.

### Correções

- A estatística `W` do Wilcoxon aparecia como «−0» quando era zero.
- O aplicativo Windows recusava exportar `.docx` (a lista de extensões do comando de exportação não o incluía).

### Exemplos novos

- [07 — Misturas e Scheffé](examples/07-misturas-scheffe/README.md) e [08 — Curva de saturação de Monod](examples/08-saturacao-monod/README.md): dados sintéticos, projeto `.enzitag` e resultados conferidos contra NumPy e SciPy (teste E2E que abre o projeto e confere os coeficientes).

### DOCX, comentários, canais e WebKit (ET20)

- **Relatório em Word (.docx):** novo botão *Exportar relatório (Word)* com as mesmas seções do HTML e do PDF (proveniência, interpretação, listas, **tabelas editáveis**, figuras em PNG, logotipo opcional e «Página X de Y»), gerado no próprio dispositivo. Conferido por testes, por E2E em navegador real e pela abertura no **LibreOffice**; **não aberto no Word**. [Guia](docs/guias/exportacao.md), [DT-0026](docs/decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md).
- **Comentários de revisão:** na figura, no experimento ou numa análise; respostas, resolver e reabrir; cada um registra a **revisão dos dados** em que foi escrito e é salvo no projeto (campo opcional `comments`, esquema 1). Opcionais nos relatórios (HTML, PDF e Word). [Guia](docs/guias/comentarios.md). Também por **tabela** de resultados. Sem edição de comentário enviado.
- **Canais de atualização** experimental e estável: manifesto assinado por canal, fluxo `channels.yml` após a publicação do release e escolha do canal nas preferências do aplicativo Windows. O canal estável não tem versões até a 1.0.0; **fluxo não verificado com um release real**. [Publicação](docs/distribuicao/publicacao.md).
- **WebKit** (motor do Safari) no Playwright e no CI: a suíte E2E inteira passa nele. **Safari real não foi verificado** (sem Mac); no Safari o Tab não percorre links por padrão (use Option+Tab). **Domínio próprio:** não feito (sem decisão do usuário).
- **Especificação da edição simultânea** (sem implementação): [operações, conflitos, presença, transporte e verificação](docs/arquitetura/edicao-simultanea.md), com as decisões pedidas ao usuário.

### Google Drive (ET19)

- **Google Drive opcional na versão web:** conectar (Google Identity Services, escopo `drive.file`), **Salvar no Drive** na pasta «EnziTAG Optima», **Abrir do Drive…** pelo Picker e desconectar. Os scripts do Google só carregam ao clicar em Conectar; o token fica só na memória. Se o arquivo foi alterado no Drive depois da sua leitura, ele **não é sobrescrito**: seu trabalho vai para uma cópia ao lado. [Guia](docs/guias/google-drive.md), [DT-0025](docs/decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md). **Testado com Google simulado; autorização real não verificada; versão para Windows ainda sem Drive.**

### Curvas de saturação e potência (ET18)

- **Ajuste não linear** de **Monod / Michaelis–Menten, Haldane (inibição pelo substrato) e Hill** por Levenberg–Marquardt com vários inícios, intervalos de Wald, correlação entre parâmetros, avisos de **identificabilidade** e curva com faixa de confiança; validado contra o `scipy.optimize.curve_fit`. [Método](docs/metodos/ajuste-nao-linear.md). Sem intervalos por verossimilhança perfilada e sem NIST StRD.
- **Calculadora de potência, tamanho de amostra e precisão** na tela inicial (ANOVA de um fator e testes t) com **F e t não centrais** exatos, validados contra o SciPy (220 pontos das distribuições e 9 casos). [Método](docs/metodos/potencia.md). Sem simulação. Os resultados são calculados ao pedir e não são guardados no projeto.

### Medidas repetidas e modelos mistos (ET17)

- **Comparação pareada**: t pareado (intervalo e `d_z`) e **Wilcoxon** (exato ou aproximação normal com correção de empates), validados contra o SciPy. Os pares vêm da unidade experimental; unidades incompletas são listadas, nunca imputadas. [Método](docs/metodos/comparacoes-pareadas.md).
- **Modelo linear misto** com intercepto aleatório por unidade (simetria composta), por **REML**, com componentes de variância, ICC, BLUPs e graus de liberdade de **Satterthwaite**; validado contra `statsmodels`, contra uma implementação independente do Satterthwaite e contra a ANOVA de medidas repetidas (graus de liberdade exatos nos balanceados). [Método](docs/metodos/modelos-mistos.md). **Sem** AR(1), covariância não estruturada nem testes F multi-gl; os resultados são calculados ao pedir e **não são guardados no projeto**.

### Planejamentos ótimos (ET16)

- **Planejamento D e I-ótimo** por troca de Fedorov sobre uma malha de candidatos, com **restrições lineares** entre os fatores e **ampliação** que mantém os ensaios já realizados; relata eficiências D, A e G e a variância média de predição, e informa em quantos inícios o melhor valor foi alcançado. Validado contra NumPy e contra a busca exaustiva em 6 problemas pequenos. [Método](docs/metodos/planejamentos-otimos.md). **Sem garantia de ótimo global**; a análise posterior é a de superfície de resposta.

### Níveis mistos (ET15)

- **Misturas**: simplex-lattice `{q, m}` e simplex-centroide com limites inferiores (pseudocomponentes), repetições e pontos centrais extras; modelos de **Scheffé** (linear, quadrático e cúbico especial) sem intercepto com ANOVA centrada, e **gráfico ternário** para três componentes. Validados contra `itertools` e `statsmodels` (11 casos). [Método](docs/metodos/misturas.md). Sem limites superiores, sem otimização no simplex e **a análise de misturas não é guardada no projeto** nem entra nos relatórios.
- **Fatorial completo de níveis mistos**: dois a oito fatores com números de níveis diferentes, repetições, aleatorização com semente e planilha de coleta; análise pela ANOVA multifatorial. Geração validada contra a implementação independente em Python (6 casos; Rust e WebAssembly). [Método](docs/metodos/niveis-mistos.md). 

### Atualização e verificação (ET14)

- O aviso de atualização mostra as **notas de versão formatadas** (títulos, listas, tabelas e links https, sem HTML); o manifesto e o release trazem só a seção da versão no CHANGELOG, cortada em limite de bloco.
- Sementes de aleatorização limitadas a 0–2⁵³ − 1 na interface ([DT-0024](docs/decisoes-tecnicas/dt-0024-sementes-no-navegador-e-pdf-sem-novas-fontes.md)).
- Novos: [guia dos resultados](docs/guias/resultados.md), capturas PT/EN dos seis temas e verificação da versão web publicada em quatro navegadores (`app/web/tests/public`).

### Interface (ET21)

- Botões com mais espaço: 16 px entre botões vizinhos e 8 px entre linhas (eram 8 px e 4 px na barra de seções); altura mínima de 40 px (36 px no botão pequeno, que era 32 px). Um teste mede as distâncias nos seis temas e em 1200 e 375 px ([DT-0023](docs/decisoes-tecnicas/dt-0023-espacamento-dos-controles-logo-unico-e-rolagem-entre-etapas.md)).
- O **logotipo aparece uma só vez** (cabeçalho); o da tela inicial foi retirado.
- Ao trocar de etapa, a página **volta ao topo com rolagem suave** (imediata com movimento reduzido) e o foco vai ao título da etapa.

### Planilha de coleta (ET13)

- A matriz de ensaios exportada (dois níveis, superfícies, DIC e DBC) traz **uma coluna vazia para cada resposta**, com a unidade no cabeçalho, e reexportar preserva os valores já digitados; a matriz do DBC ganhou `unit_id`.
- Importar o **mesmo arquivo** preenchido grava só as respostas nos ensaios correspondentes (por unidade experimental ou por níveis), com conferência: linhas sem ensaio, valores não numéricos, valores que serão substituídos. Planejamento, fatores e ordem dos ensaios não mudam; o estado anterior fica no histórico. [Guia](docs/guias/planilha-de-coleta.md), [DT-0022](docs/decisoes-tecnicas/dt-0022-planilha-de-coleta-e-correspondencia-de-ensaios.md).
- O importador de CSV passa a **ignorar as linhas `# chave: valor`** que o aplicativo grava nos CSV exportados.

## [0.2.0] — 2026-11-02

> **Versão web publicada em 2026-11-02** (https://vitormazziero.github.io/enzitag-optima/) e etiqueta `v0.2.0` criada. O **release do instalador foi publicado pelo usuário** e a **atualização a partir da 0.1.0 foi verificada** ([registro de publicação](docs/distribuicao/publicacao.md#publicação-dos-releases-e-atualização-2026-11-02)). Evidências em [validation/reports/v0.2.0](validation/reports/v0.2.0/README.md).

### Mudanças de ferramenta e desempenho

- **Node.js 22 → 26** (primeira tarefa da etapa, antes das funcionalidades; [DT-0015](docs/decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)).
- **Valor-p de Tukey mais rápido** (tabela de Chebyshev de `W(w; k)`, [DT-0019](docs/decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md)): 40 grupos × 30 repetições de ≈ 5,0 s para ≈ 61 ms e 100 grupos × 30 de ≈ 30 s para ≈ 126 ms, medidos com o código da 0.1 e o da 0.2 na mesma máquina ([limites operacionais](docs/arquitetura/limites-operacionais.md)).

### Métodos novos (todos validados contra referências independentes)

| Método | Referência independente |
|---|---|
| Games–Howell (ANOVA de Welch), Bonferroni, Holm | statsmodels, SciPy, scikit-posthocs |
| Dunnett exato (tamanhos desiguais) | integração dupla própria; `scipy.stats.dunnett` |
| Kruskal–Wallis com comparações de Dunn (empates, Bonferroni ou Holm) | SciPy, scikit-posthocs |
| ANOVA multifatorial com blocos (tipos I, II e III), médias marginais, comparações e contrastes | statsmodels |
| Delineamento em blocos completos casualizados (DBC), aleatorizado e reprodutível | PCG32 e Fisher–Yates em Python |
| Seleção e comparação de modelos de superfície (PRESS, `R²` predito, AICc, BIC, eliminação regressiva com hierarquia) | statsmodels |

### Aplicativo

- **Resultados em seções com barra lateral** (resumo, tabelas, efeitos, modelo, diagnósticos, figuras, otimização, confirmação) e **exportação por último**; a opção «mostrar todas as seções» preserva a página longa ([DT-0018](docs/decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md)).
- **Modelo: termos e comparação:** ligue e desligue termos, compare o modelo completo, o atual e o recomendado e siga a sequência de remoções sugerida (com avisos de falta de ajuste, poucos graus de liberdade e sobreajuste).
- **Comparação de tratamentos:** escolha do procedimento (Tukey, Games–Howell, Dunnett com controle, Bonferroni, Holm, Kruskal–Wallis/Dunn) ou **vários fatores** com bloco, tipo de soma de quadrados, médias marginais e contrastes.
- **Planejar:** além do DIC, o **DBC aleatorizado** (blocos e tratamentos nomeados, semente registrada, matriz em CSV/XLSX e análise já preparada com o bloco).
- **Figuras:** letras manuais (identificadas como manuais na legenda), anotações livres, cor, fundo transparente, fonte, grade, legenda e resolução do PNG, salvas no projeto ([DT-0020](docs/decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)).
- **PDF** de figuras (vetorial) e de relatórios (A4, mesmo conteúdo do relatório HTML), com fonte embutida, gerado localmente; verificado no navegador e no aplicativo Windows.
- **Seis temas:** Industrial, Organic e Clay (ET12) além de Soft Light, Modern Dark e Professional, com tokens de relevo e rebaixo, fontes IBM Plex Mono e Source Serif 4, contraste e axe verificados; o **logotipo do grupo** no cabeçalho, na tela inicial e como crédito nos relatórios HTML e PDF (desligável); o logo não é coberto pela licença MIT ([DT-0021](docs/decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)).
- **Um modelo por resposta** (gravado no projeto e usado pela otimização), **seção ativa lembrada** e resultados em seções também na comparação de um fator e nos planejamentos de dois níveis; exemplo sintético [06 — kLa](examples/06-kla-sintetico/README.md).
- **Plataforma Windows 10** (decisão do usuário, [§16](docs/produto/decisoes-aprovadas.md#16-escopo-e-plataforma-da-v02-2026-11-01)): aplicativo verificado no Windows 10 Pro 22H2 e em `windows-latest`.

### Compatibilidade

Projetos da 0.1 abrem sem migração (`schemaVersion` permanece 1; campos novos são opcionais). Uma versão anterior ignora os campos novos de um projeto da 0.2.

### Limitações conhecidas

- **Windows 11 não verificado.**
- O instalador **não tem assinatura de código** (o Windows pode avisar na primeira execução); a atualização ponta a ponta continua não verificada.
- Os dados reais do exemplo kLa não foram distribuídos (PD-16); o exemplo do repositório é sintético.
- PDF: a família de fonte da figura e o hachurado da extrapolação não são reproduzidos (usa Roboto normal; sombreado no lugar do hachurado).
- Operações novas (procedimentos adicionais, ANOVA multifatorial, DBC, seleção) **não foram medidas no limite**; o Dunnett exato pode ser lento com muitos tratamentos (não caracterizado).
- A otimização continua sendo uma busca local com vários inícios: **não prova ótimo global**.
- Sem DOCX nem Google Drive. Marcos M1–M3 não declarados.

## [0.1.0] — 2026-11-01 (release publicado em 2026-11-02 como pré-lançamento)

> A **versão web foi publicada em 2026-11-01** (https://vitormazziero.github.io/enzitag-optima/) e a etiqueta `v0.1.0` existe. O **release do instalador foi publicado pelo usuário em 2026-11-02** (como pré-lançamento) e a atualização para a 0.2.0 foi verificada; ver o [registro de publicação](docs/distribuicao/publicacao.md).

### Métodos e variantes disponíveis

| Método | Variantes | Validação numérica |
|---|---|---|
| Estatística descritiva | geral e por grupo | 9 conjuntos NIST StRD |
| Distribuições Normal, t, F, qui-quadrado e amplitude studentizada | cdf, cauda, quantis | 531 pontos mpmath; 432 pontos SciPy |
| Modelo linear | termos, interações, quadráticos, estimabilidade, predição, resíduos, alavancagem | 11 conjuntos NIST StRD; 6 casos NumPy/SciPy |
| ANOVA de um fator, Tukey/Tukey–Kramer, letras | variâncias iguais; diagnósticos (Brown–Forsythe, QQ) | 11 conjuntos NIST ANOVA; SciPy |
| Fatorial completo, fracionário (geradores, resolução) e Plackett–Burman (8–48 ensaios) | réplicas, pontos centrais, aleatorização com semente (PCG32) | enumeração independente; análise 5 casos |
| DIC aleatorizado (um fator categórico) | 2 a 100 níveis, unidades experimentais com identificador, ordem de execução reprodutível | PCG32/Fisher–Yates independente (6 casos) |
| Análise de efeitos, curvatura, Lenth, falta de ajuste e erro puro | desenhos saturados | NumPy/SciPy |
| Composto central (rotacional, face centrada, α informado, inscrito) e Box–Behnken (3–5 fatores) | matriz personalizada | enumeração independente; 6 casos de superfície |
| Superfície de resposta de 2ª ordem | equação codificada e em unidades reais, região experimental, malha e contornos | NumPy/SciPy |
| Otimização por desejabilidade | maximizar, minimizar, alvo, faixa; limites obrigatórios; pesos; vários candidatos; compromissos; ensaios de confirmação | busca exaustiva independente (6 casos) |

### Aplicativo

- Planejar experimento, analisar dados existentes e comparar tratamentos; digitação, colagem do Excel e importação CSV/XLSX com prévia.
- Projetos `.enzitag` com vários experimentos, revisões e recuperação automática; uso local, sem login.
- Português e inglês; temas Soft Light, Modern Dark e Professional; navegação por teclado; axe sem violações nos percursos testados.
- Exportação: figuras SVG/PNG, tabelas CSV (técnico e Excel PT) e XLSX, relatório HTML autocontido; metadados de proveniência; proteção contra fórmulas.
- Personalização por figura (título, rótulos dos eixos, exibição das letras e fonte), salva no projeto e válida na tela e nos arquivos exportados.
- Aplicativo Windows com verificação de atualizações assinadas (canal experimental).
- Navegador (WebAssembly) e Windows (Tauri) com o mesmo motor Rust.

### Limitações conhecidas

- **Windows 11 não verificado.** O aplicativo foi verificado no Windows 10 Pro 22H2 e em `windows-latest` (Windows Server 2025); o navegador, em Chromium, Firefox, Chrome e Edge estáveis (versões 156–157).
- O instalador **não tem assinatura de código**: na primeira execução o Windows pode mostrar “O Windows protegeu seu computador” (escolha *Mais informações* e *Executar assim mesmo* após conferir a soma SHA-256 do release). As atualizações são verificadas pela assinatura do próprio aplicativo; a atualização ponta a ponta ainda não foi verificada.
- Figuras: sem letras manuais, anotações livres, símbolos nem posição das letras.
- Comparação de tratamentos com 40 ou mais tratamentos pode levar vários segundos ([limites operacionais](docs/arquitetura/limites-operacionais.md)).
- A otimização é uma busca local com vários inícios: **não prova ótimo global** e pede confirmação com ensaios novos.
- Sem PDF, DOCX, Google Drive ou DBC.
- Marcos M1–M3 não declarados.
